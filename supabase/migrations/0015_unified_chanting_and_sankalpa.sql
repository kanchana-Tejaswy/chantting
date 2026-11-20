-- Phase 2 Migration 0015: Unified Chanting Data Architecture & Sankalpa Tracking
-- Establishes ONE authoritative completed-round system with strict idempotency,
-- Sankalpa progress synchronization, undo reversal, and historical data protection.

-- 1. Sankalpa vows table (independent target tracking with shared round counting)
CREATE TABLE IF NOT EXISTS public.sankalpas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  target_rounds INTEGER NOT NULL CHECK (target_rounds BETWEEN 1 AND 1000000),
  completed_rounds INTEGER NOT NULL DEFAULT 0 CHECK (completed_rounds >= 0),
  start_date DATE NOT NULL,
  end_date DATE CHECK (end_date IS NULL OR end_date >= start_date),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sankalpas_user_status_idx
  ON public.sankalpas (user_id, status, created_at DESC);

-- Trigger for updated_at on sankalpas
DROP TRIGGER IF EXISTS sankalpas_set_updated_at ON public.sankalpas;
CREATE TRIGGER sankalpas_set_updated_at
  BEFORE UPDATE ON public.sankalpas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS policies for sankalpas
ALTER TABLE public.sankalpas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sankalpas_select_own" ON public.sankalpas;
CREATE POLICY "sankalpas_select_own"
  ON public.sankalpas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "sankalpas_insert_own" ON public.sankalpas;
CREATE POLICY "sankalpas_insert_own"
  ON public.sankalpas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sankalpas_update_own" ON public.sankalpas;
CREATE POLICY "sankalpas_update_own"
  ON public.sankalpas FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sankalpas_delete_own" ON public.sankalpas;
CREATE POLICY "sankalpas_delete_own"
  ON public.sankalpas FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sankalpas TO authenticated;

-- 2. Extend chanting_records with optional sankalpa association and sync status
ALTER TABLE public.chanting_records
  ADD COLUMN IF NOT EXISTS sankalpa_id UUID REFERENCES public.sankalpas(id) ON DELETE SET NULL;

ALTER TABLE public.chanting_records
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced'
  CHECK (sync_status IN ('synced', 'offline_pending'));

CREATE INDEX IF NOT EXISTS chanting_records_sankalpa_idx
  ON public.chanting_records (sankalpa_id)
  WHERE sankalpa_id IS NOT NULL;

-- 3. Historical Data Protection: Enforce immutability of records dated before Nov 13, 2026
CREATE OR REPLACE FUNCTION private.protect_historical_chanting_records()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strict protection: records created prior to Phase 2 (Nov 13, 2026) cannot be updated or deleted
  IF OLD.sadhana_date < '2026-11-13'::date AND OLD.created_at < '2026-11-13T00:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'Historical chanting records dated before November 13, 2026 are protected and cannot be modified';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chanting_records_protect_historical ON public.chanting_records;
CREATE TRIGGER chanting_records_protect_historical
  BEFORE UPDATE OR DELETE ON public.chanting_records
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_historical_chanting_records();

CREATE OR REPLACE FUNCTION private.protect_historical_daily_sadhana()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strict protection: daily sadhana records created prior to Nov 13, 2026 cannot be modified or deleted
  IF OLD.sadhana_date < '2026-11-13'::date AND OLD.created_at < '2026-11-13T00:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'Historical daily sadhana records dated before November 13, 2026 are protected and cannot be modified';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_sadhana_protect_historical ON public.daily_sadhana;
CREATE TRIGGER daily_sadhana_protect_historical
  BEFORE UPDATE OR DELETE ON public.daily_sadhana
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_historical_daily_sadhana();

CREATE OR REPLACE FUNCTION private.protect_historical_carry_forward_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strict protection: carry forward ledger records created prior to Nov 13, 2026 cannot be modified or deleted
  IF OLD.to_date < '2026-11-13'::date AND OLD.created_at < '2026-11-13T00:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'Historical carry forward ledger entries dated before November 13, 2026 are protected and cannot be modified';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS carry_forward_ledger_protect_historical ON public.carry_forward_ledger;
CREATE TRIGGER carry_forward_ledger_protect_historical
  BEFORE UPDATE OR DELETE ON public.carry_forward_ledger
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_historical_carry_forward_ledger();

-- 4. Authoritative record_chanting_round RPC with Sankalpa, Idempotency, and Multi-Level Counting
DROP FUNCTION IF EXISTS public.record_chanting_round(public.chanting_method, TEXT, UUID, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.record_chanting_round(
  p_method public.chanting_method,
  p_idempotency_key TEXT,
  p_session_id UUID DEFAULT NULL,
  p_client_recorded_at TIMESTAMPTZ DEFAULT NULL,
  p_sankalpa_id UUID DEFAULT NULL
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
  v_sankalpa public.sankalpas;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_idempotency_key IS NULL OR char_length(btrim(p_idempotency_key)) < 8 THEN
    RAISE EXCEPTION 'Valid idempotency_key (min 8 chars) is required';
  END IF;

  -- Serialize all mutations for this user across daily_sadhana, sankalpa, and chanting_records
  PERFORM pg_advisory_xact_lock(hashtext('daily_sadhana'), hashtext(v_user_id::text));

  -- 1. Idempotency Check: prevent duplicate round submissions
  SELECT * INTO v_existing_record
  FROM public.chanting_records
  WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT * INTO v_daily
    FROM public.daily_sadhana
    WHERE user_id = v_user_id AND sadhana_date = v_existing_record.sadhana_date;

    IF v_existing_record.sankalpa_id IS NOT NULL THEN
      SELECT * INTO v_sankalpa
      FROM public.sankalpas
      WHERE id = v_existing_record.sankalpa_id AND user_id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
      'duplicate', TRUE,
      'record', to_jsonb(v_existing_record),
      'daily_sadhana', to_jsonb(v_daily),
      'sankalpa', to_jsonb(v_sankalpa)
    );
  END IF;

  SELECT timezone INTO v_tz
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Clamp client timestamp for offline sync safety (max 30 days old, max 5 min in future)
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

  -- 2. Optional Session Validation
  IF p_session_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.chanting_sessions
      WHERE id = p_session_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Chanting session not found for current user';
    END IF;
  END IF;

  -- 3. Optional Sankalpa Validation & Locking
  IF p_sankalpa_id IS NOT NULL THEN
    SELECT * INTO v_sankalpa
    FROM public.sankalpas
    WHERE id = p_sankalpa_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sankalpa not found for current user';
    END IF;

    IF v_sankalpa.status <> 'active' THEN
      RAISE EXCEPTION 'Sankalpa is not active';
    END IF;
  END IF;

  -- Ensure today's Sadhana day is initialized
  PERFORM private.ensure_daily_sadhana_for_user(v_user_id, v_sadhana_date);

  -- 4. Authoritative Completed-Round Record Insertion
  INSERT INTO public.chanting_records (
    user_id,
    session_id,
    sadhana_date,
    method,
    round_delta,
    idempotency_key,
    recorded_at,
    client_recorded_at,
    timezone_snapshot,
    sankalpa_id,
    sync_status
  ) VALUES (
    v_user_id,
    p_session_id,
    v_sadhana_date,
    p_method,
    1,
    p_idempotency_key,
    now(),
    p_client_recorded_at,
    v_tz,
    p_sankalpa_id,
    'synced'
  )
  RETURNING * INTO v_new_record;

  -- 5. Session Progress Update
  IF p_session_id IS NOT NULL THEN
    UPDATE public.chanting_sessions
    SET rounds_completed = rounds_completed + 1,
        current_bead_count = CASE WHEN method = 'japa_mala' THEN 0 ELSE current_bead_count END,
        last_activity_at = now()
    WHERE id = p_session_id AND user_id = v_user_id;
  END IF;

  -- 6. Sankalpa Progress Update (if associated)
  IF p_sankalpa_id IS NOT NULL THEN
    UPDATE public.sankalpas
    SET completed_rounds = completed_rounds + 1,
        status = CASE
          WHEN (completed_rounds + 1) >= target_rounds THEN 'completed'
          ELSE status
        END,
        completed_at = CASE
          WHEN (completed_rounds + 1) >= target_rounds THEN now()
          ELSE completed_at
        END,
        updated_at = now()
    WHERE id = p_sankalpa_id
    RETURNING * INTO v_sankalpa;
  END IF;

  -- 7. Authoritative Daily & Forward Carry-Forward Recalculation
  PERFORM private.recompute_sadhana_forward(v_user_id, v_sadhana_date);

  SELECT * INTO v_daily
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = v_sadhana_date;

  -- 8. Idempotent Sādhana Notifications (Daily Target Met & Sankalpa Fulfilled)
  IF v_daily.day_status = 'target_met' AND NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_user_id
      AND metadata ->> 'event' = 'daily_target_met'
      AND metadata ->> 'sadhana_date' = v_sadhana_date::text
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      action_url,
      metadata
    ) VALUES (
      v_user_id,
      'sadhana_reminder',
      'Daily Target Completed',
      'Today''s chanting target is complete. May your practice bring steady peace and remembrance.',
      '/sadhana',
      jsonb_build_object(
        'event', 'daily_target_met',
        'sadhana_date', v_sadhana_date::text,
        'idempotency_key', 'daily_target_met_' || v_user_id::text || '_' || v_sadhana_date::text
      )
    );
  END IF;

  IF v_sankalpa.status = 'completed' AND NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_user_id
      AND metadata ->> 'event' = 'sankalpa_completed'
      AND metadata ->> 'sankalpa_id' = v_sankalpa.id::text
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      action_url,
      metadata
    ) VALUES (
      v_user_id,
      'sadhana_reminder',
      'Sankalpa Milestone Fulfilled: ' || left(v_sankalpa.title, 60),
      'Your devotional chanting vow has been fulfilled with steady devotion. Sri Krishna accepts your sincere offering.',
      '/sadhana',
      jsonb_build_object(
        'event', 'sankalpa_completed',
        'sankalpa_id', v_sankalpa.id::text,
        'idempotency_key', 'sankalpa_completed_' || v_sankalpa.id::text
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'duplicate', FALSE,
    'record', to_jsonb(v_new_record),
    'daily_sadhana', to_jsonb(v_daily),
    'sankalpa', to_jsonb(v_sankalpa)
  );
END;
$$;

-- 5. Authoritative undo_chanting_round RPC with Sankalpa, Carry-Forward, and Historical Protection
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
  v_sankalpa public.sankalpas;
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

  -- Historical Data Protection check
  IF v_record.sadhana_date < '2026-11-13'::date AND v_record.created_at < '2026-11-13T00:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'Historical records dated before November 13, 2026 are protected and cannot be modified';
  END IF;

  IF v_record.is_reverted THEN
    SELECT * INTO v_daily
    FROM public.daily_sadhana
    WHERE user_id = v_user_id AND sadhana_date = v_record.sadhana_date;

    IF v_record.sankalpa_id IS NOT NULL THEN
      SELECT * INTO v_sankalpa
      FROM public.sankalpas
      WHERE id = v_record.sankalpa_id AND user_id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
      'already_reverted', TRUE,
      'record', to_jsonb(v_record),
      'daily_sadhana', to_jsonb(v_daily),
      'sankalpa', to_jsonb(v_sankalpa)
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

  -- Revert Sankalpa progress if associated
  IF v_record.sankalpa_id IS NOT NULL THEN
    UPDATE public.sankalpas
    SET completed_rounds = GREATEST(completed_rounds - 1, 0),
        status = CASE
          WHEN status = 'completed' AND (completed_rounds - 1) < target_rounds THEN 'active'
          ELSE status
        END,
        completed_at = CASE
          WHEN status = 'completed' AND (completed_rounds - 1) < target_rounds THEN NULL
          ELSE completed_at
        END,
        updated_at = now()
    WHERE id = v_record.sankalpa_id AND user_id = v_user_id
    RETURNING * INTO v_sankalpa;
  END IF;

  -- Recompute daily sadhana & forward carry-forward from authoritative records
  PERFORM private.recompute_sadhana_forward(v_user_id, v_record.sadhana_date);

  SELECT * INTO v_daily
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = v_record.sadhana_date;

  RETURN jsonb_build_object(
    'already_reverted', FALSE,
    'record', to_jsonb(v_record),
    'daily_sadhana', to_jsonb(v_daily),
    'sankalpa', to_jsonb(v_sankalpa)
  );
END;
$$;

-- 6. Authoritative Unified Chanting Statistics RPC
CREATE OR REPLACE FUNCTION public.get_chanting_statistics(
  p_target_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_tz TEXT;
  v_date DATE;
  v_today public.daily_sadhana;
  v_month_rounds INTEGER := 0;
  v_year_rounds INTEGER := 0;
  v_lifetime_rounds INTEGER := 0;
  v_active_sankalpa public.sankalpas;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT timezone INTO v_tz
  FROM public.profiles
  WHERE id = v_user_id;

  v_date := COALESCE(p_target_date, (now() AT TIME ZONE COALESCE(v_tz, 'UTC'))::date);

  -- Ensure today's row
  SELECT * INTO v_today
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = v_date;

  -- Monthly sum from authoritative daily_sadhana
  SELECT COALESCE(SUM(completed_rounds), 0) INTO v_month_rounds
  FROM public.daily_sadhana
  WHERE user_id = v_user_id
    AND date_trunc('month', sadhana_date) = date_trunc('month', v_date);

  -- Yearly sum from authoritative daily_sadhana
  SELECT COALESCE(SUM(completed_rounds), 0) INTO v_year_rounds
  FROM public.daily_sadhana
  WHERE user_id = v_user_id
    AND date_trunc('year', sadhana_date) = date_trunc('year', v_date);

  -- Lifetime sum from authoritative daily_sadhana
  SELECT COALESCE(SUM(completed_rounds), 0) INTO v_lifetime_rounds
  FROM public.daily_sadhana
  WHERE user_id = v_user_id;

  -- Active Sankalpa
  SELECT * INTO v_active_sankalpa
  FROM public.sankalpas
  WHERE user_id = v_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'today', jsonb_build_object(
      'date', v_date,
      'completed_rounds', COALESCE(v_today.completed_rounds, 0),
      'remaining_rounds', COALESCE(v_today.remaining_balance, 0),
      'original_target', COALESCE(v_today.original_daily_target, 0),
      'carried_balance', COALESCE(v_today.previous_pending_balance, 0),
      'effective_target', COALESCE(v_today.effective_daily_target, 0),
      'extra_rounds', COALESCE(v_today.extra_rounds, 0)
    ),
    'month', jsonb_build_object(
      'year', EXTRACT(YEAR FROM v_date)::integer,
      'month', EXTRACT(MONTH FROM v_date)::integer,
      'completed_rounds', v_month_rounds
    ),
    'year', jsonb_build_object(
      'year', EXTRACT(YEAR FROM v_date)::integer,
      'completed_rounds', v_year_rounds
    ),
    'lifetime', jsonb_build_object(
      'completed_rounds', v_lifetime_rounds
    ),
    'active_sankalpa', CASE
      WHEN v_active_sankalpa.id IS NOT NULL THEN jsonb_build_object(
        'id', v_active_sankalpa.id,
        'title', v_active_sankalpa.title,
        'target_rounds', v_active_sankalpa.target_rounds,
        'completed_rounds', v_active_sankalpa.completed_rounds,
        'remaining_rounds', GREATEST(v_active_sankalpa.target_rounds - v_active_sankalpa.completed_rounds, 0),
        'status', v_active_sankalpa.status
      )
      ELSE NULL
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_chanting_round(public.chanting_method, TEXT, UUID, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_chanting_round(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chanting_statistics(DATE) TO authenticated;

-- 8. Clean up sankalpas when user deactivates account via account scrubbing
CREATE OR REPLACE FUNCTION private.cleanup_sankalpas_on_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_deactivated = TRUE AND (OLD.is_deactivated IS NULL OR OLD.is_deactivated = FALSE) THEN
    DELETE FROM public.sankalpas WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.cleanup_sankalpas_on_deactivation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_deactivate_sankalpas ON public.profiles;
CREATE TRIGGER profiles_deactivate_sankalpas
  AFTER UPDATE OF is_deactivated ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.cleanup_sankalpas_on_deactivation();

