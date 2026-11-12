import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Check .env.local.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 15,
});

try {
  const tablesWithoutRls = await sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = FALSE
    ORDER BY tablename
  `;

  const unindexedFks = await sql`
    SELECT
      conrelid::regclass::text AS table_name,
      a.attname AS fk_column
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.connamespace = 'public'::regnamespace
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND a.attnum = ANY(i.indkey)
      )
    ORDER BY table_name, fk_column
  `;

  const appliedMigrations = await sql`
    SELECT filename, applied_at
    FROM private.schema_migrations
    ORDER BY filename
  `;

  console.log(`Applied migrations: ${appliedMigrations.length}`);
  for (const row of appliedMigrations) {
    console.log(`  - ${row.filename}`);
  }

  if (tablesWithoutRls.length > 0) {
    console.error("Tables missing RLS:", tablesWithoutRls);
    process.exitCode = 1;
  } else {
    console.log("RLS check: PASS (all public tables protected)");
  }

  if (unindexedFks.length > 0) {
    console.error("Unindexed foreign keys:", unindexedFks);
    process.exitCode = 1;
  } else {
    console.log("FK index check: PASS (zero unindexed foreign keys)");
  }
} finally {
  await sql.end();
}

