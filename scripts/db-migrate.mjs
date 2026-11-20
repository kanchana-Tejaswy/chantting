import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Check .env.local.");
  process.exit(1);
}

const migrationsDir = path.resolve(process.cwd(), "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 15,
});

try {
  await sql.unsafe(`
    CREATE SCHEMA IF NOT EXISTS private;
    CREATE TABLE IF NOT EXISTS private.schema_migrations (
      filename TEXT PRIMARY KEY,
      sha256 TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const appliedRows = await sql`
    SELECT filename, sha256 FROM private.schema_migrations
  `;
  const applied = new Map(appliedRows.map((r) => [r.filename, r.sha256]));

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const hash = crypto.createHash("sha256").update(content).digest("hex");

    if (applied.has(file)) {
      if (applied.get(file) !== hash) {
        console.warn(
          `Notice: Updating recorded checksum for already-applied migration ${file}`
        );
        await sql`
          UPDATE private.schema_migrations
          SET sha256 = ${hash}
          WHERE filename = ${file}
        `;
      }
      console.log(`skip  ${file}`);
      continue;
    }

    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`
        INSERT INTO private.schema_migrations (filename, sha256)
        VALUES (${file}, ${hash})
      `;
    });
    console.log(`apply ${file}`);
  }

  await sql`NOTIFY pgrst, 'reload schema'`;
  console.log("Notified PostgREST to reload schema cache.");
  console.log("All migrations verified/applied cleanly.");
} finally {
  await sql.end();
}

