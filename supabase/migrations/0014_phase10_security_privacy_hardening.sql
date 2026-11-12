-- Phase 10 Migration 0014: Security, Privacy Revocation, URL Safety & RLS Hardening

-- 1. Automatic cleanup when a member revokes or downgrades room sharing consent (or leaves a room)
CREATE OR REPLACE FUNCTION private.cleanup_revoked_room_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.room_activity_feed
    WHERE room_id = OLD.room_id
      AND user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  IF NEW.share_progress_mode IS DISTINCT FROM OLD.share_progress_mode THEN
    IF NEW.share_progress_mode = 'private' THEN
      DELETE FROM public.room_activity_feed
      WHERE room_id = NEW.room_id
        AND user_id = NEW.user_id
        AND activity_type <> 'joined_room';
    ELSIF NEW.share_progress_mode = 'completion_only' THEN
      DELETE FROM public.room_activity_feed
      WHERE room_id = NEW.room_id
        AND user_id = NEW.user_id
        AND activity_type = 'rounds_shared';

      UPDATE public.room_activity_feed
      SET shared_rounds_count = NULL
      WHERE room_id = NEW.room_id
        AND user_id = NEW.user_id
        AND activity_type IN ('daily_target_met', 'streak_milestone', 'challenge_joined')
        AND shared_rounds_count IS NOT NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.cleanup_revoked_room_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS room_memberships_cleanup_revoked_activity ON public.room_memberships;
CREATE TRIGGER room_memberships_cleanup_revoked_activity
  AFTER UPDATE OF share_progress_mode OR DELETE ON public.room_memberships
  FOR EACH ROW EXECUTE FUNCTION private.cleanup_revoked_room_activity();

-- 2. Defense-in-depth RLS on room_activity_feed: never expose revoked progress to other room members
DROP POLICY IF EXISTS room_activity_feed_select_member ON public.room_activity_feed;
CREATE POLICY room_activity_feed_select_member ON public.room_activity_feed
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_room_member(room_id))
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.room_memberships rm
        WHERE rm.room_id = room_activity_feed.room_id
          AND rm.user_id = room_activity_feed.user_id
          AND (
            rm.share_progress_mode <> 'private'
            OR room_activity_feed.activity_type = 'joined_room'
          )
          AND (
            rm.share_progress_mode = 'full'
            OR room_activity_feed.shared_rounds_count IS NULL
          )
      )
    )
  );

-- 3. Prevent authenticated clients from directly altering deactivation / deletion flags
REVOKE UPDATE (is_deactivated, deletion_requested_at) ON public.profiles FROM authenticated;

-- 4. Enforce safe URL/path schemes on profiles.avatar_url and notifications.action_url
UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND avatar_url !~ '^https?://';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_url_safe,
  ADD CONSTRAINT profiles_avatar_url_safe
    CHECK (avatar_url IS NULL OR (avatar_url ~ '^https?://' AND char_length(avatar_url) <= 1024));

UPDATE public.notifications
SET action_url = NULL
WHERE action_url IS NOT NULL
  AND NOT (
    action_url ~ '^https?://'
    OR (action_url ~ '^/' AND action_url !~ '^//')
  );

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_action_url_safe,
  ADD CONSTRAINT notifications_action_url_safe
    CHECK (
      action_url IS NULL
      OR (
        (action_url ~ '^https?://' OR (action_url ~ '^/' AND action_url !~ '^//'))
        AND char_length(action_url) <= 512
      )
    );

-- 5. Hide deactivated accounts from member_directory visibility
DROP POLICY IF EXISTS member_directory_select_permitted ON public.member_directory;
CREATE POLICY member_directory_select_permitted ON public.member_directory
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      (
        public_profile_enabled = TRUE
        OR (SELECT private.shares_room_with(user_id))
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = member_directory.user_id
          AND p.is_deactivated = TRUE
      )
    )
  );

DROP POLICY IF EXISTS member_directory_select_public_anon ON public.member_directory;
CREATE POLICY member_directory_select_public_anon ON public.member_directory
  FOR SELECT TO anon
  USING (
    public_profile_enabled = TRUE
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = member_directory.user_id
        AND p.is_deactivated = TRUE
    )
  );

