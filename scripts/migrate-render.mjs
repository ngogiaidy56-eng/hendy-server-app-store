import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for Render PostgreSQL.");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 10000,
  application_name: "hendy-app-store-migrations"
});

try {
  const baseSql = await readFile(resolve("packages/db-schema/migrations/0002_render_storage.sql"), "utf8");
  const downloaderSql = await readFile(resolve("packages/db-schema/migrations/0003_downloader.sql"), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(baseSql);
    await client.query(downloaderSql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const result = await pool.query(
    "SELECT COUNT(*)::int AS table_count FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1::text[])",
    [["apps", "releases", "storefront_settings", "sync_logs", "certificates", "stored_objects", "kv_store", "download_events"]]
  );
  if (result.rows[0]?.table_count !== 8) throw new Error("Render PostgreSQL schema verification failed.");
  console.log("Render PostgreSQL schema ready: 8 application tables verified.");
} finally {
  await pool.end();
}
