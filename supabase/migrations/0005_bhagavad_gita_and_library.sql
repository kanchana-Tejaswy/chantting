-- Phase 1 Migration 0005: Bhagavad Gita Knowledge Centre & Spiritual Library
-- Strict separation of original Sanskrit, attributed translations, and human-reviewed explanations.

CREATE TABLE IF NOT EXISTS public.content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,64}[a-z0-9]$'),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  author_or_translator TEXT NOT NULL CHECK (char_length(btrim(author_or_translator)) BETWEEN 2 AND 160),
  tradition_or_lineage TEXT,
  license_name TEXT NOT NULL,
  license_url TEXT,
  attribution_text TEXT NOT NULL,
  source_url TEXT,
  review_status public.content_review_status NOT NULL DEFAULT 'pending_review',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_sources_reviewed_by_idx ON public.content_sources (reviewed_by);

CREATE TABLE IF NOT EXISTS public.gita_chapters (
  chapter_number SMALLINT PRIMARY KEY CHECK (chapter_number BETWEEN 1 AND 18),
  sanskrit_title TEXT NOT NULL,
  transliteration_title TEXT NOT NULL,
  english_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  verse_count SMALLINT NOT NULL CHECK (verse_count >= 1),
  theme_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gita_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_number SMALLINT NOT NULL REFERENCES public.gita_chapters(chapter_number) ON DELETE CASCADE,
  verse_number SMALLINT NOT NULL CHECK (verse_number >= 1),
  verse_ref TEXT GENERATED ALWAYS AS (chapter_number::text || '.' || verse_number::text) STORED,
  sanskrit_devanagari TEXT NOT NULL,
  transliteration_iast TEXT NOT NULL,
  word_by_word JSONB,
  source_id UUID REFERENCES public.content_sources(id) ON DELETE RESTRICT,
  review_status public.content_review_status NOT NULL DEFAULT 'pending_review',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gita_verses_chapter_verse_unique UNIQUE (chapter_number, verse_number)
);

CREATE INDEX IF NOT EXISTS gita_verses_source_id_idx ON public.gita_verses (source_id);
CREATE INDEX IF NOT EXISTS gita_verses_reviewed_by_idx ON public.gita_verses (reviewed_by);
CREATE INDEX IF NOT EXISTS gita_verses_search_idx ON public.gita_verses
  USING GIN (to_tsvector('english', coalesce(transliteration_iast, '') || ' ' || coalesce(verse_ref, '')));

-- Attributed translations separated from canonical Sanskrit
CREATE TABLE IF NOT EXISTS public.gita_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_id UUID NOT NULL REFERENCES public.gita_verses(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.content_sources(id) ON DELETE RESTRICT,
  language_code TEXT NOT NULL DEFAULT 'en' CHECK (char_length(language_code) BETWEEN 2 AND 16),
  translation_text TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  review_status public.content_review_status NOT NULL DEFAULT 'pending_review',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gita_translations_unique_source UNIQUE (verse_id, source_id, language_code)
);

CREATE INDEX IF NOT EXISTS gita_translations_verse_id_idx ON public.gita_translations (verse_id);
CREATE INDEX IF NOT EXISTS gita_translations_source_id_idx ON public.gita_translations (source_id);
CREATE INDEX IF NOT EXISTS gita_translations_reviewed_by_idx ON public.gita_translations (reviewed_by);
CREATE INDEX IF NOT EXISTS gita_translations_fts_idx ON public.gita_translations
  USING GIN (to_tsvector('english', translation_text));

-- Verse explanations with explicit AI-assistance & human-review enforcement
CREATE TABLE IF NOT EXISTS public.gita_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_id UUID NOT NULL REFERENCES public.gita_verses(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.content_sources(id) ON DELETE RESTRICT,
  title TEXT CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 1 AND 160),
  explanation_text TEXT NOT NULL,
  is_ai_assisted BOOLEAN NOT NULL DEFAULT FALSE,
  review_status public.content_review_status NOT NULL DEFAULT 'pending_review',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gita_explanations_ai_human_review CHECK (
    NOT (is_ai_assisted = TRUE AND review_status = 'approved' AND reviewed_by IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS gita_explanations_verse_id_idx ON public.gita_explanations (verse_id);
CREATE INDEX IF NOT EXISTS gita_explanations_source_id_idx ON public.gita_explanations (source_id);
CREATE INDEX IF NOT EXISTS gita_explanations_reviewed_by_idx ON public.gita_explanations (reviewed_by);

-- Personal study features
CREATE TABLE IF NOT EXISTS public.gita_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verse_id UUID NOT NULL REFERENCES public.gita_verses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gita_bookmarks_user_verse_unique UNIQUE (user_id, verse_id)
);

CREATE INDEX IF NOT EXISTS gita_bookmarks_user_id_idx ON public.gita_bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gita_bookmarks_verse_id_idx ON public.gita_bookmarks (verse_id);

CREATE TABLE IF NOT EXISTS public.gita_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verse_id UUID NOT NULL REFERENCES public.gita_verses(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL CHECK (char_length(btrim(note_text)) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gita_notes_user_verse_unique UNIQUE (user_id, verse_id)
);

CREATE INDEX IF NOT EXISTS gita_notes_user_id_idx ON public.gita_notes (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS gita_notes_verse_id_idx ON public.gita_notes (verse_id);

CREATE TABLE IF NOT EXISTS public.gita_reading_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verse_id UUID NOT NULL REFERENCES public.gita_verses(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gita_reading_history_user_read_idx ON public.gita_reading_history (user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS gita_reading_history_verse_id_idx ON public.gita_reading_history (verse_id);

CREATE TABLE IF NOT EXISTS public.learning_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  is_curated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_collections_user_id_idx ON public.learning_collections (user_id);

CREATE TABLE IF NOT EXISTS public.learning_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.learning_collections(id) ON DELETE CASCADE,
  verse_id UUID NOT NULL REFERENCES public.gita_verses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT learning_collection_items_unique UNIQUE (collection_id, verse_id)
);

CREATE INDEX IF NOT EXISTS learning_collection_items_collection_idx ON public.learning_collection_items (collection_id, sort_order);
CREATE INDEX IF NOT EXISTS learning_collection_items_verse_idx ON public.learning_collection_items (verse_id);

-- Content corrections & feedback workflow
CREATE TABLE IF NOT EXISTS public.content_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verse_id UUID REFERENCES public.gita_verses(id) ON DELETE CASCADE,
  translation_id UUID REFERENCES public.gita_translations(id) ON DELETE CASCADE,
  explanation_id UUID REFERENCES public.gita_explanations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('sanskrit_typo', 'transliteration', 'translation_accuracy', 'attribution', 'respectful_tone', 'other')),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 5 AND 2000),
  status public.feedback_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_feedback_target_present CHECK (
    verse_id IS NOT NULL OR translation_id IS NOT NULL OR explanation_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS content_feedback_submitted_by_idx ON public.content_feedback (submitted_by);
CREATE INDEX IF NOT EXISTS content_feedback_verse_id_idx ON public.content_feedback (verse_id);
CREATE INDEX IF NOT EXISTS content_feedback_translation_id_idx ON public.content_feedback (translation_id);
CREATE INDEX IF NOT EXISTS content_feedback_explanation_id_idx ON public.content_feedback (explanation_id);
CREATE INDEX IF NOT EXISTS content_feedback_resolved_by_idx ON public.content_feedback (resolved_by);

-- Spiritual Library curated resources (Module G)
CREATE TABLE IF NOT EXISTS public.library_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,80}[a-z0-9]$'),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  summary TEXT NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 5 AND 600),
  resource_type public.library_resource_type NOT NULL,
  body_markdown TEXT,
  media_url TEXT,
  poster_url TEXT,
  source_id UUID REFERENCES public.content_sources(id) ON DELETE RESTRICT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  review_status public.content_review_status NOT NULL DEFAULT 'pending_review',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_resources_source_id_idx ON public.library_resources (source_id);
CREATE INDEX IF NOT EXISTS library_resources_reviewed_by_idx ON public.library_resources (reviewed_by);
CREATE INDEX IF NOT EXISTS library_resources_approved_type_idx ON public.library_resources (resource_type, created_at DESC)
  WHERE review_status = 'approved';

-- Updated_at triggers
DROP TRIGGER IF EXISTS content_sources_set_updated_at ON public.content_sources;
CREATE TRIGGER content_sources_set_updated_at BEFORE UPDATE ON public.content_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gita_chapters_set_updated_at ON public.gita_chapters;
CREATE TRIGGER gita_chapters_set_updated_at BEFORE UPDATE ON public.gita_chapters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gita_verses_set_updated_at ON public.gita_verses;
CREATE TRIGGER gita_verses_set_updated_at BEFORE UPDATE ON public.gita_verses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gita_translations_set_updated_at ON public.gita_translations;
CREATE TRIGGER gita_translations_set_updated_at BEFORE UPDATE ON public.gita_translations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gita_explanations_set_updated_at ON public.gita_explanations;
CREATE TRIGGER gita_explanations_set_updated_at BEFORE UPDATE ON public.gita_explanations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gita_notes_set_updated_at ON public.gita_notes;
CREATE TRIGGER gita_notes_set_updated_at BEFORE UPDATE ON public.gita_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS learning_collections_set_updated_at ON public.learning_collections;
CREATE TRIGGER learning_collections_set_updated_at BEFORE UPDATE ON public.learning_collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS content_feedback_set_updated_at ON public.content_feedback;
CREATE TRIGGER content_feedback_set_updated_at BEFORE UPDATE ON public.content_feedback FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS library_resources_set_updated_at ON public.library_resources;
CREATE TRIGGER library_resources_set_updated_at BEFORE UPDATE ON public.library_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

