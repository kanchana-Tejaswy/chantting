-- Phase 8 Migration 0010: Scripture Content Admin Governance, Attribution Integrity & Audit Trails

-- 1. Authorized Platform / Scripture Administrators (DB is single source of truth; no self-promotion)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'scripture_admin' CHECK (role IN ('super_admin', 'scripture_admin')),
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 400),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_admins_granted_by_idx
  ON public.platform_admins (granted_by);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.platform_admins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;

CREATE POLICY platform_admins_select_own ON public.platform_admins
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 2. Private admin predicate helper (SECURITY DEFINER, non-spoofable, checks caller auth.uid())
CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('super_admin', 'scripture_admin')
  );
$$;

REVOKE ALL ON FUNCTION private.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO authenticated;

-- 3. Tighten public read policies so child translations/explanations/verses never leak if verse or source is unpublished
DROP POLICY IF EXISTS gita_verses_select_approved ON public.gita_verses;
CREATE POLICY gita_verses_select_approved ON public.gita_verses
  FOR SELECT TO anon, authenticated
  USING (
    review_status = 'approved'
    AND (
      source_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.content_sources s
        WHERE s.id = gita_verses.source_id
          AND s.review_status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS gita_translations_select_approved ON public.gita_translations;
CREATE POLICY gita_translations_select_approved ON public.gita_translations
  FOR SELECT TO anon, authenticated
  USING (
    review_status = 'approved'
    AND EXISTS (
      SELECT 1
      FROM public.gita_verses v
      JOIN public.content_sources s ON s.id = gita_translations.source_id
      WHERE v.id = gita_translations.verse_id
        AND v.review_status = 'approved'
        AND s.review_status = 'approved'
    )
  );

DROP POLICY IF EXISTS gita_explanations_select_approved ON public.gita_explanations;
CREATE POLICY gita_explanations_select_approved ON public.gita_explanations
  FOR SELECT TO anon, authenticated
  USING (
    review_status = 'approved'
    AND NOT (is_ai_assisted = TRUE AND reviewed_by IS NULL)
    AND EXISTS (
      SELECT 1
      FROM public.gita_verses v
      WHERE v.id = gita_explanations.verse_id
        AND v.review_status = 'approved'
    )
    AND (
      source_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.content_sources s
        WHERE s.id = gita_explanations.source_id
          AND s.review_status = 'approved'
      )
    )
  );

-- 4. Administrator-only Content Management RLS policies & grants
GRANT INSERT, UPDATE, DELETE ON
  public.content_sources,
  public.gita_chapters,
  public.gita_verses,
  public.gita_translations,
  public.gita_explanations
TO authenticated;

GRANT UPDATE (status, resolution_notes, resolved_by, resolved_at)
  ON public.content_feedback TO authenticated;

CREATE POLICY content_sources_select_admin ON public.content_sources
  FOR SELECT TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY content_sources_insert_admin ON public.content_sources
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY content_sources_update_admin ON public.content_sources
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_platform_admin()))
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY content_sources_delete_admin ON public.content_sources
  FOR DELETE TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY gita_chapters_insert_admin ON public.gita_chapters
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY gita_chapters_update_admin ON public.gita_chapters
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_platform_admin()))
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY gita_chapters_delete_admin ON public.gita_chapters
  FOR DELETE TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY gita_verses_select_admin ON public.gita_verses
  FOR SELECT TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY gita_verses_insert_admin ON public.gita_verses
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY gita_verses_update_admin ON public.gita_verses
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_platform_admin()))
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY gita_verses_delete_admin ON public.gita_verses
  FOR DELETE TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY gita_translations_select_admin ON public.gita_translations
  FOR SELECT TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY gita_translations_insert_admin ON public.gita_translations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY gita_translations_update_admin ON public.gita_translations
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_platform_admin()))
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY gita_translations_delete_admin ON public.gita_translations
  FOR DELETE TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY gita_explanations_select_admin ON public.gita_explanations
  FOR SELECT TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY gita_explanations_insert_admin ON public.gita_explanations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY gita_explanations_update_admin ON public.gita_explanations
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_platform_admin()))
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY gita_explanations_delete_admin ON public.gita_explanations
  FOR DELETE TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY content_feedback_select_admin ON public.content_feedback
  FOR SELECT TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY content_feedback_update_admin ON public.content_feedback
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_platform_admin()))
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY audit_logs_select_platform_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT private.is_platform_admin()));

-- 5. Human-review metadata & immutable CMS audit triggers
CREATE OR REPLACE FUNCTION private.enforce_gita_review_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := (SELECT auth.uid());
BEGIN
  IF NEW.review_status = 'approved' THEN
    IF NEW.reviewed_by IS NULL AND v_caller IS NOT NULL THEN
      NEW.reviewed_by := v_caller;
    END IF;
    IF NEW.reviewed_at IS NULL AND NEW.reviewed_by IS NOT NULL THEN
      NEW.reviewed_at := now();
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.review_status <> 'approved' THEN
    NEW.reviewed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_gita_review_metadata() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS content_sources_review_metadata ON public.content_sources;
CREATE TRIGGER content_sources_review_metadata
  BEFORE INSERT OR UPDATE ON public.content_sources
  FOR EACH ROW EXECUTE FUNCTION private.enforce_gita_review_metadata();

DROP TRIGGER IF EXISTS gita_verses_review_metadata ON public.gita_verses;
CREATE TRIGGER gita_verses_review_metadata
  BEFORE INSERT OR UPDATE ON public.gita_verses
  FOR EACH ROW EXECUTE FUNCTION private.enforce_gita_review_metadata();

DROP TRIGGER IF EXISTS gita_translations_review_metadata ON public.gita_translations;
CREATE TRIGGER gita_translations_review_metadata
  BEFORE INSERT OR UPDATE ON public.gita_translations
  FOR EACH ROW EXECUTE FUNCTION private.enforce_gita_review_metadata();

DROP TRIGGER IF EXISTS gita_explanations_review_metadata ON public.gita_explanations;
CREATE TRIGGER gita_explanations_review_metadata
  BEFORE INSERT OR UPDATE ON public.gita_explanations
  FOR EACH ROW EXECUTE FUNCTION private.enforce_gita_review_metadata();

CREATE OR REPLACE FUNCTION private.enforce_content_feedback_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := (SELECT auth.uid());
BEGIN
  IF NEW.status IN ('resolved', 'declined') THEN
    NEW.resolved_by := COALESCE(NEW.resolved_by, v_caller);
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSIF NEW.status IN ('open', 'reviewing') THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_content_feedback_resolution() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS content_feedback_resolution_metadata ON public.content_feedback;
CREATE TRIGGER content_feedback_resolution_metadata
  BEFORE UPDATE ON public.content_feedback
  FOR EACH ROW EXECUTE FUNCTION private.enforce_content_feedback_resolution();

CREATE OR REPLACE FUNCTION private.audit_gita_admin_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := (SELECT auth.uid());
  v_new_json JSONB;
  v_old_json JSONB;
  v_target_id TEXT;
  v_review_status TEXT := NULL;
BEGIN
  IF v_caller IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'content_feedback' AND TG_OP = 'INSERT' THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_json := to_jsonb(NEW);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_json := to_jsonb(OLD);
  END IF;

  v_target_id := COALESCE(
    v_new_json ->> 'id',
    v_old_json ->> 'id',
    v_new_json ->> 'chapter_number',
    v_old_json ->> 'chapter_number'
  );

  IF TG_TABLE_NAME IN ('content_sources', 'gita_verses', 'gita_translations', 'gita_explanations') THEN
    IF TG_OP = 'DELETE' THEN
      v_review_status := v_old_json ->> 'review_status';
    ELSE
      v_review_status := v_new_json ->> 'review_status';
    END IF;
  ELSIF TG_TABLE_NAME = 'content_feedback' THEN
    v_review_status := v_new_json ->> 'status';
  END IF;

  INSERT INTO public.audit_logs (
    actor_user_id,
    room_id,
    action,
    target_table,
    target_id,
    metadata
  ) VALUES (
    v_caller,
    NULL,
    'gita_cms_' || lower(TG_OP),
    TG_TABLE_NAME,
    v_target_id,
    jsonb_strip_nulls(jsonb_build_object(
      'op', TG_OP,
      'review_status', v_review_status
    ))
  );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.audit_gita_admin_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS content_sources_audit ON public.content_sources;
CREATE TRIGGER content_sources_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.content_sources
  FOR EACH ROW EXECUTE FUNCTION private.audit_gita_admin_changes();

DROP TRIGGER IF EXISTS gita_chapters_audit ON public.gita_chapters;
CREATE TRIGGER gita_chapters_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.gita_chapters
  FOR EACH ROW EXECUTE FUNCTION private.audit_gita_admin_changes();

DROP TRIGGER IF EXISTS gita_verses_audit ON public.gita_verses;
CREATE TRIGGER gita_verses_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.gita_verses
  FOR EACH ROW EXECUTE FUNCTION private.audit_gita_admin_changes();

DROP TRIGGER IF EXISTS gita_translations_audit ON public.gita_translations;
CREATE TRIGGER gita_translations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.gita_translations
  FOR EACH ROW EXECUTE FUNCTION private.audit_gita_admin_changes();

DROP TRIGGER IF EXISTS gita_explanations_audit ON public.gita_explanations;
CREATE TRIGGER gita_explanations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.gita_explanations
  FOR EACH ROW EXECUTE FUNCTION private.audit_gita_admin_changes();

DROP TRIGGER IF EXISTS content_feedback_audit ON public.content_feedback;
CREATE TRIGGER content_feedback_audit
  AFTER UPDATE ON public.content_feedback
  FOR EACH ROW EXECUTE FUNCTION private.audit_gita_admin_changes();

-- 6. Performance indexes for verse reading, chapter progress, and admin moderation
CREATE INDEX IF NOT EXISTS gita_verses_approved_chapter_idx
  ON public.gita_verses (chapter_number, verse_number)
  WHERE review_status = 'approved';

CREATE INDEX IF NOT EXISTS gita_reading_history_user_verse_idx
  ON public.gita_reading_history (user_id, verse_id, read_at DESC);

CREATE INDEX IF NOT EXISTS content_feedback_status_created_idx
  ON public.content_feedback (status, created_at DESC);
