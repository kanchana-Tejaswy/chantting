-- Phase 1 Migration 0004: Chanting Rooms, Memberships, Invitations, Goals, Announcements, and Privacy-Safe Activity
-- Room admins can never read or alter another member's private chanting history.

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$'),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 600),
  visibility public.room_visibility NOT NULL DEFAULT 'private',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  default_daily_goal INTEGER CHECK (default_daily_goal IS NULL OR default_daily_goal BETWEEN 1 AND 192),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rooms_owner_id_idx ON public.rooms (owner_id);
CREATE INDEX IF NOT EXISTS rooms_public_active_idx ON public.rooms (visibility, created_at DESC) WHERE is_archived = FALSE;

CREATE TABLE IF NOT EXISTS public.room_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.room_member_role NOT NULL DEFAULT 'member',
  share_progress_mode public.room_share_mode NOT NULL DEFAULT 'completion_only',
  share_streak BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT room_memberships_room_user_unique UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_memberships_user_id_idx ON public.room_memberships (user_id);
CREATE INDEX IF NOT EXISTS room_memberships_room_role_idx ON public.room_memberships (room_id, role);

CREATE TABLE IF NOT EXISTS public.room_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 1),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT room_invitations_uses_within_max CHECK (max_uses IS NULL OR uses_count <= max_uses)
);

CREATE INDEX IF NOT EXISTS room_invitations_room_id_idx ON public.room_invitations (room_id);
CREATE INDEX IF NOT EXISTS room_invitations_created_by_idx ON public.room_invitations (created_by);

CREATE TABLE IF NOT EXISTS public.room_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 600),
  target_rounds INTEGER NOT NULL CHECK (target_rounds >= 1),
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'challenge')),
  start_date DATE NOT NULL,
  end_date DATE CHECK (end_date IS NULL OR end_date >= start_date),
  is_voluntary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_goals_room_id_idx ON public.room_goals (room_id, start_date DESC);
CREATE INDEX IF NOT EXISTS room_goals_created_by_idx ON public.room_goals (created_by);

CREATE TABLE IF NOT EXISTS public.room_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_announcements_room_id_idx ON public.room_announcements (room_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS room_announcements_author_id_idx ON public.room_announcements (author_id);

-- Consented room activity snapshots (never leaks raw private chanting records)
CREATE TABLE IF NOT EXISTS public.room_activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (
    activity_type IN ('joined_room', 'daily_target_met', 'rounds_shared', 'challenge_joined')
  ),
  shared_rounds_count INTEGER CHECK (shared_rounds_count IS NULL OR shared_rounds_count >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_activity_feed_room_date_idx ON public.room_activity_feed (room_id, activity_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS room_activity_feed_user_id_idx ON public.room_activity_feed (user_id);

-- Triggers
DROP TRIGGER IF EXISTS rooms_set_updated_at ON public.rooms;
CREATE TRIGGER rooms_set_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS room_memberships_set_updated_at ON public.room_memberships;
CREATE TRIGGER room_memberships_set_updated_at
  BEFORE UPDATE ON public.room_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS room_goals_set_updated_at ON public.room_goals;
CREATE TRIGGER room_goals_set_updated_at
  BEFORE UPDATE ON public.room_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS room_announcements_set_updated_at ON public.room_announcements;
CREATE TRIGGER room_announcements_set_updated_at
  BEFORE UPDATE ON public.room_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ensure every newly created room automatically enrolls its owner with default conservative privacy
CREATE OR REPLACE FUNCTION private.enroll_room_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_default_share public.room_share_mode;
BEGIN
  SELECT default_room_share_mode INTO v_default_share
  FROM public.user_preferences
  WHERE user_id = NEW.owner_id;

  INSERT INTO public.room_memberships (room_id, user_id, role, share_progress_mode)
  VALUES (NEW.id, NEW.owner_id, 'owner', COALESCE(v_default_share, 'completion_only'))
  ON CONFLICT (room_id, user_id) DO UPDATE SET role = 'owner';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enroll_room_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rooms_enroll_owner ON public.rooms;
CREATE TRIGGER rooms_enroll_owner
  AFTER INSERT ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION private.enroll_room_owner();

