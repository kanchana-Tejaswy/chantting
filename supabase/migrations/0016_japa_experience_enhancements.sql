-- Phase 2 Migration 0016: Japa Experience Enhancements
-- Adds:
-- 1. Normalized Mantras table (system seeds + user custom mantras)
-- 2. Mantra references on sessions and round records with safe legacy preservation
-- 3. Customizable Chanting Reminders schedule
-- 4. Devotional Session Journal Notes (private per-session reflections)
-- 5. Devotional Ambient & Pace Guidance preferences on user_preferences
-- 6. Updated record_chanting_round RPC supporting mantra tracking

-- 1. Mantras Table
CREATE TABLE IF NOT EXISTS public.mantras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9_-]{2,80}$'),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  sanskrit TEXT NOT NULL CHECK (char_length(btrim(sanskrit)) >= 1),
  transliteration TEXT NOT NULL CHECK (char_length(btrim(transliteration)) >= 1),
  meaning TEXT CHECK (meaning IS NULL OR char_length(meaning) <= 600),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique indexes: system mantras have unique slug; custom mantras are unique per user
CREATE UNIQUE INDEX IF NOT EXISTS mantras_system_slug_idx
  ON public.mantras (slug)
  WHERE user_id IS NULL AND is_system = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS mantras_user_slug_idx
  ON public.mantras (user_id, slug)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mantras_user_system_idx
  ON public.mantras (is_system, user_id, created_at ASC);

-- Trigger for updated_at on mantras
DROP TRIGGER IF EXISTS mantras_set_updated_at ON public.mantras;
CREATE TRIGGER mantras_set_updated_at
  BEFORE UPDATE ON public.mantras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS policies for mantras
ALTER TABLE public.mantras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mantras_select" ON public.mantras;
CREATE POLICY "mantras_select"
  ON public.mantras FOR SELECT
  TO authenticated, anon
  USING (is_system = TRUE OR (user_id IS NOT NULL AND user_id = auth.uid()));

DROP POLICY IF EXISTS "mantras_insert_own" ON public.mantras;
CREATE POLICY "mantras_insert_own"
  ON public.mantras FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_system = FALSE);

DROP POLICY IF EXISTS "mantras_update_own" ON public.mantras;
CREATE POLICY "mantras_update_own"
  ON public.mantras FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_system = FALSE)
  WITH CHECK (user_id = auth.uid() AND is_system = FALSE);

DROP POLICY IF EXISTS "mantras_delete_own" ON public.mantras;
CREATE POLICY "mantras_delete_own"
  ON public.mantras FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_system = FALSE);

GRANT SELECT ON public.mantras TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.mantras TO authenticated;

-- Seed canonical initial mantras
INSERT INTO public.mantras (id, user_id, slug, name, sanskrit, transliteration, meaning, is_system)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'hare-krishna',
    'Hare Krishna Mahāmantra',
    'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे । हरे राम हरे राम राम राम हरे हरे ॥',
    'hare kṛṣṇa hare kṛṣṇa kṛṣṇa kṛṣṇa hare hare / hare rāma hare rāma rāma rāma hare hare',
    'The great chanting for deliverance; invoking the divine internal energy of the Lord (Hare) and the all-attractive Supreme Personality of Godhead (Krishna, Rama).',
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    NULL,
    'pancha-tattva',
    'Pañca-Tattva Mahāmantra',
    'जय श्री कृष्ण चैतन्य प्रभु नित्यानन्द । श्री अद्वैत गदाधर श्रीवासादि गौर भक्त वृन्द ॥',
    'jaya śrī-kṛṣṇa-caitanya prabhu-nityānanda / śrī-advaita gadādhara śrīvāsādi-gaura-bhakta-vṛnda',
    'Obeisance to Sri Chaitanya Mahaprabhu, Lord Nityananda, Sri Advaita Acharya, Gadadhara Pandita, Srivasa Thakura, and all Gaudiya devotees of the Lord.',
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'om-namo-bhagavate',
    'Oṁ Namo Bhagavate Vāsudevāya',
    'ॐ नमो भगवते वासुदेवाय',
    'oṁ namo bhagavate vāsudevāya',
    'Salutations to the Supreme Lord Sri Krishna, the son of Vasudeva, the all-pervading divine truth.',
    TRUE
  )
ON CONFLICT (slug) WHERE user_id IS NULL AND is_system = TRUE
DO UPDATE SET
  name = EXCLUDED.name,
  sanskrit = EXCLUDED.sanskrit,
  transliteration = EXCLUDED.transliteration,
  meaning = EXCLUDED.meaning;

-- 2. Extend user_preferences with preferred mantra, ambient mode, and pace guidance
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS preferred_mantra_id UUID REFERENCES public.mantras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ambient_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ambient_sound_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ambient_sound_volume NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (ambient_sound_volume BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS pace_guidance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pace_seconds_per_bead NUMERIC(4,2) NOT NULL DEFAULT 7.00 CHECK (pace_seconds_per_bead BETWEEN 2 AND 30);

GRANT UPDATE (
  preferred_mantra_id,
  ambient_mode_enabled,
  ambient_sound_enabled,
  ambient_sound_volume,
  pace_guidance_enabled,
  pace_seconds_per_bead
) ON public.user_preferences TO authenticated;

-- Set default preferred_mantra_id to Hare Krishna Mahāmantra for existing preferences if null
UPDATE public.user_preferences
SET preferred_mantra_id = '00000000-0000-0000-0000-000000000001'
WHERE preferred_mantra_id IS NULL;

CREATE INDEX IF NOT EXISTS user_preferences_preferred_mantra_idx
  ON public.user_preferences (preferred_mantra_id);

-- 3. Extend chanting_sessions and chanting_records with mantra references
ALTER TABLE public.chanting_sessions
  ADD COLUMN IF NOT EXISTS mantra_id UUID REFERENCES public.mantras(id) ON DELETE SET NULL;

ALTER TABLE public.chanting_records
  ADD COLUMN IF NOT EXISTS mantra_id UUID REFERENCES public.mantras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chanting_sessions_mantra_idx
  ON public.chanting_sessions (user_id, mantra_id, sadhana_date DESC)
  WHERE mantra_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chanting_records_mantra_idx
  ON public.chanting_records (user_id, mantra_id, sadhana_date DESC)
  WHERE mantra_id IS NOT NULL;

-- Note: Historical records created prior to Nov 13, 2026 retain NULL mantra_id
-- to strictly preserve historical audit immutability without modifying protected rows.

-- 4. Chanting Reminders Table (multi-reminder schedule with days of week)
CREATE TABLE IF NOT EXISTS public.chanting_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 100),
  time_of_day TIME NOT NULL,
  days_of_week SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_type TEXT NOT NULL DEFAULT 'browser' CHECK (reminder_type IN ('browser', 'in_app')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chanting_reminders_user_idx
  ON public.chanting_reminders (user_id, is_enabled, time_of_day ASC);

DROP TRIGGER IF EXISTS chanting_reminders_set_updated_at ON public.chanting_reminders;
CREATE TRIGGER chanting_reminders_set_updated_at
  BEFORE UPDATE ON public.chanting_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chanting_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_select_own" ON public.chanting_reminders;
CREATE POLICY "reminders_select_own"
  ON public.chanting_reminders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reminders_insert_own" ON public.chanting_reminders;
CREATE POLICY "reminders_insert_own"
  ON public.chanting_reminders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reminders_update_own" ON public.chanting_reminders;
CREATE POLICY "reminders_update_own"
  ON public.chanting_reminders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reminders_delete_own" ON public.chanting_reminders;
CREATE POLICY "reminders_delete_own"
  ON public.chanting_reminders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chanting_reminders TO authenticated;

-- 5. Chanting Session Notes / Devotional Journal Table
CREATE TABLE IF NOT EXISTS public.chanting_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chanting_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 5000),
  is_private BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chanting_session_notes_session_unique UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS chanting_session_notes_user_idx
  ON public.chanting_session_notes (user_id, created_at DESC);

DROP TRIGGER IF EXISTS chanting_session_notes_set_updated_at ON public.chanting_session_notes;
CREATE TRIGGER chanting_session_notes_set_updated_at
  BEFORE UPDATE ON public.chanting_session_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chanting_session_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_notes_select_own" ON public.chanting_session_notes;
CREATE POLICY "session_notes_select_own"
  ON public.chanting_session_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "session_notes_insert_own" ON public.chanting_session_notes;
CREATE POLICY "session_notes_insert_own"
  ON public.chanting_session_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "session_notes_update_own" ON public.chanting_session_notes;
CREATE POLICY "session_notes_update_own"
  ON public.chanting_session_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "session_notes_delete_own" ON public.chanting_session_notes;
CREATE POLICY "session_notes_delete_own"
  ON public.chanting_session_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chanting_session_notes TO authenticated;

-- 6. Updated Authoritative record_chanting_round RPC with Mantra Support
DROP FUNCTION IF EXISTS public.record_chanting_round(public.chanting_method, TEXT, UUID, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS public.record_chanting_round(public.chanting_method, TEXT, UUID, TIMESTAMPTZ, UUID, UUID);

CREATE OR REPLACE FUNCTION public.record_chanting_round(
  p_method public.chanting_method,
  p_idempotency_key TEXT,
  p_session_id UUID DEFAULT NULL,
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
  v_existing_record public.chanting_records;
  v_new_record public.chanting_records;
  v_daily public.daily_sadhana;
  v_sankalpa public.sankalpas;
  v_effective_mantra_id UUID := p_mantra_id;
  v_session_record public.chanting_sessions;
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

  -- 2. Optional Session Validation & Mantra Inheritance
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO v_session_record
    FROM public.chanting_sessions
    WHERE id = p_session_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Chanting session not found for current user';
    END IF;

    -- If caller did not provide explicit mantra_id, inherit from session
    IF v_effective_mantra_id IS NULL AND v_session_record.mantra_id IS NOT NULL THEN
      v_effective_mantra_id := v_session_record.mantra_id;
    END IF;
  END IF;

  -- 3. Optional Mantra Validation
  IF v_effective_mantra_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mantras
      WHERE id = v_effective_mantra_id AND (is_system = TRUE OR user_id = v_user_id)
    ) THEN
      RAISE EXCEPTION 'Invalid mantra selected';
    END IF;
  END IF;

  -- 4. Optional Sankalpa Validation & Locking
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

  -- 5. Authoritative Completed-Round Record Insertion
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
    v_effective_mantra_id,
    'synced'
  )
  RETURNING * INTO v_new_record;

  -- 6. Session Progress Update
  IF p_session_id IS NOT NULL THEN
    UPDATE public.chanting_sessions
    SET rounds_completed = rounds_completed + 1,
        current_bead_count = CASE WHEN method = 'japa_mala' THEN 0 ELSE current_bead_count END,
        mantra_id = COALESCE(mantra_id, v_effective_mantra_id),
        last_activity_at = now()
    WHERE id = p_session_id AND user_id = v_user_id;
  END IF;

  -- 7. Sankalpa Progress Update (if associated)
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

  -- 8. Authoritative Daily & Forward Carry-Forward Recalculation
  PERFORM private.recompute_sadhana_forward(v_user_id, v_sadhana_date);

  SELECT * INTO v_daily
  FROM public.daily_sadhana
  WHERE user_id = v_user_id AND sadhana_date = v_sadhana_date;

  -- 9. Idempotent Sādhana Notifications
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
        'target_rounds', v_sankalpa.target_rounds
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

GRANT EXECUTE ON FUNCTION public.record_chanting_round(public.chanting_method, TEXT, UUID, TIMESTAMPTZ, UUID, UUID) TO authenticated;
