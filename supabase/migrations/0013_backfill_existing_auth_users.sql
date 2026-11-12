-- Migration 0013: Idempotent Backfill for Auth Users Created Prior to Schema Deployment
-- Ensures users who signed up before migrations 0001-0012 were applied receive
-- their profile, member_directory entry (via trigger), and conservative user_preferences.

INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  left(
    COALESCE(
      NULLIF(
        btrim(COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')),
        ''
      ),
      NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
      'Devotee'
    ),
    80
  )
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_preferences (user_id)
SELECT u.id
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

