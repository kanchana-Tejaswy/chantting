-- Phase 1 Migration 0008: Transaction-Safe Chanting, Carry-Forward Engine, and Room Invitation RPCs
-- Serializes per-user updates with pg_advisory_xact_lock and prevents duplicate submissions.

-- Internal locked daily Sadhana initializer (never directly exposed to clients)
CREATE OR REPLACE FUNCTION private.ensure_daily_sadhana_for_user(
  p_user_id UUID,
  p_target_date DATE DEFAULT NULL
)
RETURNS public.daily_sadhana
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_tz TEXT;
  v_target_date DATE;
  v_original_target INTEGER;
  v_policy public.carry_forward_policy;
  v_custom_rule JSONB;
  v_existing public.daily_sadhana;
  v_prior public.daily_sadhana;
  v_pending INTEGER := 0;
  v_effective INTEGER;
  v_cap INTEGER;
BEGIN
  -- Serialize all Sadhana mutations for this user inside this transaction
  PERFORM pg_advisory_xact_lock(hashtext('daily_sadhana'), hashtext(p_user_id::text));

  SELECT timezone INTO v_tz
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  v_target_date := COALESCE(p_target_date, (now() AT TIME ZONE v_tz)::date);

  SELECT * INTO v_existing
  FROM public.daily_sadhana
  WHERE user_id = p_user_id AND sadhana_date = v_target_date;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT daily_round_target, carry_forward_policy, custom_carry_rule
  INTO v_original_target, v_policy, v_custom_rule
  FROM public.user_preferences
  WHERE user_id = p_user_id;

  v_original_target := COALESCE(v_original_target, 16);
  v_policy := COALESCE(v_policy, 'automatic');
  v_custom_rule := COALESCE(v_custom_rule, '{}'::jsonb);

  -- Look up most recent prior recorded day (never silently erase unfinished rounds)
  SELECT * INTO v_prior
  FROM public.daily_sadhana
  WHERE user_id = p_user_id AND sadhana_date < v_target_date
  ORDER BY sadhana_date DESC
  LIMIT 1;

  IF FOUND AND v_prior.remaining_balance > 0 THEN
    IF v_policy = 'automatic' THEN
      v_pending := v_prior.remaining_balance;
    ELSIF v_policy = 'fresh_daily' THEN
      v_pending := 0;
    ELSIF v_policy = 'optional' THEN
      -- Pending remains offered until user explicitly confirms via resolve_optional_carry_forward
      v_pending := 0;
    ELSIF v_policy = 'custom' THEN
      IF (v_custom_rule ? 'max_carry_cap') AND (v_custom_rule ->> 'max_carry_cap') ~ '^[0-9]+$' THEN
        v_cap := (v_custom_rule ->> 'max_carry_cap')::integer;
        v_pending := LEAST(v_prior.remaining_balance, GREATEST(v_cap, 0));
      ELSE
        v_pending := v_prior.remaining_balance;
      END IF;
    END IF;
  END IF;

  v_effective := v_original_target + v_pending;

  INSERT INTO public.daily_sadhana (
    user_id,
    sadhana_date,
    timezone_snapshot,
    original_daily_target,
    previous_pending_balance,
    effective_daily_target,
    completed_rounds,
    remaining_balance,
    extra_rounds,
    policy_applied,
    carry_forward_accepted,
    day_status,
    has_activity
  ) VALUES (
    p_user_id,
    v_target_date,
    v_tz,
    v_original_target,
    v_pending,
    v_effective,
    0,
    v_effective,
    0,
    v_policy,
    CASE WHEN v_policy = 'optional' THEN NULL ELSE TRUE END,
    CASE WHEN v_pending > 0 THEN 'carried_forward'::public.day_sadhana_status ELSE 'scheduled'::public.day_sadhana_status END,
    FALSE
  )
  RETURNING * INTO v_existing;

  IF v_prior.id IS NOT NULL THEN
    INSERT INTO public.carry_forward_ledger (
      user_id,
      from_date,
      to_date,
      policy_applied,
      source_remaining_balance,
      carried_amount,
      notes
    ) VALUES (
      p_user_id,
      v_prior.sadhana_date,
      v_target_date,
      v_policy,
      v_prior.remaining_balance,
      v_pending,
      CASE
        WHEN v_policy = 'optional' AND v_prior.remaining_balance > 0 THEN 'Awaiting optional confirmation'
        ELSE NULL
      END
    )
    ON CONFLICT (user_id, from_date, to_date) DO NOTHING;
  END IF;

  RETURN v_existing;
END;
$$;

-- Internal forward recalculation when an earlier day is modified (e.g., undo or retroactive offline sync)
CREATE OR REPLACE FUNCTION private.recompute_sadhana_forward(
  p_user_id UUID,
  p_from_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_row public.daily_sadhana;
  v_prev_remaining INTEGER := 0;
  v_prev_date DATE;
  v_completed INTEGER;
  v_carried INTEGER;
  v_effective INTEGER;
  v_remaining INTEGER;
  v_extra INTEGER;
  v_status public.day_sadhana_status;
  v_has_prev BOOLEAN := FALSE;
  v_custom_rule JSONB;
  v_cap INTEGER;
BEGIN
  -- Must be called while holding user's daily_sadhana advisory lock
  SELECT custom_carry_rule INTO v_custom_rule
  FROM public.user_preferences
  WHERE user_id = p_user_id;

  v_custom_rule := COALESCE(v_custom_rule, '{}'::jsonb);

  SELECT sadhana_date, remaining_balance INTO v_prev_date, v_prev_remaining
  FROM public.daily_sadhana
  WHERE user_id = p_user_id AND sadhana_date < p_from_date
  ORDER BY sadhana_date DESC
  LIMIT 1;

  v_has_prev := FOUND;
  v_prev_remaining := COALESCE(v_prev_remaining, 0);

  FOR v_row IN
    SELECT *
    FROM public.daily_sadhana
    WHERE user_id = p_user_id AND sadhana_date >= p_from_date
    ORDER BY sadhana_date ASC
    FOR UPDATE
  LOOP
    SELECT count(*)::integer INTO v_completed
    FROM public.chanting_records
    WHERE user_id = p_user_id
      AND sadhana_date = v_row.sadhana_date
      AND is_reverted = FALSE;

    IF NOT v_has_prev THEN
      v_carried := 0;
    ELSIF v_row.policy_applied = 'automatic' THEN
      v_carried := v_prev_remaining;
    ELSIF v_row.policy_applied = 'optional' AND COALESCE(v_row.carry_forward_accepted, FALSE) = TRUE THEN
      v_carried := v_prev_remaining;
    ELSIF v_row.policy_applied = 'custom' THEN
      IF (v_custom_rule ? 'max_carry_cap') AND (v_custom_rule ->> 'max_carry_cap') ~ '^[0-9]+$' THEN
        v_cap := (v_custom_rule ->> 'max_carry_cap')::integer;
        v_carried := LEAST(v_prev_remaining, GREATEST(v_cap, 0));
      ELSE
        v_carried := v_prev_remaining;
      END IF;
    ELSE
      v_carried := 0;
    END IF;

    v_effective := v_row.original_daily_target + v_carried;
    v_remaining := GREATEST(v_effective - v_completed, 0);
    v_extra := GREATEST(v_completed - v_effective, 0);

    IF v_completed >= v_effective THEN
      v_status := 'target_met';
    ELSIF v_completed > 0 THEN
      v_status := 'in_progress';
    ELSIF v_carried > 0 THEN
      v_status := 'carried_forward';
    ELSE
      v_status := 'scheduled';
    END IF;

    UPDATE public.daily_sadhana
    SET previous_pending_balance = v_carried,
        effective_daily_target = v_effective,
        completed_rounds = v_completed,
        remaining_balance = v_remaining,
        extra_rounds = v_extra,
        day_status = v_status,
        has_activity = (v_completed > 0),
        computed_at = now()
    WHERE id = v_row.id;

    IF v_has_prev THEN
      UPDATE public.carry_forward_ledger
      SET source_remaining_balance = v_prev_remaining,
          carried_amount = v_carried
      WHERE user_id = p_user_id
        AND from_date = v_prev_date
        AND to_date = v_row.sadhana_date;
    END IF;

    v_prev_date := v_row.sadhana_date;
    v_prev_remaining := v_remaining;
    v_has_prev := TRUE;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.ensure_daily_sadhana_for_user(UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.recompute_sadhana_forward(UUID, DATE) FROM PUBLIC, anon, authenticated;

-- Public authenticated RPC: ensure caller's daily Sadhana row exists
CREATE OR REPLACE FUNCTION public.ensure_my_daily_sadhana(
  p_target_date DATE DEFAULT NULL
)
RETURNS public.daily_sadhana
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN private.ensure_daily_sadhana_for_user(v_user_id, p_target_date);
END;
$$;

-- Public authenticated RPC: atomically record one completed chanting round (idempotent + concurrency-safe)
CREATE OR REPLACE FUNCTION public.record_chanting_round(
  p_method public.chanting_method,
  p_idempotency_key TEXT,
  p_session_id UUID DEFAULT NULL,
  p_client_recorded_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_tz TEXT;
  v_effective_ts TIMESTAMPTZ;
  v_sadhana_date DATE;
  v_existing_record public.chanting_records;
  v_new_record public.chanting_records;
  v_daily public.daily_sadhana;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_idempotency_key IS NULL OR char_length(btrim(p_idempotency_key)) < 8 THEN
    RAISE EXCEPTION 'Valid idempotency_key (min 8 chars) is required';
  END IF;

  -- Serialize all operations for this user
  PERFORM pg_advisory_xact_lock(hashtext('daily_sadhana'), hashtext(v_user_id::text));

  -- Check idempotency first
  SELECT * INTO v_existing_record
  FROM public.chanting_records
  WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT * INTO v_daily
    FROM public.daily_sadhana
    WHERE user_id = v_user_id AND sadhana_date = v_existing_record.sadhana_date;

    RETURN jsonb_build_object(
      'duplicate', TRUE,
      'record', to_jsonb(v_existing_record),
      'daily_sadhana', to_jsonb(v_daily)
    );
  END IF;

  SELECT timezone INTO v_tz
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Clamp client timestamp so users cannot record far-future timestamps, while permitting recent offline sync
  IF p_client_recorded_at IS NOT NULL THEN
    IF p_client_recorded_at > now() + interval '5 minutes' THEN
      RAISE EXCEPTION 'client_recorded_at cannot be in the future';
    END IF;
    IF p_client_recorded_at < now() - interval '30 days' THEN
      RAISE EXCEPTION 'client_recorded_at cannot be older than 30 days';
    END IF;
    v_effective_ts := LEAST(p_client_recorded_at, now());
  ELSE
    v_effective_ts := now();
  END IF;

  v_sadhana_date := (v_effective_ts AT TIME ZONE v_tz)::date;

  -- Validate optional session ownership
  IF p_session_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.chanting_sessions
      WHERE id = p_session_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Chanting session not found for current user';
    END IF;
  END IF;

  PERFORM private.ensure_daily_sadhana_for_user(v_user_id, v_sadhana_date);

  INSERT INTO public.chanting_records (
    user_id,
    session_id,
    sadhana_date,
    method,
    round_delta,
    idempotency_key,
    recorded_at,
    client_recorded_at,
    timezone_snapshot
  ) VALUES (
    v_user_id,
    p_session_id,
    v_sadhana_date,
    p_method,
    1,
    p_idempotency_key,
    now(),
    p_client_recorded_at,
    v_tz
  )
  RETURNING * INTO v_new_record;

  IF p_session_id IS NOT NULL THEN
    UPDATE public.chanting_sessions
    SET rounds_completed = rounds_completed + 1,
        current_bead_count = CASE WHEN method = 'japa_mala' THEN 0 ELSE current_bead_count END,
        last_activity_at = now()
    WHERE id = p_session_id AND user_id = v_user_id;
  END IF;

  -- Recompute from v_sadhana_date forward (handles both today and retroactive offline sync)
  PERFORM private.recompute_sadhana_forward(v_user_id, v_sadhana_date);

  SELECT * INTO v_daily
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = v_sadhana_date;

  RETURN jsonb_build_object(
    'duplicate', FALSE,
    'record', to_jsonb(v_new_record),
    'daily_sadhana', to_jsonb(v_daily)
  );
END;
$$;

-- Public authenticated RPC: undo a completed chanting round with full carry-forward consistency
CREATE OR REPLACE FUNCTION public.undo_chanting_round(
  p_record_id UUID,
  p_reason TEXT DEFAULT 'user_undo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_record public.chanting_records;
  v_daily public.daily_sadhana;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('daily_sadhana'), hashtext(v_user_id::text));

  SELECT * INTO v_record
  FROM public.chanting_records
  WHERE id = p_record_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chanting record not found';
  END IF;

  IF v_record.is_reverted THEN
    SELECT * INTO v_daily
    FROM public.daily_sadhana
    WHERE user_id = v_user_id AND sadhana_date = v_record.sadhana_date;

    RETURN jsonb_build_object(
      'already_reverted', TRUE,
      'record', to_jsonb(v_record),
      'daily_sadhana', to_jsonb(v_daily)
    );
  END IF;

  UPDATE public.chanting_records
  SET is_reverted = TRUE,
      reverted_at = now(),
      revert_reason = left(COALESCE(NULLIF(btrim(p_reason), ''), 'user_undo'), 200)
  WHERE id = v_record.id
  RETURNING * INTO v_record;

  IF v_record.session_id IS NOT NULL THEN
    UPDATE public.chanting_sessions
    SET rounds_completed = GREATEST(rounds_completed - 1, 0),
        last_activity_at = now()
    WHERE id = v_record.session_id AND user_id = v_user_id;
  END IF;

  PERFORM private.recompute_sadhana_forward(v_user_id, v_record.sadhana_date);

  SELECT * INTO v_daily
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = v_record.sadhana_date;

  RETURN jsonb_build_object(
    'already_reverted', FALSE,
    'record', to_jsonb(v_record),
    'daily_sadhana', to_jsonb(v_daily)
  );
END;
$$;

-- Public authenticated RPC: resolve optional carry-forward choice
CREATE OR REPLACE FUNCTION public.resolve_optional_carry_forward(
  p_sadhana_date DATE,
  p_accept BOOLEAN
)
RETURNS public.daily_sadhana
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_row public.daily_sadhana;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('daily_sadhana'), hashtext(v_user_id::text));

  PERFORM private.ensure_daily_sadhana_for_user(v_user_id, p_sadhana_date);

  UPDATE public.daily_sadhana
  SET carry_forward_accepted = p_accept
  WHERE user_id = v_user_id AND sadhana_date = p_sadhana_date AND policy_applied = 'optional';

  PERFORM private.recompute_sadhana_forward(v_user_id, p_sadhana_date);

  SELECT * INTO v_row
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = p_sadhana_date;

  RETURN v_row;
END;
$$;

-- Public authenticated RPC: audited room member role management
CREATE OR REPLACE FUNCTION public.update_room_member_role(
  p_room_id UUID,
  p_target_user_id UUID,
  p_new_role public.room_member_role
)
RETURNS public.room_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_caller UUID := (SELECT auth.uid());
  v_owner UUID;
  v_old_role public.room_member_role;
  v_updated public.room_memberships;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT private.is_room_admin(p_room_id) THEN
    RAISE EXCEPTION 'Only room owners or admins can manage member roles';
  END IF;

  SELECT owner_id INTO v_owner
  FROM public.rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  IF p_target_user_id = v_owner THEN
    RAISE EXCEPTION 'Room owner role cannot be changed';
  END IF;

  IF p_new_role = 'owner' THEN
    RAISE EXCEPTION 'Ownership transfer is not permitted via role update';
  END IF;

  SELECT role INTO v_old_role
  FROM public.room_memberships
  WHERE room_id = p_room_id AND user_id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user is not a member of this room';
  END IF;

  UPDATE public.room_memberships
  SET role = p_new_role
  WHERE room_id = p_room_id AND user_id = p_target_user_id
  RETURNING * INTO v_updated;

  INSERT INTO public.audit_logs (actor_user_id, room_id, action, target_table, target_id, metadata)
  VALUES (
    v_caller,
    p_room_id,
    'room_member_role_updated',
    'room_memberships',
    v_updated.id::text,
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'old_role', v_old_role,
      'new_role', p_new_role
    )
  );

  RETURN v_updated;
END;
$$;

-- Public authenticated RPC: redeem room invite token atomically
CREATE OR REPLACE FUNCTION public.redeem_room_invitation(
  p_raw_token TEXT,
  p_share_mode public.room_share_mode DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_hash TEXT;
  v_invite public.room_invitations;
  v_default_share public.room_share_mode;
  v_membership public.room_memberships;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_raw_token IS NULL OR char_length(btrim(p_raw_token)) < 16 THEN
    RAISE EXCEPTION 'Invalid invitation token';
  END IF;

  v_hash := encode(sha256(convert_to(btrim(p_raw_token), 'UTF8')), 'hex');

  SELECT * INTO v_invite
  FROM public.room_invitations
  WHERE token_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation has been revoked';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'Invitation has reached its maximum uses';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rooms WHERE id = v_invite.room_id AND is_archived = TRUE
  ) THEN
    RAISE EXCEPTION 'Room is archived';
  END IF;

  SELECT default_room_share_mode INTO v_default_share
  FROM public.user_preferences
  WHERE user_id = v_user_id;

  IF EXISTS (
    SELECT 1 FROM public.room_memberships
    WHERE room_id = v_invite.room_id AND user_id = v_user_id
  ) THEN
    SELECT * INTO v_membership
    FROM public.room_memberships
    WHERE room_id = v_invite.room_id AND user_id = v_user_id;

    RETURN jsonb_build_object('already_member', TRUE, 'membership', to_jsonb(v_membership));
  END IF;

  UPDATE public.room_invitations
  SET uses_count = uses_count + 1
  WHERE id = v_invite.id;

  INSERT INTO public.room_memberships (room_id, user_id, role, share_progress_mode)
  VALUES (
    v_invite.room_id,
    v_user_id,
    'member',
    COALESCE(p_share_mode, v_default_share, 'completion_only')
  )
  RETURNING * INTO v_membership;

  INSERT INTO public.audit_logs (actor_user_id, room_id, action, target_table, target_id, metadata)
  VALUES (
    v_user_id,
    v_invite.room_id,
    'room_invite_redeemed',
    'room_memberships',
    v_membership.id::text,
    jsonb_build_object('invitation_id', v_invite.id)
  );

  RETURN jsonb_build_object('already_member', FALSE, 'membership', to_jsonb(v_membership));
END;
$$;

-- Restrict RPC execution strictly to authenticated users
REVOKE ALL ON FUNCTION public.ensure_my_daily_sadhana(DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_chanting_round(public.chanting_method, TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.undo_chanting_round(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_optional_carry_forward(DATE, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_room_invitation(TEXT, public.room_share_mode) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_room_member_role(UUID, UUID, public.room_member_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ensure_my_daily_sadhana(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_chanting_round(public.chanting_method, TEXT, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_chanting_round(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_optional_carry_forward(DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_room_invitation(TEXT, public.room_share_mode) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_room_member_role(UUID, UUID, public.room_member_role) TO authenticated;
