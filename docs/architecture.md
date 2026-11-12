# SMARAN (स्मरण) — System Architecture & Foundation

> *Remember Him. Stay Connected.*

## 1. Core Philosophy & Non-Profit Constitution

- **Mission:** Support consistent personal chanting (*sādhana*), authentic *Bhagavad Gītā* study, and respectful devotional communities without monetizing devotion.
- **Architectural guardrails:**
  - No paywalls for scripture, chanting tracking, rooms, or consistency insights.
  - No spiritual superiority metrics or mandatory competitive leaderboards.
  - Conservative privacy defaults: personal chanting records are private unless explicitly shared per room.
  - Database-enforced integrity: never trust client-side validation alone for counts, balances, permissions, or content attribution.

---

## 2. Technology Selection & Justification

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **App Framework** | **Next.js 16 (App Router) + React 19 + TypeScript** | Server Components keep scripture & library pages fast, SEO-friendly, and light on mobile; Client Islands isolate zero-latency chanting controls; route-level splitting keeps heavy landing/Veo 3 media off chanting views. |
| **Styling & UI** | **Tailwind CSS v4 + CSS Design Tokens + Radix UI (Phase 2)** | Deterministic Vrindavan/Krishna palette with accessible contrast, Devanagari/IAST font loading (`next/font`), and WCAG-compliant keyboard/screen-reader primitives. |
| **Database & Auth** | **PostgreSQL (Supabase) + `@supabase/supabase-js` + `@supabase/ssr`** | Database acts as the single source of truth with Row Level Security (RLS), atomic PL/pgSQL RPCs, Supabase Auth, and Supabase Realtime for Chanting Rooms. |
| **Validation** | **Zod** | Shared strict input validation at server boundaries and client forms. |
| **Testing** | **Vitest + `@electric-sql/pglite`** | Executes real PostgreSQL migrations, constraints, RLS policies, and concurrent carry-forward transactions in Node.js with zero Docker dependency. |
| **Deployment** | **Vercel + Supabase** | Predictable free/low-cost scaling suited to a non-profit platform with portable standard PostgreSQL SQL migrations. |

---

## 3. Database Architecture & Invariants

All SQL migrations reside in `supabase/migrations/`:

1. **`0001_core_enums_and_helpers.sql`**: Domain enums (`carry_forward_policy`, `chanting_method`, `session_status`, `day_sadhana_status`, `room_visibility`, `room_member_role`, `room_share_mode`, `content_review_status`, `feedback_status`, `library_resource_type`, `notification_type`), private schema for internal `SECURITY DEFINER` helpers, `set_updated_at()` trigger, and `is_valid_timezone()` IANA check.
2. **`0002_profiles_and_preferences.sql`**: `profiles` (1:1 with `auth.users`), `user_preferences` (conservative privacy defaults: `public_profile_enabled = false`, `default_room_share_mode = 'completion_only'`, `share_streak_in_rooms = false`), and `handle_new_auth_user()` trigger.
3. **`0003_sadhana_chanting_and_carry_forward.sql`**:
   - `daily_sadhana`: Stores `original_daily_target`, `previous_pending_balance`, `effective_daily_target`, `completed_rounds`, `remaining_balance`, and `extra_rounds` separately per `(user_id, sadhana_date)`.
   - DB `CHECK` constraints enforce `remaining_balance = GREATEST(effective_daily_target - completed_rounds, 0)` and `extra_rounds = GREATEST(completed_rounds - effective_daily_target, 0)`.
   - `carry_forward_ledger`: Immutable day-to-day carry-forward audit records ensuring unfinished rounds are never silently erased.
   - `chanting_sessions`: Tracks active/paused/completed sessions (`current_bead_count` bounded `0..107` so partial Japa Mala beads never count as completed rounds) and `client_session_key` for recovery.
   - `chanting_records`: Atomic round log with `UNIQUE (user_id, idempotency_key)` to prevent duplicate submissions and audited `is_reverted` undo metadata.
4. **`0004_rooms_and_community.sql`**: `rooms`, `room_memberships`, `room_invitations` (SHA-256 `token_hash` only), `room_goals`, `room_announcements`, and `room_activity_feed` (consented summaries only).
5. **`0005_bhagavad_gita_and_library.sql`**: `content_sources` (licensing & attribution), `gita_chapters`, `gita_verses` (Devanagari & IAST), `gita_translations` (attributed), `gita_explanations` (explicit `is_ai_assisted` + human review enforcement constraint), `gita_bookmarks`, `gita_notes`, `gita_reading_history`, `learning_collections`, `learning_collection_items`, `content_feedback`, and `library_resources`.
6. **`0006_achievements_notifications_and_audit.sql`**: `achievements`, `user_achievements`, `notifications`, and immutable `audit_logs`.
7. **`0007_rls_policies.sql`**: RLS enabled and forced where appropriate on all `public` tables using `(SELECT auth.uid())` caching, `TO authenticated`/`TO anon` role scoping, `WITH CHECK` ownership guards on updates, and `security_invoker = true` public views.
8. **`0008_transactional_rpcs.sql`**: Transaction-safe `SECURITY DEFINER` RPCs using `pg_advisory_xact_lock` per user for multi-device serialization (`get_or_initialize_daily_sadhana`, `record_chanting_round`, `undo_chanting_round`, `redeem_room_invitation`), with `EXECUTE` restricted to `authenticated` only.

---

## 4. Security & Concurrency Model

- **Multi-device concurrency:** Round recording and day rollover acquire a per-user transaction-level PostgreSQL advisory lock (`pg_advisory_xact_lock`), serialize daily initialization, deduplicate retries via `(user_id, idempotency_key)`, and recalculate balances atomically inside one transaction.
- **Privacy boundaries:** `daily_sadhana`, `chanting_sessions`, `chanting_records`, and `carry_forward_ledger` allow `SELECT/INSERT/UPDATE` strictly for `user_id = (SELECT auth.uid())`. Room owners and admins cannot query or alter another member's private chanting history.
- **Secrets hygiene:** Browser clients receive only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SECRET_KEY` and `DATABASE_URL` remain strictly server-side and excluded from Git via `.gitignore`.

