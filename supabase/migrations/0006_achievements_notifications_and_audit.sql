-- Phase 1 Migration 0006: Personal Consistency Achievements, Notifications, and Audit Trails

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_]{3,64}$'),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 100),
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 5 AND 400),
  category TEXT NOT NULL CHECK (category IN ('consistency', 'milestone', 'study', 'community')),
  threshold_value INTEGER NOT NULL CHECK (threshold_value >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT user_achievements_user_achievement_unique UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON public.user_achievements (user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS user_achievements_achievement_id_idx ON public.user_achievements (achievement_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, is_read, created_at DESC);

-- Immutable audit trail for administrative, governance, and privacy actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (char_length(btrim(action)) BETWEEN 2 AND 100),
  target_table TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_user_idx ON public.audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_room_id_idx ON public.audit_logs (room_id, created_at DESC) WHERE room_id IS NOT NULL;

