import fs from "node:fs";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

export interface TestDb {
  db: PGlite;
  cleanup: () => Promise<void>;
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase", "migrations");

export async function createBootstrappedDb(): Promise<TestDb> {
  const db = new PGlite();

  // Bootstrap minimal Supabase auth schema and roles for PostgreSQL integration testing
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOINHERIT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOINHERIT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
      END IF;
    END $$;

    CREATE SCHEMA IF NOT EXISTS auth;

    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE,
      raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS UUID
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  `);

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await db.exec(sql);
  }

  return {
    db,
    cleanup: async () => {
      await db.close();
    },
  };
}

export async function seedTestUser(
  db: PGlite,
  opts: {
    id: string;
    email: string;
    name?: string;
    timezone?: string;
  }
) {
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data)
     VALUES ($1, $2, $3::jsonb)`,
    [opts.id, opts.email, JSON.stringify({ full_name: opts.name ?? "Devotee" })]
  );

  if (opts.timezone) {
    await db.query(`UPDATE public.profiles SET timezone = $2 WHERE id = $1`, [
      opts.id,
      opts.timezone,
    ]);
  }
}

export async function asUser<T>(
  db: PGlite,
  userId: string,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`SET LOCAL ROLE authenticated`);
    await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [
      userId,
    ]);
    return fn(tx);
  });
}

export async function asAnon<T>(
  db: PGlite,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`SET LOCAL ROLE anon`);
    await tx.query(`SELECT set_config('request.jwt.claim.sub', '', true)`);
    return fn(tx);
  });
}

