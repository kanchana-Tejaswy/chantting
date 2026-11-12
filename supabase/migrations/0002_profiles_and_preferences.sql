-- Phase 1 Migration 0002: Profiles, Member Directory, and User Preferences
-- Conservative privacy defaults: personal chanting data stays private unless explicitly shared.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE CHECK (
    username IS NULL OR username ~ '^[a-z0-9][a-z0-9_-]{2,30}[a-z0-9]$'
  ),
  display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80),
  avatar_url TEXT CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 1024),
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 400),
  timezone TEXT NOT NULL DEFAULT 'UTC' CHECK (public.is_valid_timezone(timezone)),
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (char_length(preferred_language) BETWEEN 2 AND 16),
  is_deactivated BOOLEAN NOT NULL DEFAULT FALSE,
  deletion_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_round_target INTEGER NOT NULL DEFAULT 16 CHECK (daily_round_target BETWEEN 1 AND 192),
  carry_forward_policy public.carry_forward_policy NOT NULL DEFAULT 'automatic',
  custom_carry_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_counting_method public.chanting_method NOT NULL DEFAULT 'japa_mala',
  tactile_feedback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sound_feedback_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reduced_motion_preference BOOLEAN NOT NULL DEFAULT FALSE,
  -- Conservative privacy defaults (Module I)
  public_profile_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  default_room_share_mode public.room_share_mode NOT NULL DEFAULT 'completion_only',
  share_streak_in_rooms BOOLEAN NOT NULL DEFAULT FALSE,
  -- Notification settings
  daily_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  daily_reminder_time TIME,
  room_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  wisdom_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public-safe directory exposing ONLY minimal display attributes when permitted
-- Keeps timezone, bio, deletion flags, and preferences locked in private tables.
CREATE TABLE IF NOT EXISTS public.member_directory (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  public_profile_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_preferences_set_updated_at ON public.user_preferences;
CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Keep member_directory synchronized with profiles and user_preferences
CREATE OR REPLACE FUNCTION private.sync_member_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    v_user_id := NEW.id;
    INSERT INTO public.member_directory (user_id, username, display_name, avatar_url, updated_at)
    VALUES (NEW.id, NEW.username, NEW.display_name, NEW.avatar_url, now())
    ON CONFLICT (user_id) DO UPDATE
      SET username = EXCLUDED.username,
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = now();
  ELSIF TG_TABLE_NAME = 'user_preferences' THEN
    v_user_id := NEW.user_id;
    UPDATE public.member_directory
      SET public_profile_enabled = NEW.public_profile_enabled,
          updated_at = now()
      WHERE user_id = v_user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_member_directory() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_sync_directory ON public.profiles;
CREATE TRIGGER profiles_sync_directory
  AFTER INSERT OR UPDATE OF username, display_name, avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.sync_member_directory();

DROP TRIGGER IF EXISTS preferences_sync_directory ON public.user_preferences;
CREATE TRIGGER preferences_sync_directory
  AFTER INSERT OR UPDATE OF public_profile_enabled ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION private.sync_member_directory();

-- Automatically initialize profile and conservative preferences when a user signs up
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  v_display_name := NULLIF(
    btrim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')),
    ''
  );
  IF v_display_name IS NULL THEN
    v_display_name := COALESCE(NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''), 'Devotee');
  END IF;
  v_display_name := left(v_display_name, 80);

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_display_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

