-- Phase 1 Migration 0007: Row Level Security (RLS), Private Helpers, and Access Hardening
-- Follows Supabase best practices:
-- 1. Wrap auth.uid() in (SELECT auth.uid())
-- 2. Explicit TO authenticated / TO anon role clauses
-- 3. Both USING and WITH CHECK on UPDATE policies
-- 4. Private non-exposed helper functions with no arbitrary p_user_id BOLA parameters
-- 5. Strict isolation of personal chanting history from room owners/admins

-- Private RLS helpers (checked strictly against calling auth.uid())
CREATE OR REPLACE FUNCTION private.is_room_member(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_memberships
    WHERE room_id = p_room_id
      AND user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.is_room_admin(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_memberships
    WHERE room_id = p_room_id
      AND user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION private.shares_room_with(p_other_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_memberships rm_self
    JOIN public.room_memberships rm_other
      ON rm_other.room_id = rm_self.room_id
    WHERE rm_self.user_id = (SELECT auth.uid())
      AND rm_other.user_id = p_other_user_id
  );
$$;

-- RLS policies run as the invoking role, so authenticated needs USAGE on private and EXECUTE on these 3 boolean checks.
-- Private schema is NOT exposed via Supabase Data API.
GRANT USAGE ON SCHEMA private TO authenticated, anon;
REVOKE ALL ON FUNCTION private.is_room_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_room_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.shares_room_with(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_room_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_room_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.shares_room_with(UUID) TO authenticated;

-- Prevent self-privilege escalation or owner demotion on room_memberships
CREATE OR REPLACE FUNCTION private.guard_room_membership_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := (SELECT auth.uid());
  v_room_owner UUID;
BEGIN
  -- Trusted backend/superuser/RPC calls without user JWT pass through when v_caller IS NULL
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT owner_id INTO v_room_owner
  FROM public.rooms
  WHERE id = OLD.room_id;

  IF NEW.room_id IS DISTINCT FROM OLD.room_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot reassign room_id or user_id on membership';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.user_id = v_room_owner THEN
      RAISE EXCEPTION 'Room owner role cannot be demoted directly';
    END IF;
    IF NOT private.is_room_admin(OLD.room_id) THEN
      RAISE EXCEPTION 'Only room owners or admins can change member roles';
    END IF;
    IF NEW.role = 'owner' AND v_caller <> v_room_owner THEN
      RAISE EXCEPTION 'Only the current room owner can transfer ownership';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_room_membership_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS room_memberships_guard_changes ON public.room_memberships;
CREATE TRIGGER room_memberships_guard_changes
  BEFORE UPDATE ON public.room_memberships
  FOR EACH ROW EXECUTE FUNCTION private.guard_room_membership_changes();

-- Enable RLS on ALL tables in public schema
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sadhana ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carry_forward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chanting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chanting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gita_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gita_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gita_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gita_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gita_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gita_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gita_reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles & Preferences (strictly owner-only)
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY user_preferences_select_own ON public.user_preferences
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_preferences_update_own ON public.user_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Minimal member_directory visibility (never leaks timezone/bio/private data)
CREATE POLICY member_directory_select_permitted ON public.member_directory
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public_profile_enabled = TRUE
    OR (SELECT private.shares_room_with(user_id))
  );

CREATE POLICY member_directory_select_public_anon ON public.member_directory
  FOR SELECT TO anon
  USING (public_profile_enabled = TRUE);

-- 2. Personal Sadhana & Chanting Records (strict owner-only; immutable via direct client writes)
-- daily_sadhana, carry_forward_ledger, and chanting_records are SELECT-only for clients;
-- mutations occur strictly inside locked transactional RPCs.
CREATE POLICY daily_sadhana_select_own ON public.daily_sadhana
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY carry_forward_ledger_select_own ON public.carry_forward_ledger
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY chanting_records_select_own ON public.chanting_records
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- chanting_sessions allows owner to create/recover/pause/update bead state (0..107)
CREATE POLICY chanting_sessions_select_own ON public.chanting_sessions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY chanting_sessions_insert_own ON public.chanting_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND rounds_completed = 0);

CREATE POLICY chanting_sessions_update_own ON public.chanting_sessions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 3. Chanting Rooms & Community
CREATE POLICY rooms_select_visible ON public.rooms
  FOR SELECT TO authenticated
  USING (
    (visibility = 'public' AND is_archived = FALSE)
    OR owner_id = (SELECT auth.uid())
    OR (SELECT private.is_room_member(id))
  );

CREATE POLICY rooms_select_public_anon ON public.rooms
  FOR SELECT TO anon
  USING (visibility = 'public' AND is_archived = FALSE);

CREATE POLICY rooms_insert_owner ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY rooms_update_admin ON public.rooms
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_room_admin(id)))
  WITH CHECK ((SELECT private.is_room_admin(id)));

CREATE POLICY rooms_delete_owner ON public.rooms
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- Room Memberships
CREATE POLICY room_memberships_select_room_members ON public.room_memberships
  FOR SELECT TO authenticated
  USING ((SELECT private.is_room_member(room_id)));

-- Users can self-join ONLY public non-archived rooms as 'member'
-- Private room joins MUST go through redeem_room_invitation() RPC
CREATE POLICY room_memberships_insert_public_self ON public.room_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND role = 'member'
    AND EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.visibility = 'public' AND r.is_archived = FALSE
    )
  );

CREATE POLICY room_memberships_update_own_privacy ON public.room_memberships
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY room_memberships_delete_self_or_admin ON public.room_memberships
  FOR DELETE TO authenticated
  USING (
    (
      room_memberships.user_id = (SELECT auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM public.rooms r
        WHERE r.id = room_memberships.room_id AND r.owner_id = room_memberships.user_id
      )
    )
    OR (
      (SELECT private.is_room_admin(room_memberships.room_id))
      AND NOT EXISTS (
        SELECT 1 FROM public.rooms r
        WHERE r.id = room_memberships.room_id AND r.owner_id = room_memberships.user_id
      )
    )
  );

-- Room Invitations (admin-only visibility & creation; redemption via RPC)
CREATE POLICY room_invitations_select_admin ON public.room_invitations
  FOR SELECT TO authenticated
  USING ((SELECT private.is_room_admin(room_id)));

CREATE POLICY room_invitations_insert_admin ON public.room_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (SELECT private.is_room_admin(room_id))
  );

CREATE POLICY room_invitations_update_admin ON public.room_invitations
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_room_admin(room_id)))
  WITH CHECK ((SELECT private.is_room_admin(room_id)));

-- Room Goals
CREATE POLICY room_goals_select_member ON public.room_goals
  FOR SELECT TO authenticated
  USING ((SELECT private.is_room_member(room_id)));

CREATE POLICY room_goals_insert_admin ON public.room_goals
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (SELECT private.is_room_admin(room_id))
  );

CREATE POLICY room_goals_update_admin ON public.room_goals
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_room_admin(room_id)))
  WITH CHECK ((SELECT private.is_room_admin(room_id)));

CREATE POLICY room_goals_delete_admin ON public.room_goals
  FOR DELETE TO authenticated
  USING ((SELECT private.is_room_admin(room_id)));

-- Room Announcements
CREATE POLICY room_announcements_select_member ON public.room_announcements
  FOR SELECT TO authenticated
  USING ((SELECT private.is_room_member(room_id)));

CREATE POLICY room_announcements_insert_admin ON public.room_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (SELECT private.is_room_admin(room_id))
  );

CREATE POLICY room_announcements_update_admin ON public.room_announcements
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_room_admin(room_id)))
  WITH CHECK ((SELECT private.is_room_admin(room_id)));

CREATE POLICY room_announcements_delete_admin ON public.room_announcements
  FOR DELETE TO authenticated
  USING ((SELECT private.is_room_admin(room_id)));

-- Room Activity Feed (respects user's per-room privacy choice)
CREATE POLICY room_activity_feed_select_member ON public.room_activity_feed
  FOR SELECT TO authenticated
  USING ((SELECT private.is_room_member(room_id)));

CREATE POLICY room_activity_feed_insert_self ON public.room_activity_feed
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.room_memberships rm
      WHERE rm.room_id = room_activity_feed.room_id
        AND rm.user_id = (SELECT auth.uid())
        AND (
          rm.share_progress_mode <> 'private'
          OR activity_type = 'joined_room'
        )
        AND (
          rm.share_progress_mode = 'full'
          OR shared_rounds_count IS NULL
        )
    )
  );

-- 4. Bhagavad Gita & Spiritual Library (approved public read; owner-only personal study)
CREATE POLICY content_sources_select_approved ON public.content_sources
  FOR SELECT TO anon, authenticated
  USING (review_status = 'approved');

CREATE POLICY gita_chapters_select_all ON public.gita_chapters
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY gita_verses_select_approved ON public.gita_verses
  FOR SELECT TO anon, authenticated
  USING (review_status = 'approved');

CREATE POLICY gita_translations_select_approved ON public.gita_translations
  FOR SELECT TO anon, authenticated
  USING (review_status = 'approved');

CREATE POLICY gita_explanations_select_approved ON public.gita_explanations
  FOR SELECT TO anon, authenticated
  USING (review_status = 'approved');

CREATE POLICY library_resources_select_approved ON public.library_resources
  FOR SELECT TO anon, authenticated
  USING (review_status = 'approved');

CREATE POLICY gita_bookmarks_all_own ON public.gita_bookmarks
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY gita_notes_all_own ON public.gita_notes
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY gita_reading_history_select_own ON public.gita_reading_history
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY gita_reading_history_insert_own ON public.gita_reading_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY learning_collections_all_own ON public.learning_collections
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY learning_collection_items_all_own ON public.learning_collection_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_collections lc
      WHERE lc.id = collection_id AND lc.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_collections lc
      WHERE lc.id = collection_id AND lc.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY content_feedback_select_own ON public.content_feedback
  FOR SELECT TO authenticated
  USING (submitted_by = (SELECT auth.uid()));

CREATE POLICY content_feedback_insert_own ON public.content_feedback
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = (SELECT auth.uid()));

-- 5. Achievements, Notifications, Audit Logs
CREATE POLICY achievements_select_active ON public.achievements
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY user_achievements_select_own ON public.user_achievements
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY audit_logs_select_actor_or_room_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    actor_user_id = (SELECT auth.uid())
    OR (room_id IS NOT NULL AND (SELECT private.is_room_admin(room_id)))
  );

-- Explicit least-privilege table grants
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT SELECT ON public.gita_chapters, public.gita_verses, public.gita_translations,
  public.gita_explanations, public.content_sources, public.library_resources,
  public.achievements, public.rooms, public.member_directory TO anon;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT UPDATE (username, display_name, avatar_url, bio, timezone, preferred_language, is_deactivated, deletion_requested_at)
  ON public.profiles TO authenticated;
GRANT UPDATE (
  daily_round_target, carry_forward_policy, custom_carry_rule, default_counting_method,
  tactile_feedback_enabled, sound_feedback_enabled, reduced_motion_preference,
  public_profile_enabled, default_room_share_mode, share_streak_in_rooms,
  daily_reminder_enabled, daily_reminder_time, room_notifications_enabled, wisdom_notifications_enabled
) ON public.user_preferences TO authenticated;
GRANT UPDATE (is_read, read_at) ON public.notifications TO authenticated;
GRANT INSERT, UPDATE (status, current_bead_count, paused_at, ended_at, last_activity_at)
  ON public.chanting_sessions TO authenticated;
GRANT INSERT, UPDATE (share_progress_mode, share_streak) ON public.room_memberships TO authenticated;
GRANT DELETE ON public.room_memberships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rooms,
  public.room_goals, public.room_announcements,
  public.gita_bookmarks, public.gita_notes,
  public.learning_collections, public.learning_collection_items TO authenticated;
GRANT INSERT, UPDATE ON public.room_invitations TO authenticated;
GRANT INSERT ON public.room_activity_feed, public.gita_reading_history, public.content_feedback TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable Supabase Realtime for room collaboration tables if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_activity_feed;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_announcements;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_goals;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
