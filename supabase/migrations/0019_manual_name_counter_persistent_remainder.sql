-- SMARAN Phase 4+ — Migration 0019: Manual Name Counter with Persistent Remainder
--
-- Implements an authoritative second Japa counting method for devotees using physical or digital
-- tally counters (108 names = 1 round), with exact cumulative tracking, persistent remainder,
-- session continuity / branching, and audited reversible entries.

-- 1. Table: User Authoritative Manual Counter State
CREATE TABLE IF NOT EXISTS public.manual_counter_state (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cumulative_names BIGINT NOT NULL DEFAULT 0 CHECK (cumulative_names >= 0),
  cumulative_rounds INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_rounds >= 0),
  current_remainder SMALLINT NOT NULL DEFAULT 0 CHECK (current_remainder BETWEEN 0 AND 107),
  last_entry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT manual_counter_state_math CHECK (
    cumulative_names = (cumulative_rounds::bigint * 108 + current_remainder)
  )
);

CREATE INDEX IF NOT EXISTS manual_counter_state_updated_idx
  ON public.manual_counter_state (user_id, updated_at DESC);

ALTER TABLE public.manual_counter_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own manual counter state"
  ON public.manual_counter_state
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 2. Table: Historical Manual Name Entries
CREATE TABLE IF NOT EXISTS public.manual_name_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chanting_sessions(id) ON DELETE SET NULL,
  sadhana_date DATE NOT NULL,
  names_count INTEGER NOT NULL CHECK (names_count > 0 AND names_count <= 10000000),
  previous_remainder SMALLINT NOT NULL CHECK (previous_remainder BETWEEN 0 AND 107),
  rounds_earned INTEGER NOT NULL CHECK (rounds_earned >= 0),
  new_remainder SMALLINT NOT NULL CHECK (new_remainder BETWEEN 0 AND 107),
  cumulative_names_snapshot BIGINT NOT NULL CHECK (cumulative_names_snapshot > 0),
  idempotency_key TEXT NOT NULL CHECK (char_length(btrim(idempotency_key)) >= 8),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_recorded_at TIMESTAMPTZ,
  timezone_snapshot TEXT NOT NULL CHECK (public.is_valid_timezone(timezone_snapshot)),
  mantra_id UUID REFERENCES public.mantras(id) ON DELETE SET NULL,
  sankalpa_id UUID REFERENCES public.sankalpas(id) ON DELETE SET NULL,
  is_reverted BOOLEAN NOT NULL DEFAULT FALSE,
  reverted_at TIMESTAMPTZ,
  revert_reason TEXT CHECK (revert_reason IS NULL OR char_length(revert_reason) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT manual_name_entries_user_idempotency_unique UNIQUE (user_id, idempotency_key),
  CONSTRAINT manual_name_entries_calc CHECK (
    previous_remainder + names_count = rounds_earned * 108 + new_remainder
  )
);

CREATE INDEX IF NOT EXISTS manual_name_entries_user_date_idx
  ON public.manual_name_entries (user_id, sadhana_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS manual_name_entries_session_idx
  ON public.manual_name_entries (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS manual_name_entries_mantra_idx
  ON public.manual_name_entries (mantra_id)
  WHERE mantra_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS manual_name_entries_sankalpa_idx
  ON public.manual_name_entries (sankalpa_id)
  WHERE sankalpa_id IS NOT NULL;

ALTER TABLE public.manual_name_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own manual name entries"
  ON public.manual_name_entries
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON public.manual_counter_state, public.manual_name_entries TO authenticated;

-- 3. Link chanting_records to manual_entry_id
ALTER TABLE public.chanting_records
  ADD COLUMN IF NOT EXISTS manual_entry_id UUID REFERENCES public.manual_name_entries(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS chanting_records_manual_entry_idx
  ON public.chanting_records (manual_entry_id)
  WHERE manual_entry_id IS NOT NULL;

-- 4. Authoritative RPC: record_manual_names
CREATE OR REPLACE FUNCTION public.record_manual_names(
  p_names_count INTEGER,
  p_idempotency_key TEXT,
  p_session_id UUID DEFAULT NULL,
  p_start_new_session BOOLEAN DEFAULT FALSE,
  p_client_recorded_at TIMESTAMPTZ DEFAULT NULL,
  p_sankalpa_id UUID DEFAULT NULL,
  p_mantra_id UUID DEFAULT NULL
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
  v_existing_entry public.manual_name_entries;
  v_state public.manual_counter_state;
  v_new_entry public.manual_name_entries;
  v_daily public.daily_sadhana;
  v_sankalpa public.sankalpas;
  v_session public.chanting_sessions;
  v_effective_session_id UUID := p_session_id;
  v_effective_mantra_id UUID := p_mantra_id;
  v_prev_remainder INTEGER;
  v_total_names BIGINT;
  v_rounds_earned INTEGER;
  v_new_remainder INTEGER;
  v_new_cumulative_names BIGINT;
  v_new_cumulative_rounds INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_names_count IS NULL OR p_names_count <= 0 THEN
    RAISE EXCEPTION 'Names count must be a positive integer';
  END IF;

  IF p_idempotency_key IS NULL OR char_length(btrim(p_idempotency_key)) < 8 THEN
    RAISE EXCEPTION 'Valid idempotency_key (min 8 chars) is required';
  END IF;

  -- Lock user resources
  PERFORM pg_advisory_xact_lock(hashtext('manual_counter'), hashtext(v_user_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('daily_sadhana'), hashtext(v_user_id::text));

  -- 1. Idempotency Check
  SELECT * INTO v_existing_entry
  FROM public.manual_name_entries
  WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT * INTO v_state FROM public.manual_counter_state WHERE user_id = v_user_id;
    SELECT * INTO v_daily FROM public.daily_sadhana WHERE user_id = v_user_id AND sadhana_date = v_existing_entry.sadhana_date;
    IF v_existing_entry.sankalpa_id IS NOT NULL THEN
      SELECT * INTO v_sankalpa FROM public.sankalpas WHERE id = v_existing_entry.sankalpa_id AND user_id = v_user_id;
    END IF;
    IF v_existing_entry.session_id IS NOT NULL THEN
      SELECT * INTO v_session FROM public.chanting_sessions WHERE id = v_existing_entry.session_id AND user_id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
      'duplicate', TRUE,
      'entry', to_jsonb(v_existing_entry),
      'counter_state', to_jsonb(v_state),
      'rounds_earned', v_existing_entry.rounds_earned,
      'current_remainder', v_existing_entry.new_remainder,
      'daily_sadhana', to_jsonb(v_daily),
      'session', to_jsonb(v_session),
      'sankalpa', to_jsonb(v_sankalpa)
    );
  END IF;

  -- Timezone resolution
  SELECT timezone INTO v_tz FROM public.profiles WHERE id = v_user_id;
  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF p_client_recorded_at IS NOT NULL THEN
    v_effective_ts := LEAST(p_client_recorded_at, now());
  ELSE
    v_effective_ts := now();
  END IF;
  v_sadhana_date := (v_effective_ts AT TIME ZONE v_tz)::date;

  -- 2. Session Management
  IF p_start_new_session = TRUE THEN
    INSERT INTO public.chanting_sessions (
      user_id,
      sadhana_date,
      method,
      status,
      client_session_key,
      started_at,
      last_activity_at,
      mantra_id
    ) VALUES (
      v_user_id,
      v_sadhana_date,
      'manual',
      'active',
      'manual-sess-' || gen_random_uuid()::text,
      now(),
      now(),
      p_mantra_id
    ) RETURNING * INTO v_session;
    v_effective_session_id := v_session.id;
  ELSIF v_effective_session_id IS NOT NULL THEN
    SELECT * INTO v_session
    FROM public.chanting_sessions
    WHERE id = v_effective_session_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Specified chanting session not found';
    END IF;

    IF v_effective_mantra_id IS NULL AND v_session.mantra_id IS NOT NULL THEN
      v_effective_mantra_id := v_session.mantra_id;
    END IF;
  ELSE
    -- Re-use active manual session for today if one exists, otherwise initialize new
    SELECT * INTO v_session
    FROM public.chanting_sessions
    WHERE user_id = v_user_id AND method = 'manual' AND status = 'active' AND sadhana_date = v_sadhana_date
    ORDER BY last_activity_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.chanting_sessions (
        user_id,
        sadhana_date,
        method,
        status,
        client_session_key,
        started_at,
        last_activity_at,
        mantra_id
      ) VALUES (
        v_user_id,
        v_sadhana_date,
        'manual',
        'active',
        'manual-sess-' || gen_random_uuid()::text,
        now(),
        now(),
        p_mantra_id
      ) RETURNING * INTO v_session;
    END IF;
    v_effective_session_id := v_session.id;
  END IF;

  -- 3. Authoritative Cumulative State Calculation
  SELECT * INTO v_state
  FROM public.manual_counter_state
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.manual_counter_state (
      user_id,
      cumulative_names,
      cumulative_rounds,
      current_remainder,
      last_entry_at
    ) VALUES (
      v_user_id,
      0,
      0,
      0,
      now()
    ) RETURNING * INTO v_state;
  END IF;

  v_prev_remainder := v_state.current_remainder;
  v_total_names := v_prev_remainder + p_names_count;
  v_rounds_earned := (v_total_names / 108)::integer;
  v_new_remainder := (v_total_names % 108)::integer;
  v_new_cumulative_names := v_state.cumulative_names + p_names_count;
  v_new_cumulative_rounds := v_state.cumulative_rounds + v_rounds_earned;

  -- 4. Update Cumulative State
  UPDATE public.manual_counter_state
  SET cumulative_names = v_new_cumulative_names,
      cumulative_rounds = v_new_cumulative_rounds,
      current_remainder = v_new_remainder,
      last_entry_at = now(),
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_state;

  -- 5. Record Manual Entry
  INSERT INTO public.manual_name_entries (
    user_id,
    session_id,
    sadhana_date,
    names_count,
    previous_remainder,
    rounds_earned,
    new_remainder,
    cumulative_names_snapshot,
    idempotency_key,
    recorded_at,
    client_recorded_at,
    timezone_snapshot,
    mantra_id,
    sankalpa_id
  ) VALUES (
    v_user_id,
    v_effective_session_id,
    v_sadhana_date,
    p_names_count,
    v_prev_remainder,
    v_rounds_earned,
    v_new_remainder,
    v_new_cumulative_names,
    p_idempotency_key,
    now(),
    p_client_recorded_at,
    v_tz,
    v_effective_mantra_id,
    p_sankalpa_id
  ) RETURNING * INTO v_new_entry;

  -- 6. Credit newly completed rounds (if any)
  IF v_rounds_earned > 0 THEN
    PERFORM private.ensure_daily_sadhana_for_user(v_user_id, v_sadhana_date);

    FOR i IN 1..v_rounds_earned LOOP
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
        mantra_id,
        sync_status,
        manual_entry_id
      ) VALUES (
        v_user_id,
        v_effective_session_id,
        v_sadhana_date,
        'manual',
        1,
        p_idempotency_key || ':round:' || i,
        now(),
        p_client_recorded_at,
        v_tz,
        p_sankalpa_id,
        v_effective_mantra_id,
        'synced',
        v_new_entry.id
      );
    END LOOP;

    -- Update session completed rounds
    IF v_effective_session_id IS NOT NULL THEN
      UPDATE public.chanting_sessions
      SET rounds_completed = rounds_completed + v_rounds_earned,
          last_activity_at = now()
      WHERE id = v_effective_session_id AND user_id = v_user_id
      RETURNING * INTO v_session;
    END IF;

    -- Update Sankalpa progress if associated
    IF p_sankalpa_id IS NOT NULL THEN
      UPDATE public.sankalpas
      SET completed_rounds = completed_rounds + v_rounds_earned,
          status = CASE WHEN (completed_rounds + v_rounds_earned) >= target_rounds THEN 'completed' ELSE status END,
          completed_at = CASE WHEN (completed_rounds + v_rounds_earned) >= target_rounds THEN now() ELSE completed_at END,
          updated_at = now()
      WHERE id = p_sankalpa_id AND user_id = v_user_id
      RETURNING * INTO v_sankalpa;
    END IF;

    -- Authoritative Daily & Forward Carry-Forward Recalculation
    PERFORM private.recompute_sadhana_forward(v_user_id, v_sadhana_date);
  ELSE
    -- If 0 rounds earned, still ensure sadhana row exists for UI consistency
    PERFORM private.ensure_daily_sadhana_for_user(v_user_id, v_sadhana_date);
  END IF;

  SELECT * INTO v_daily
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = v_sadhana_date;

  RETURN jsonb_build_object(
    'duplicate', FALSE,
    'entry', to_jsonb(v_new_entry),
    'counter_state', to_jsonb(v_state),
    'rounds_earned', v_rounds_earned,
    'current_remainder', v_new_remainder,
    'daily_sadhana', to_jsonb(v_daily),
    'session', to_jsonb(v_session),
    'sankalpa', to_jsonb(v_sankalpa)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_manual_names(INTEGER, TEXT, UUID, BOOLEAN, TIMESTAMPTZ, UUID, UUID) TO authenticated;

-- 5. Authoritative RPC: undo_manual_name_entry
CREATE OR REPLACE FUNCTION public.undo_manual_name_entry(
  p_entry_id UUID,
  p_reason TEXT DEFAULT 'user_undo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_entry public.manual_name_entries;
  v_state public.manual_counter_state;
  v_daily public.daily_sadhana;
  v_session public.chanting_sessions;
  v_sankalpa public.sankalpas;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('manual_counter'), hashtext(v_user_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('daily_sadhana'), hashtext(v_user_id::text));

  SELECT * INTO v_entry
  FROM public.manual_name_entries
  WHERE id = p_entry_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Manual name entry not found';
  END IF;

  IF v_entry.is_reverted THEN
    SELECT * INTO v_state FROM public.manual_counter_state WHERE user_id = v_user_id;
    SELECT * INTO v_daily FROM public.daily_sadhana WHERE user_id = v_user_id AND sadhana_date = v_entry.sadhana_date;
    RETURN jsonb_build_object(
      'already_reverted', TRUE,
      'entry', to_jsonb(v_entry),
      'counter_state', to_jsonb(v_state),
      'daily_sadhana', to_jsonb(v_daily)
    );
  END IF;

  -- Ensure strictly contiguous rollback: only the most recent non-reverted entry can be undone
  IF EXISTS (
    SELECT 1 FROM public.manual_name_entries
    WHERE user_id = v_user_id AND is_reverted = FALSE AND created_at > v_entry.created_at
  ) THEN
    RAISE EXCEPTION 'Only the most recent manual name entry can be undone to preserve remainder consistency';
  END IF;

  -- Mark entry as reverted
  UPDATE public.manual_name_entries
  SET is_reverted = TRUE,
      reverted_at = now(),
      revert_reason = left(COALESCE(NULLIF(btrim(p_reason), ''), 'user_undo'), 200)
  WHERE id = v_entry.id
  RETURNING * INTO v_entry;

  -- Revert user counter state back to previous values
  UPDATE public.manual_counter_state
  SET cumulative_names = GREATEST(cumulative_names - v_entry.names_count, 0),
      cumulative_rounds = GREATEST(cumulative_rounds - v_entry.rounds_earned, 0),
      current_remainder = v_entry.previous_remainder,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_state;

  -- If rounds were earned, revert associated chanting_records
  IF v_entry.rounds_earned > 0 THEN
    UPDATE public.chanting_records
    SET is_reverted = TRUE,
        reverted_at = now(),
        revert_reason = left(COALESCE(NULLIF(btrim(p_reason), ''), 'user_undo'), 200)
    WHERE manual_entry_id = v_entry.id AND is_reverted = FALSE;

    -- Session update
    IF v_entry.session_id IS NOT NULL THEN
      UPDATE public.chanting_sessions
      SET rounds_completed = GREATEST(rounds_completed - v_entry.rounds_earned, 0),
          last_activity_at = now()
      WHERE id = v_entry.session_id AND user_id = v_user_id
      RETURNING * INTO v_session;
    END IF;

    -- Sankalpa update
    IF v_entry.sankalpa_id IS NOT NULL THEN
      UPDATE public.sankalpas
      SET completed_rounds = GREATEST(completed_rounds - v_entry.rounds_earned, 0),
          status = CASE WHEN status = 'completed' AND (completed_rounds - v_entry.rounds_earned) < target_rounds THEN 'active' ELSE status END,
          completed_at = CASE WHEN status = 'completed' AND (completed_rounds - v_entry.rounds_earned) < target_rounds THEN NULL ELSE completed_at END,
          updated_at = now()
      WHERE id = v_entry.sankalpa_id AND user_id = v_user_id
      RETURNING * INTO v_sankalpa;
    END IF;

    -- Forward carry recompute
    PERFORM private.recompute_sadhana_forward(v_user_id, v_entry.sadhana_date);
  END IF;

  SELECT * INTO v_daily
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = v_entry.sadhana_date;

  RETURN jsonb_build_object(
    'already_reverted', FALSE,
    'entry', to_jsonb(v_entry),
    'counter_state', to_jsonb(v_state),
    'daily_sadhana', to_jsonb(v_daily),
    'session', to_jsonb(v_session),
    'sankalpa', to_jsonb(v_sankalpa)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_manual_name_entry(UUID, TEXT) TO authenticated;

-- 6. Helper RPC: get_manual_counter_state
CREATE OR REPLACE FUNCTION public.get_manual_counter_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_state public.manual_counter_state;
  v_latest_entry public.manual_name_entries;
  v_active_session public.chanting_sessions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_state
  FROM public.manual_counter_state
  WHERE user_id = v_user_id;

  SELECT * INTO v_latest_entry
  FROM public.manual_name_entries
  WHERE user_id = v_user_id AND is_reverted = FALSE
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO v_active_session
  FROM public.chanting_sessions
  WHERE user_id = v_user_id AND method = 'manual' AND status = 'active'
  ORDER BY last_activity_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'cumulative_names', COALESCE(v_state.cumulative_names, 0),
    'cumulative_rounds', COALESCE(v_state.cumulative_rounds, 0),
    'current_remainder', COALESCE(v_state.current_remainder, 0),
    'last_entry', to_jsonb(v_latest_entry),
    'active_session', to_jsonb(v_active_session)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_manual_counter_state() TO authenticated;
