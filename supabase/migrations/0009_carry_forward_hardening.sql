-- Phase 5 Migration 0009: Carry-Forward Engine Hardening
-- 1. Ensures carry_forward_ledger stays contiguous when retroactive offline days arrive out of order.
-- 2. Adds transaction-safe RPC to update carry-forward policy (with optional today re-evaluation).

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
      -- Remove stale ledger link if an intermediate day was inserted retroactively
      DELETE FROM public.carry_forward_ledger
      WHERE user_id = p_user_id
        AND to_date = v_row.sadhana_date
        AND from_date <> v_prev_date;

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
        v_prev_date,
        v_row.sadhana_date,
        v_row.policy_applied,
        v_prev_remaining,
        v_carried,
        CASE
          WHEN v_row.policy_applied = 'optional' AND v_row.carry_forward_accepted IS NULL AND v_prev_remaining > 0
            THEN 'Awaiting optional confirmation'
          WHEN v_row.policy_applied = 'optional' AND v_row.carry_forward_accepted = FALSE AND v_prev_remaining > 0
            THEN 'Optional carry-forward declined'
          ELSE NULL
        END
      )
      ON CONFLICT (user_id, from_date, to_date) DO UPDATE
      SET policy_applied = EXCLUDED.policy_applied,
          source_remaining_balance = EXCLUDED.source_remaining_balance,
          carried_amount = EXCLUDED.carried_amount,
          notes = EXCLUDED.notes;
    END IF;

    v_prev_date := v_row.sadhana_date;
    v_prev_remaining := v_remaining;
    v_has_prev := TRUE;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.recompute_sadhana_forward(UUID, DATE) FROM PUBLIC, anon, authenticated;

-- Harden optional carry-forward resolution against duplicate/conflicting decisions
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

  SELECT * INTO v_row
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = p_sadhana_date
  FOR UPDATE;

  IF v_row.policy_applied <> 'optional' THEN
    RAISE EXCEPTION 'Daily record is not configured with optional carry-forward policy';
  END IF;

  IF v_row.carry_forward_accepted IS NOT NULL THEN
    IF v_row.carry_forward_accepted = p_accept THEN
      -- Idempotent retry returns already-persisted decision without duplicate ledger work
      RETURN v_row;
    END IF;
    RAISE EXCEPTION 'Optional carry-forward decision has already been recorded for %', p_sadhana_date;
  END IF;

  UPDATE public.daily_sadhana
  SET carry_forward_accepted = p_accept
  WHERE id = v_row.id;

  PERFORM private.recompute_sadhana_forward(v_user_id, p_sadhana_date);

  SELECT * INTO v_row
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = p_sadhana_date;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_optional_carry_forward(DATE, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_optional_carry_forward(DATE, BOOLEAN) TO authenticated;

-- Public authenticated RPC: update user's carry-forward policy and optionally re-apply to today
CREATE OR REPLACE FUNCTION public.update_carry_forward_policy(
  p_policy public.carry_forward_policy,
  p_custom_rule JSONB DEFAULT '{}'::jsonb,
  p_apply_to_today BOOLEAN DEFAULT FALSE,
  p_today_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_tz TEXT;
  v_today DATE;
  v_prefs public.user_preferences;
  v_daily public.daily_sadhana;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('daily_sadhana'), hashtext(v_user_id::text));

  UPDATE public.user_preferences
  SET carry_forward_policy = p_policy,
      custom_carry_rule = COALESCE(p_custom_rule, '{}'::jsonb)
  WHERE user_id = v_user_id
  RETURNING * INTO v_prefs;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Preferences not found for user';
  END IF;

  SELECT timezone INTO v_tz
  FROM public.profiles
  WHERE id = v_user_id;

  v_today := COALESCE(p_today_date, (now() AT TIME ZONE COALESCE(v_tz, 'UTC'))::date);

  IF p_apply_to_today THEN
    PERFORM private.ensure_daily_sadhana_for_user(v_user_id, v_today);

    UPDATE public.daily_sadhana
    SET policy_applied = p_policy,
        carry_forward_accepted = CASE WHEN p_policy = 'optional' THEN NULL ELSE TRUE END
    WHERE user_id = v_user_id AND sadhana_date = v_today;

    PERFORM private.recompute_sadhana_forward(v_user_id, v_today);
  END IF;

  SELECT * INTO v_daily
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = v_today;

  RETURN jsonb_build_object(
    'preferences', to_jsonb(v_prefs),
    'daily_sadhana', CASE WHEN v_daily.id IS NOT NULL THEN to_jsonb(v_daily) ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_carry_forward_policy(public.carry_forward_policy, JSONB, BOOLEAN, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_carry_forward_policy(public.carry_forward_policy, JSONB, BOOLEAN, DATE) TO authenticated;
