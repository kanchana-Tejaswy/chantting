-- Migration 0018: Multilingual Support for 23 Scheduled Indian Languages + English
-- Safe, idempotent migration to ensure preferred_language column and index exist.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

-- Add index on preferred_language for fast locale querying and analytics
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language
  ON public.profiles (preferred_language);

-- Comment describing the 23 supported ISO/IETF language codes
COMMENT ON COLUMN public.profiles.preferred_language IS 
  'User preferred UI language: en, as, bn, brx, doi, gu, hi, kn, ks, kok, mai, ml, mni, mr, ne, or, pa, sa, sat, sd, ta, te, ur';
