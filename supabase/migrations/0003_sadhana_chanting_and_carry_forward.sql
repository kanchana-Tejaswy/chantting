-- Phase 1 Migration 0003: Daily Sadhana, Chanting Sessions, Round Records, and Carry-Forward Ledger
-- Guarantees exact separation of carry-forward components, idempotency, and partial-bead isolation.

CREATE TABLE IF NOT EXISTS public.daily_sadhana (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sadhana_date DATE NOT NULL,
  timezone_snapshot TEXT NOT NULL CHECK (public.is_valid_timezone(timezone_snapshot)),
  -- Separate persisted carry-forward fields (Module C)
  original_daily_target INTEGER NOT NULL CHECK (original_daily_target BETWEEN 1 AND 192),
  previous_pending_balance INTEGER NOT NULL DEFAULT 0 CHECK (previous_pending_balance >= 0),
  effective_daily_target INTEGER NOT NULL CHECK (effective_daily_target >= 1),
  completed_rounds INTEGER NOT NULL DEFAULT 0 CHECK (completed_rounds >= 0),
  remaining_balance INTEGER NOT NULL CHECK (remaining_balance >= 0),
  extra_rounds INTEGER NOT NULL DEFAULT 0 CHECK (extra_rounds >= 0),
  policy_applied public.carry_forward_policy NOT NULL DEFAULT 'automatic',
  carry_forward_accepted BOOLEAN,
  day_status public.day_sadhana_status NOT NULL DEFAULT 'scheduled',
  has_activity BOOLEAN NOT NULL DEFAULT FALSE,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_sadhana_user_date_unique UNIQUE (user_id, sadhana_date),
  CONSTRAINT daily_sadhana_remaining_math CHECK (
    remaining_balance = GREATEST(effective_daily_target - completed_rounds, 0)
  ),
  CONSTRAINT daily_sadhana_extra_math CHECK (
    extra_rounds = GREATEST(completed_rounds - effective_daily_target, 0)
  ),
  CONSTRAINT daily_sadhana_automatic_target_math CHECK (
    policy_applied <> 'automatic'
    OR effective_daily_target = original_daily_target + previous_pending_balance
  )
);

CREATE INDEX IF NOT EXISTS daily_sadhana_user_date_desc_idx
  ON public.daily_sadhana (user_id, sadhana_date DESC);

-- Immutable ledger of day-to-day carry-forward transitions
CREATE TABLE IF NOT EXISTS public.carry_forward_ledger (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  policy_applied public.carry_forward_policy NOT NULL,
  source_remaining_balance INTEGER NOT NULL CHECK (source_remaining_balance >= 0),
  carried_amount INTEGER NOT NULL CHECK (carried_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT carry_forward_ledger_unique_transition UNIQUE (user_id, from_date, to_date),
  CONSTRAINT carry_forward_ledger_chronological CHECK (to_date > from_date),
  CONSTRAINT carry_forward_ledger_carried_bounds CHECK (carried_amount <= source_remaining_balance)
);

CREATE INDEX IF NOT EXISTS carry_forward_ledger_user_to_date_idx
  ON public.carry_forward_ledger (user_id, to_date DESC);

-- Chanting sessions (manual & 108-bead Digital Japa Mala)
-- Partial beads (0..107) NEVER count as completed rounds until 108th bead completes via RPC.
CREATE TABLE IF NOT EXISTS public.chanting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sadhana_date DATE NOT NULL,
  method public.chanting_method NOT NULL,
  status public.session_status NOT NULL DEFAULT 'active',
  current_bead_count SMALLINT NOT NULL DEFAULT 0 CHECK (current_bead_count BETWEEN 0 AND 107),
  rounds_completed INTEGER NOT NULL DEFAULT 0 CHECK (rounds_completed >= 0),
  client_session_key TEXT NOT NULL CHECK (char_length(btrim(client_session_key)) BETWEEN 8 AND 128),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chanting_sessions_user_client_key_unique UNIQUE (user_id, client_session_key)
);

CREATE INDEX IF NOT EXISTS chanting_sessions_user_status_idx
  ON public.chanting_sessions (user_id, status, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS chanting_sessions_user_date_idx
  ON public.chanting_sessions (user_id, sadhana_date DESC);

-- Atomic completed round records (idempotent + audited undo)
CREATE TABLE IF NOT EXISTS public.chanting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chanting_sessions(id) ON DELETE SET NULL,
  sadhana_date DATE NOT NULL,
  method public.chanting_method NOT NULL,
  round_delta SMALLINT NOT NULL DEFAULT 1 CHECK (round_delta = 1),
  idempotency_key TEXT NOT NULL CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 128),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_recorded_at TIMESTAMPTZ,
  timezone_snapshot TEXT NOT NULL CHECK (public.is_valid_timezone(timezone_snapshot)),
  is_reverted BOOLEAN NOT NULL DEFAULT FALSE,
  reverted_at TIMESTAMPTZ,
  revert_reason TEXT CHECK (revert_reason IS NULL OR char_length(revert_reason) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chanting_records_user_idempotency_unique UNIQUE (user_id, idempotency_key),
  CONSTRAINT chanting_records_revert_consistency CHECK (
    (is_reverted = FALSE AND reverted_at IS NULL)
    OR (is_reverted = TRUE AND reverted_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS chanting_records_user_date_active_idx
  ON public.chanting_records (user_id, sadhana_date DESC)
  WHERE is_reverted = FALSE;

CREATE INDEX IF NOT EXISTS chanting_records_session_id_idx
  ON public.chanting_records (session_id)
  WHERE session_id IS NOT NULL;

DROP TRIGGER IF EXISTS daily_sadhana_set_updated_at ON public.daily_sadhana;
CREATE TRIGGER daily_sadhana_set_updated_at
  BEFORE UPDATE ON public.daily_sadhana
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS chanting_sessions_set_updated_at ON public.chanting_sessions;
CREATE TRIGGER chanting_sessions_set_updated_at
  BEFORE UPDATE ON public.chanting_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

