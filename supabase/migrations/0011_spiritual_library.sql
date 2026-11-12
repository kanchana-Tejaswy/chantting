-- Phase 9 Migration 0011: Spiritual Library, Bookmarks, View History, URL Safety & Admin Governance

-- Extend library_resource_type enum to support books and external learning links
ALTER TYPE public.library_resource_type ADD VALUE IF NOT EXISTS 'book';
ALTER TYPE public.library_resource_type ADD VALUE IF NOT EXISTS 'external_link';

-- Extend public.library_resources with category, creator, duration, licensing, and archiving fields
ALTER TABLE public.library_resources
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'gita_learning'
    CHECK (category IN (
      'gita_learning',
      'krishna_literature',
      'chanting_guidance',
      'video_lecture',
      'devotional_article',
      'external_resource'
    )),
  ADD COLUMN IF NOT EXISTS author_or_speaker TEXT
    CHECK (author_or_speaker IS NULL OR char_length(btrim(author_or_speaker)) BETWEEN 1 AND 160),
  ADD COLUMN IF NOT EXISTS language_code TEXT NOT NULL DEFAULT 'en'
    CHECK (char_length(language_code) BETWEEN 2 AND 16),
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER
    CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 1 AND 2400),
  ADD COLUMN IF NOT EXISTS external_url TEXT
    CHECK (external_url IS NULL OR (external_url ~ '^https?://' AND char_length(external_url) <= 1024)),
  ADD COLUMN IF NOT EXISTS license_name TEXT
    CHECK (license_name IS NULL OR char_length(btrim(license_name)) BETWEEN 2 AND 160),
  ADD COLUMN IF NOT EXISTS copyright_notice TEXT
    CHECK (copyright_notice IS NULL OR char_length(copyright_notice) <= 600),
  ADD COLUMN IF NOT EXISTS attribution_text TEXT
    CHECK (attribution_text IS NULL OR char_length(attribution_text) <= 600),
  ADD COLUMN IF NOT EXISTS is_original_content BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.library_resources
  DROP CONSTRAINT IF EXISTS library_resources_media_url_safe,
  ADD CONSTRAINT library_resources_media_url_safe
    CHECK (media_url IS NULL OR (media_url ~ '^https?://' AND char_length(media_url) <= 1024));

ALTER TABLE public.library_resources
  DROP CONSTRAINT IF EXISTS library_resources_poster_url_safe,
  ADD CONSTRAINT library_resources_poster_url_safe
    CHECK (
      poster_url IS NULL
      OR (
        (poster_url ~ '^https?://' OR (poster_url ~ '^/' AND poster_url !~ '^//'))
        AND char_length(poster_url) <= 1024
      )
    );

CREATE INDEX IF NOT EXISTS library_resources_category_approved_idx
  ON public.library_resources (category, created_at DESC)
  WHERE review_status = 'approved' AND is_archived = FALSE;

CREATE INDEX IF NOT EXISTS library_resources_search_idx
  ON public.library_resources
  USING GIN (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(author_or_speaker, '')
    )
  );

-- Owner-private Library Bookmarks & Saved Resources
CREATE TABLE IF NOT EXISTS public.library_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.library_resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT library_bookmarks_user_resource_unique UNIQUE (user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS library_bookmarks_user_id_idx
  ON public.library_bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS library_bookmarks_resource_id_idx
  ON public.library_bookmarks (resource_id);

ALTER TABLE public.library_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY library_bookmarks_all_own ON public.library_bookmarks
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Owner-private Recently Viewed Library Resources
CREATE TABLE IF NOT EXISTS public.library_view_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.library_resources(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_view_history_user_viewed_idx
  ON public.library_view_history (user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS library_view_history_user_res_viewed_idx
  ON public.library_view_history (user_id, resource_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS library_view_history_resource_id_idx
  ON public.library_view_history (resource_id);

ALTER TABLE public.library_view_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY library_view_history_select_own ON public.library_view_history
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY library_view_history_insert_own ON public.library_view_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY library_view_history_delete_own ON public.library_view_history
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Least-privilege table grants
REVOKE ALL ON public.library_bookmarks, public.library_view_history FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.library_bookmarks TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.library_view_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.library_resources TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Tighten public read policy & enable administrator-only CRUD on library_resources
DROP POLICY IF EXISTS library_resources_select_approved ON public.library_resources;
CREATE POLICY library_resources_select_approved ON public.library_resources
  FOR SELECT TO anon, authenticated
  USING (
    review_status = 'approved'
    AND is_archived = FALSE
    AND (
      source_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.content_sources s
        WHERE s.id = library_resources.source_id
          AND s.review_status = 'approved'
      )
    )
  );

CREATE POLICY library_resources_select_admin ON public.library_resources
  FOR SELECT TO authenticated
  USING ((SELECT private.is_platform_admin()));

CREATE POLICY library_resources_insert_admin ON public.library_resources
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY library_resources_update_admin ON public.library_resources
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_platform_admin()))
  WITH CHECK ((SELECT private.is_platform_admin()));

CREATE POLICY library_resources_delete_admin ON public.library_resources
  FOR DELETE TO authenticated
  USING ((SELECT private.is_platform_admin()));

-- Enforce human review timestamps & immutable CMS audit logging on library_resources
DROP TRIGGER IF EXISTS library_resources_review_metadata ON public.library_resources;
CREATE TRIGGER library_resources_review_metadata
  BEFORE INSERT OR UPDATE ON public.library_resources
  FOR EACH ROW EXECUTE FUNCTION private.enforce_gita_review_metadata();

CREATE OR REPLACE FUNCTION private.audit_library_admin_changes()
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
BEGIN
  IF v_caller IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_json := to_jsonb(NEW);
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_json := to_jsonb(OLD);
  END IF;

  v_target_id := COALESCE(v_new_json ->> 'id', v_old_json ->> 'id');

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
    'library_cms_' || lower(TG_OP),
    'library_resources',
    v_target_id,
    jsonb_strip_nulls(jsonb_build_object(
      'op', TG_OP,
      'review_status', COALESCE(v_new_json ->> 'review_status', v_old_json ->> 'review_status'),
      'is_archived', COALESCE(v_new_json -> 'is_archived', v_old_json -> 'is_archived'),
      'category', COALESCE(v_new_json ->> 'category', v_old_json ->> 'category')
    ))
  );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.audit_library_admin_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS library_resources_audit ON public.library_resources;
CREATE TRIGGER library_resources_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.library_resources
  FOR EACH ROW EXECUTE FUNCTION private.audit_library_admin_changes();

