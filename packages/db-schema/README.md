# Hendy App Store database schema — Render PostgreSQL

Render production uses PostgreSQL and the idempotent migration at `migrations/0002_render_storage.sql`.

- `migrations/0001_init.sql` is the historical Cloudflare D1/SQLite schema and is not run by the Render deployment.
- `migrations/0002_render_storage.sql` creates application metadata, releases, storefront settings, sync logs and certificate inventory.
- Release files and encrypted certificate blobs are stored in PostgreSQL `stored_objects.body BYTEA`; `stored_objects` preserves object metadata and the previous API key namespace.
- `kv_store` is the PostgreSQL-backed replacement for the small KV settings/rate-limit interface.
- Never store API tokens, passwords or encryption keys in these tables.

Run locally or through Render's Pre-Deploy Command:

```bash
npm run db:migrate
```

The migration runs in a transaction and verifies all seven required tables. It is safe to re-run because all DDL uses `IF NOT EXISTS`.
