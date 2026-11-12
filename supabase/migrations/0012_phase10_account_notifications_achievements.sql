-- Phase 10 Migration 0012: Notifications, Quiet Hours, Personal Milestones, Privacy Rights & Account Scrubbing

-- 1. Extend user_preferences with quiet hours and granular notification controls
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME NOT NULL DEFAULT '22:00:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME NOT NULL DEFAULT '05:00:00',
  ADD COLUMN IF NOT EXISTS room_goal_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS platform_updates_enabled BOOLEAN NOT NULL DEFAULT TRUE;

GRANT UPDATE (
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end,
  room_goal_notifications_enabled,
  platform_updates_enabled
) ON public.user_preferences TO authenticated;

-- 2. Allow owners to dismiss their own notifications and revoke their own shared room activity rows
GRANT DELETE ON public.notifications TO authenticated;
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT DELETE ON public.room_activity_feed TO authenticated;
CREATE POLICY room_activity_feed_delete_own ON public.room_activity_feed
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 3. Respectful, non-private in-app notifications for room announcements & voluntary goals
CREATE OR REPLACE FUNCTION private.notify_room_announcement_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_room RECORD;
BEGIN
  SELECT id, slug, name, is_archived INTO v_room
  FROM public.rooms
  WHERE id = NEW.room_id;

  IF NOT FOUND OR v_room.is_archived THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    action_url,
    metadata
  )
  SELECT
    rm.user_id,
    'room_announcement',
    left('Announcement in ' || v_room.name, 140),
    left(NEW.title, 280),
    '/rooms/' || v_room.slug,
    jsonb_build_object(
      'room_id', NEW.room_id,
      'announcement_id', NEW.id
    )
  FROM public.room_memberships rm
  JOIN public.user_preferences up ON up.user_id = rm.user_id
  JOIN public.profiles p ON p.id = rm.user_id
  WHERE rm.room_id = NEW.room_id
    AND rm.user_id <> NEW.author_id
    AND p.is_deactivated = FALSE
    AND up.room_notifications_enabled = TRUE;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_room_announcement_members() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS room_announcements_notify ON public.room_announcements;
CREATE TRIGGER room_announcements_notify
  AFTER INSERT ON public.room_announcements
  FOR EACH ROW EXECUTE FUNCTION private.notify_room_announcement_members();

CREATE OR REPLACE FUNCTION private.notify_room_goal_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_room RECORD;
BEGIN
  SELECT id, slug, name, is_archived INTO v_room
  FROM public.rooms
  WHERE id = NEW.room_id;

  IF NOT FOUND OR v_room.is_archived THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    action_url,
    metadata
  )
  SELECT
    rm.user_id,
    'room_milestone',
    left('Shared goal in ' || v_room.name, 140),
    left(NEW.title || ' — optional participation whenever you wish.', 280),
    '/rooms/' || v_room.slug,
    jsonb_build_object(
      'room_id', NEW.room_id,
      'goal_id', NEW.id
    )
  FROM public.room_memberships rm
  JOIN public.user_preferences up ON up.user_id = rm.user_id
  JOIN public.profiles p ON p.id = rm.user_id
  WHERE rm.room_id = NEW.room_id
    AND rm.user_id <> NEW.created_by
    AND p.is_deactivated = FALSE
    AND up.room_notifications_enabled = TRUE
    AND up.room_goal_notifications_enabled = TRUE;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_room_goal_members() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS room_goals_notify ON public.room_goals;
CREATE TRIGGER room_goals_notify
  AFTER INSERT ON public.room_goals
  FOR EACH ROW EXECUTE FUNCTION private.notify_room_goal_members();

-- 4. Timezone & Quiet-Hours-aware optional daily reminder generator (non-guilt, zero private round data)
CREATE OR REPLACE FUNCTION public.evaluate_my_daily_reminder()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_profile RECORD;
  v_prefs RECORD;
  v_local_now TIMESTAMP;
  v_local_date DATE;
  v_local_time TIME;
  v_in_quiet_hours BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT timezone, is_deactivated INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.is_deactivated THEN
    RETURN jsonb_build_object('created', FALSE, 'reason', 'inactive_profile');
  END IF;

  SELECT
    daily_reminder_enabled,
    daily_reminder_time,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  INTO v_prefs
  FROM public.user_preferences
  WHERE user_id = v_uid;

  IF NOT FOUND OR NOT COALESCE(v_prefs.daily_reminder_enabled, FALSE) THEN
    RETURN jsonb_build_object('created', FALSE, 'reason', 'disabled');
  END IF;

  v_local_now := now() AT TIME ZONE COALESCE(v_profile.timezone, 'UTC');
  v_local_date := v_local_now::date;
  v_local_time := v_local_now::time;

  IF COALESCE(v_prefs.quiet_hours_enabled, TRUE) THEN
    IF v_prefs.quiet_hours_start > v_prefs.quiet_hours_end THEN
      v_in_quiet_hours := (v_local_time >= v_prefs.quiet_hours_start OR v_local_time < v_prefs.quiet_hours_end);
    ELSIF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
      v_in_quiet_hours := (v_local_time >= v_prefs.quiet_hours_start AND v_local_time < v_prefs.quiet_hours_end);
    END IF;

    IF v_in_quiet_hours THEN
      RETURN jsonb_build_object('created', FALSE, 'reason', 'quiet_hours');
    END IF;
  END IF;

  IF v_prefs.daily_reminder_time IS NOT NULL AND v_local_time < v_prefs.daily_reminder_time THEN
    RETURN jsonb_build_object('created', FALSE, 'reason', 'before_reminder_time');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE user_id = v_uid
      AND type = 'sadhana_reminder'
      AND metadata ->> 'sadhana_date' = v_local_date::text
  ) THEN
    RETURN jsonb_build_object('created', FALSE, 'reason', 'already_sent_today');
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    action_url,
    metadata
  ) VALUES (
    v_uid,
    'sadhana_reminder',
    'Your Japa space is open',
    'Whenever your mind is steady today, take a quiet moment for your chanting practice.',
    '/sadhana/chant',
    jsonb_build_object('sadhana_date', v_local_date::text)
  );

  RETURN jsonb_build_object('created', TRUE, 'sadhana_date', v_local_date::text);
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_my_daily_reminder() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_my_daily_reminder() TO authenticated;

-- 5. Private Devotional Milestone Definitions & Verified Reconciliation RPC
INSERT INTO public.achievements (code, title, description, category, threshold_value, is_active)
VALUES
  ('first_round', 'First Completed Round', 'Completed your first verified chanting round in Krishna Sadhana.', 'milestone', 1, TRUE),
  ('first_108_mala', 'First 108-Bead Japa Mala', 'Completed all 108 beads of a digital Japa Mala round with steady attention.', 'milestone', 1, TRUE),
  ('rounds_16', 'Sixteen Steadfast Rounds', 'Completed 16 verified chanting rounds in personal practice.', 'milestone', 16, TRUE),
  ('rounds_108', 'One Hundred Eight Rounds', 'Completed 108 lifetime verified chanting rounds.', 'milestone', 108, TRUE),
  ('rounds_1008', 'Sacred Thousand-Eight Milestone', 'Completed 1,008 lifetime verified chanting rounds.', 'milestone', 1008, TRUE),
  ('consistent_days_7', 'Seven Active Days', 'Chanted on 7 separate calendar days at your own quiet pace.', 'consistency', 7, TRUE),
  ('consistent_days_30', 'Thirty Active Days', 'Chanted across 30 calm days of personal practice.', 'consistency', 30, TRUE),
  ('anniversary_30', 'First Month on the Path', 'Thirty calendar days since your first recorded Sadhana practice.', 'consistency', 30, TRUE),
  ('anniversary_365', 'Annual Sadhana Anniversary', 'One full year since your earliest recorded chanting practice.', 'consistency', 365, TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_my_achievements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_tz TEXT := 'UTC';
  v_today DATE;
  v_total_rounds INTEGER := 0;
  v_mala_rounds INTEGER := 0;
  v_active_days INTEGER := 0;
  v_first_date DATE;
  v_anniversary_days INTEGER := 0;
  v_newly_unlocked INTEGER := 0;
  v_ach RECORD;
  v_qualified BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('achievements:' || v_uid::text));

  SELECT COALESCE(timezone, 'UTC') INTO v_tz
  FROM public.profiles
  WHERE id = v_uid;

  v_today := (now() AT TIME ZONE COALESCE(v_tz, 'UTC'))::date;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE method = 'japa_mala')::integer,
    count(DISTINCT sadhana_date)::integer,
    min(sadhana_date)
  INTO v_total_rounds, v_mala_rounds, v_active_days, v_first_date
  FROM public.chanting_records
  WHERE user_id = v_uid
    AND is_reverted = FALSE;

  IF v_first_date IS NOT NULL THEN
    v_anniversary_days := GREATEST(v_today - v_first_date, 0);
  END IF;

  FOR v_ach IN
    SELECT id, code, threshold_value
    FROM public.achievements
    WHERE is_active = TRUE
  LOOP
    v_qualified := CASE v_ach.code
      WHEN 'first_round' THEN v_total_rounds >= 1
      WHEN 'first_108_mala' THEN v_mala_rounds >= 1
      WHEN 'rounds_16' THEN v_total_rounds >= v_ach.threshold_value
      WHEN 'rounds_108' THEN v_total_rounds >= v_ach.threshold_value
      WHEN 'rounds_1008' THEN v_total_rounds >= v_ach.threshold_value
      WHEN 'consistent_days_7' THEN v_active_days >= v_ach.threshold_value
      WHEN 'consistent_days_30' THEN v_active_days >= v_ach.threshold_value
      WHEN 'anniversary_30' THEN v_anniversary_days >= v_ach.threshold_value
      WHEN 'anniversary_365' THEN v_anniversary_days >= v_ach.threshold_value
      ELSE FALSE
    END;

    IF v_qualified THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (
        v_uid,
        v_ach.id,
        jsonb_build_object(
          'total_rounds_snapshot', v_total_rounds,
          'active_days_snapshot', v_active_days
        )
      )
      ON CONFLICT (user_id, achievement_id) DO NOTHING;

      IF FOUND THEN
        v_newly_unlocked := v_newly_unlocked + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_rounds', v_total_rounds,
    'mala_rounds', v_mala_rounds,
    'active_days', v_active_days,
    'anniversary_days', v_anniversary_days,
    'newly_unlocked', v_newly_unlocked
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_my_achievements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_my_achievements() TO authenticated;

-- 6. Secure Account Scrubbing & Deletion RPC (protects shared community records cleanly)
CREATE OR REPLACE FUNCTION public.deactivate_and_scrub_my_account(
  p_confirm_phrase TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_room RECORD;
  v_next_owner UUID;
  v_has_other_members BOOLEAN;
  v_can_hard_delete BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF btrim(COALESCE(p_confirm_phrase, '')) <> 'DELETE MY ACCOUNT' THEN
    RAISE EXCEPTION 'Confirmation phrase must match DELETE MY ACCOUNT';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('account:' || v_uid::text));

  -- Remove caller's shared room feed activity & non-owned memberships first
  DELETE FROM public.room_activity_feed WHERE user_id = v_uid;

  FOR v_room IN
    SELECT id FROM public.rooms WHERE owner_id = v_uid
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.room_memberships
      WHERE room_id = v_room.id AND user_id <> v_uid
    ) INTO v_has_other_members;

    IF NOT v_has_other_members THEN
      DELETE FROM public.rooms WHERE id = v_room.id;
    ELSE
      SELECT user_id INTO v_next_owner
      FROM public.room_memberships
      WHERE room_id = v_room.id
        AND user_id <> v_uid
        AND role = 'admin'
      ORDER BY joined_at ASC
      LIMIT 1;

      IF v_next_owner IS NOT NULL THEN
        UPDATE public.room_memberships SET role = 'owner' WHERE room_id = v_room.id AND user_id = v_next_owner;
        UPDATE public.rooms SET owner_id = v_next_owner WHERE id = v_room.id;
        DELETE FROM public.room_memberships WHERE room_id = v_room.id AND user_id = v_uid;
      ELSE
        UPDATE public.rooms SET is_archived = TRUE WHERE id = v_room.id;
      END IF;
    END IF;
  END LOOP;

  DELETE FROM public.room_memberships
  WHERE user_id = v_uid
    AND NOT EXISTS (
      SELECT 1 FROM public.rooms r WHERE r.id = room_memberships.room_id AND r.owner_id = v_uid
    );

  -- Delete personal private practice & study records
  DELETE FROM public.gita_bookmarks WHERE user_id = v_uid;
  DELETE FROM public.gita_notes WHERE user_id = v_uid;
  DELETE FROM public.gita_reading_history WHERE user_id = v_uid;
  DELETE FROM public.learning_collections WHERE user_id = v_uid;
  DELETE FROM public.library_bookmarks WHERE user_id = v_uid;
  DELETE FROM public.library_view_history WHERE user_id = v_uid;
  DELETE FROM public.user_achievements WHERE user_id = v_uid;
  DELETE FROM public.notifications WHERE user_id = v_uid;
  DELETE FROM public.chanting_records WHERE user_id = v_uid;
  DELETE FROM public.chanting_sessions WHERE user_id = v_uid;
  DELETE FROM public.carry_forward_ledger WHERE user_id = v_uid;
  DELETE FROM public.daily_sadhana WHERE user_id = v_uid;
  DELETE FROM public.platform_admins WHERE user_id = v_uid;

  -- Scrub profile PII & disable public visibility (syncs member_directory automatically)
  UPDATE public.user_preferences
  SET
    public_profile_enabled = FALSE,
    default_room_share_mode = 'private',
    share_streak_in_rooms = FALSE,
    daily_reminder_enabled = FALSE,
    room_notifications_enabled = FALSE,
    wisdom_notifications_enabled = FALSE,
    room_goal_notifications_enabled = FALSE,
    platform_updates_enabled = FALSE
  WHERE user_id = v_uid;

  UPDATE public.profiles
  SET
    username = NULL,
    display_name = 'Former Devotee',
    avatar_url = NULL,
    bio = NULL,
    timezone = 'UTC',
    is_deactivated = TRUE,
    deletion_requested_at = now()
  WHERE id = v_uid;

  INSERT INTO public.audit_logs (
    actor_user_id,
    room_id,
    action,
    target_table,
    target_id,
    metadata
  ) VALUES (
    v_uid,
    NULL,
    'account_deletion_scrubbed',
    'profiles',
    v_uid::text,
    jsonb_build_object('scrubbed_at', now())
  );

  v_can_hard_delete :=
    NOT EXISTS (SELECT 1 FROM public.rooms WHERE owner_id = v_uid)
    AND NOT EXISTS (SELECT 1 FROM public.room_goals WHERE created_by = v_uid)
    AND NOT EXISTS (SELECT 1 FROM public.room_announcements WHERE author_id = v_uid);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'deactivated', TRUE,
    'can_hard_delete_auth', v_can_hard_delete
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_and_scrub_my_account(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_and_scrub_my_account(TEXT) TO authenticated;
