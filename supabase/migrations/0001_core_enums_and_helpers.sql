-- Phase 1 Migration 0001: Core schemas, domain enums, and reusable helper functions
-- Compatible with PostgreSQL 15+ / Supabase

CREATE SCHEMA IF NOT EXISTS private;

-- Domain enums
DO $$ BEGIN
  CREATE TYPE public.carry_forward_policy AS ENUM (
    'automatic',
    'optional',
    'fresh_daily',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.chanting_method AS ENUM (
    'manual',
    'japa_mala'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM (
    'active',
    'paused',
    'completed',
    'abandoned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.day_sadhana_status AS ENUM (
    'scheduled',
    'in_progress',
    'target_met',
    'carried_forward',
    'missing_data'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.room_visibility AS ENUM (
    'public',
    'private'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.room_member_role AS ENUM (
    'owner',
    'admin',
    'member'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.room_share_mode AS ENUM (
    'full',
    'completion_only',
    'private'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.content_review_status AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'needs_correction'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.feedback_status AS ENUM (
    'open',
    'reviewing',
    'resolved',
    'declined'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.library_resource_type AS ENUM (
    'article',
    'video',
    'devotional_reading',
    'chanting_guidance',
    'study_guide'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'sadhana_reminder',
    'carry_forward_notice',
    'room_invite',
    'room_announcement',
    'room_milestone',
    'content_feedback_update',
    'system_notice'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Validate IANA timezone strings against pg_timezone_names
CREATE OR REPLACE FUNCTION public.is_valid_timezone(tz TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT tz IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM pg_catalog.pg_timezone_names
      WHERE name = tz
    );
$$;

