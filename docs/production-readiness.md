# SMARAN (स्मरण) — Production Readiness & Launch Checklist (Phase 10)

This checklist separates **completed local verification** from **pending live Supabase / production operational checks**. Do not declare the platform production-ready until every live Supabase item below is verified against the target production project.

---

## 1. Verification Status Matrix: Local vs. Live Supabase

| Category | Local Status (`PGlite` / Next.js Test & Build) | Live Supabase / Production Status |
| :--- | :--- | :--- |
| Schema & migrations (`0001`–`0014`) | Verified via `@electric-sql/pglite` real PostgreSQL bootstrap | Pending re-verification after applying `0014_phase10_security_privacy_hardening.sql` |
| RLS policies & column grants | Verified in `tests/db/schema-and-rls.test.ts`, `tests/account/phase10.test.ts`, `tests/security/phase10-security-audit.test.ts` | Pending SQL policy audit on live Supabase database |
| First platform administrator bootstrap | Verified in PGlite admin gate tests | Pending production SQL grant to designated maintainer |
| Environment secrets & key hygiene | Verified `.gitignore` excludes `.env*` and `getServerEnv()` blocks client imports | Pending credential rotation & Vercel production env configuration |
| API rate limiting | Per-instance sliding-window limiter verified in unit tests (`src/lib/security/rate-limit.ts`) | Pending edge/Redis distributed rate limiting (Upstash/Vercel Firewall) for multi-instance scale |
| Backups & rollback runbook | Documented below | Pending enabling/verifying Supabase PITR or scheduled `pg_dump` before launch |
| End-to-end live DB & browser check | Dev build & Vitest suite verified locally | Pending end-to-end QA against live Supabase Auth + Realtime + PostgreSQL |

---

## 2. Database Migrations (`0001`–`0014`)

Apply all migrations in exact numeric order (`0001` through `0011` core/Gita/Library + `0012–0014` Phase 10, auth backfill & security hardening):

1. `0001_core_enums_and_helpers.sql` — Domain enums, `private` schema, `set_updated_at()`, `is_valid_timezone()`.
2. `0002_profiles_and_preferences.sql` — `profiles`, `user_preferences`, `member_directory`, `handle_new_auth_user()`.
3. `0003_sadhana_chanting_and_carry_forward.sql` — `daily_sadhana`, `carry_forward_ledger`, `chanting_sessions`, `chanting_records`.
4. `0004_rooms_and_community.sql` — `rooms`, `room_memberships`, `room_invitations` (SHA-256 hash only), `room_goals`, `room_announcements`, `room_activity_feed`.
5. `0005_bhagavad_gita_and_library.sql` — `content_sources`, `gita_*`, `library_resources`, `learning_collections`.
6. `0006_achievements_notifications_and_audit.sql` — `achievements`, `user_achievements`, `notifications`, `audit_logs`.
7. `0007_rls_policies.sql` — Table-level RLS, least-privilege `REVOKE/GRANT`, `supabase_realtime` publication.
8. `0008_transactional_rpcs.sql` — Locked `SECURITY DEFINER` RPCs (`ensure_my_daily_sadhana`, `record_chanting_round`, `undo_chanting_round`, `resolve_optional_carry_forward`, `redeem_room_invitation`, `update_room_member_role`).
9. `0009_carry_forward_hardening.sql` — Carry-forward edge-case & concurrency hardening.
10. `0010_gita_admin_and_integrity.sql` — `platform_admins`, scripture review constraints & admin audit triggers.
11. `0011_spiritual_library.sql` — Curated library metadata, URL constraints, private bookmarks/view history.
12. `0012_phase10_account_notifications_achievements.sql` — Quiet hours, notification triggers, `evaluate_my_daily_reminder()`, `sync_my_achievements()`, `deactivate_and_scrub_my_account()`.
13. `0013_backfill_existing_auth_users.sql` — Idempotent backfill of `profiles` & `user_preferences` for pre-existing `auth.users`.
14. `0014_phase10_security_privacy_hardening.sql` — Automatic room feed cleanup trigger on sharing revocation/leave, RLS filter on `room_activity_feed`, column `UPDATE` revocation on `profiles.is_deactivated`, URL scheme constraints (`avatar_url`, `action_url`), and hiding deactivated accounts from `member_directory`.

Command using IPv4 Session Pooler (`DATABASE_URL`):
```powershell
npm run db:push
```

---

## 3. Live Supabase RLS Verification Checklist

Run these verification checks in Supabase SQL Editor after applying `0001`–`0014`:

```sql
-- 1. Confirm EVERY table in public schema has RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Confirm private schema functions are not granted to PUBLIC or anon
SELECT routine_schema, routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'private'
  AND grantee IN ('PUBLIC', 'anon');

-- 3. Confirm authenticated cannot update sensitive profile flags directly
SELECT column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND grantee = 'authenticated'
  AND privilege_type = 'UPDATE';
```

Expected results:
- All `public` tables show `rowsecurity = true`.
- `private` functions return 0 unauthorized `PUBLIC` grants (only predicate helpers `is_room_member`, `is_room_admin`, `shares_room_with`, `is_platform_admin` granted to `authenticated`).
- `profiles` `UPDATE` privileges exclude `is_deactivated` and `deletion_requested_at`.

---

## 4. First Platform Administrator Bootstrap

There is **no self-service admin promotion** in the UI or API. After the designated maintainer creates and verifies their account through Supabase Auth:

1. Locate their `auth.users.id` in Supabase Authentication Dashboard (or query `SELECT id, email FROM auth.users WHERE email = 'maintainer@domain.org';`).
2. Run in Supabase SQL Editor (service role):

```sql
INSERT INTO public.platform_admins (user_id, role, notes)
VALUES (
  'REPLACE-WITH-USER-UUID',
  'super_admin',
  'Initial platform administrator bootstrap'
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'super_admin';
```

3. Confirm `/gita/admin` and `/library/admin` unlock strictly for that account and return `403` / unauthorized for standard users.

---

## 5. Required Environment Variables

| Variable | Visibility | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser + server) | Supabase project HTTPS endpoint |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public (browser + server) | Supabase publishable/anon key (never privileged) |
| `SUPABASE_SECRET_KEY` | Server-only (optional for hard `auth.admin.deleteUser` cleanup on account deletion) | Supabase secret/service key — **never** prefix `NEXT_PUBLIC_` |
| `DATABASE_URL` | Server/CLI-only (`scripts/apply-migrations.mjs`) | PostgreSQL connection string for migrations |
| `NEXT_PUBLIC_SITE_URL` | Public/Server (`https://your-domain.org`) | Canonical origin for Auth verification & password-reset redirects |

---

## 6. Previously Exposed Credentials Rotation Procedure

If any database password, API key, or `.env.local` value was ever shared in chat logs, screenshots, or terminals:

1. **Rotate Database Password:** Supabase Dashboard -> Project Settings -> Database -> Reset database password -> update `DATABASE_URL` locally and in deployment secrets.
2. **Rotate API Keys (`publishable` & `secret` / `service_role`):** Supabase Dashboard -> Project Settings -> API -> Roll/regenerate keys -> update `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`.
3. **Rotate Auth JWT Secret (optional full session reset):** Project Settings -> Auth -> JWT Secret (forces re-authentication of all active refresh tokens).
4. **Configure Auth Redirect URLs:** Authentication -> URL Configuration -> set Site URL to `NEXT_PUBLIC_SITE_URL` and add `<origin>/auth/callback` and `<origin>/auth/reset-password` to Redirect URLs.
5. **Redeploy** hosting environment (e.g., Vercel) after secret updates and test `/api/health`.

---

## 7. Backup & Rollback Procedures

1. **Before Production Migrations:** Enable Supabase Point-in-Time Recovery (PITR) or create a verified logical dump:
   ```bash
   pg_dump "$DATABASE_URL" --schema=public --format=custom --file="backup-pre-release-$(date +%F).dump"
   ```
2. **Application Rollback:** Redeploy the previous known-good Next.js git tag/deployment artifact on Vercel; keep additive DB migrations backward-compatible.
3. **Database Rollback:** Restore from Supabase PITR checkpoint or `backup-pre-release-*.dump` in staging first, verify row counts and RLS policies, then promote/restore production.

---

## 8. Live Database Integration Testing Before Launch

Execute on staging/live Supabase prior to public announcement:
- Sign up, verify email confirmation, complete `/onboarding`, record manual & 108-bead Japa rounds across timezone boundaries (`Asia/Kolkata`, `America/New_York`, `UTC`).
- Verify `record_chanting_round` and `undo_chanting_round` reconcile `daily_sadhana` and `room_activity_feed`.
- Test private room invite token redemption, expiration (`expires_at`), revocation, and switching sharing mode from `Full` -> `Private` (confirming shared activity disappears immediately from other room members & Realtime updates).
- Test `/api/account/export` download, global session sign-out (`/api/account/sessions` `scope: "global"`), and full account deletion (`/api/account/delete`) verifying `Former Devotee` scrubbing and `member_directory` removal.
- Test `/api/health` returns `200` and non-admin accounts receive `403` on `/api/gita/admin/*` and `/api/library/admin/*`.

