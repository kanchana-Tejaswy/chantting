# KRISHNA SĀDHANA

A standalone, non-profit devotional technology platform dedicated to consistent Krishna chanting (*sādhana*), authentic *Bhagavad Gītā* study, and respectful spiritual communities.

## Phase 1 Foundation

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Database & Auth:** Supabase PostgreSQL (`supabase/migrations/`), Row Level Security (RLS), and transaction-safe PL/pgSQL RPCs
- **Architecture:** See [`docs/architecture.md`](docs/architecture.md)

## Local Setup

1. Copy `.env.example` to `.env.local` and configure your Supabase credentials.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run tests and type checks:
   ```bash
   npm run test
   npm run typecheck
   npm run lint
   npm run build
   ```
4. Apply and verify PostgreSQL migrations on Supabase:
   ```bash
   npm run db:push
   npm run db:verify
   ```
