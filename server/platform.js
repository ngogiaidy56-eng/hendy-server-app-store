import pg from "pg";
const { Pool, types } = pg;
types.setTypeParser(20, (value) => Number.parseInt(value, 10));

function normalizeSql(source) {
  let index = 0;
  return String(source)
    .replace(/\bAS\s+([A-Za-z_][A-Za-z0-9_]*)/gi, (_match, alias) => 'AS "' + alias + '"')
    .replace(/\?/g, () => "$" + (++index));
}

function makeD1Adapter(pool) {
  return {
    prepare(source) {
      const sql = normalizeSql(source);
      let parameters = [];
      const statement = {
        bind(...values) { parameters = values; return statement; },
        query() { return { text: sql, values: parameters }; },
        async first(column) {
          const result = await pool.query(sql, parameters);
          const row = result.rows[0] ?? null;
          return column && row ? row[column] ?? null : row;
        },
        async all() {
          const result = await pool.query(sql, parameters);
          return { results: result.rows, success: true, meta: { changes: result.rowCount ?? 0 } };
        },
        async run() {
          const result = await pool.query(sql, parameters);
          return { success: true, meta: { changes: result.rowCount ?? 0, last_row_id: null } };
        }
      };
      return statement;
    },
    async batch(statements) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results = [];
        for (const statement of statements) {
          const query = statement.query();
          const result = await client.query(query.text, query.values);
          results.push({ success: true, meta: { changes: result.rowCount ?? 0 } });
        }
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

function safeObjectKey(value) {
  const key = String(value || "");
  if (!key || key.length > 1024 || key.startsWith("/") ||
      key.split("/").some((part) => !part || part === "." || part === "..") ||
      /[\u0000-\u001f\u007f]/.test(key)) throw new Error("Invalid object storage key");
  if (!key.startsWith("published/") && !key.startsWith("private/certificates/")) {
    throw new Error("Object key is outside an allowed storage prefix");
  }
  return key;
}

function makeObjectStorage(pool) {
  const readObject = async (key) => {
    const safeKey = safeObjectKey(key);
    const result = await pool.query(
      "SELECT object_key, body, size_bytes, http_metadata, custom_metadata, created_at FROM stored_objects WHERE object_key = $1",
      [safeKey]
    );
    return result.rows[0] ?? null;
  };

  return {
    async put(key, value, options = {}) {
      const safeKey = safeObjectKey(key);
      let body;
      if (Buffer.isBuffer(value)) body = value;
      else if (value instanceof ArrayBuffer) body = Buffer.from(value);
      else if (ArrayBuffer.isView(value)) body = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
      else if (value && typeof value.arrayBuffer === "function") body = Buffer.from(await value.arrayBuffer());
      else throw new TypeError("Unsupported object body");
      const httpMetadata = options.httpMetadata || {};
      const customMetadata = options.customMetadata || {};
      const createdAt = new Date().toISOString();
      const result = await pool.query(
        "INSERT INTO stored_objects (object_key, body, size_bytes, http_metadata, custom_metadata, created_at) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6) ON CONFLICT (object_key) DO UPDATE SET body = EXCLUDED.body, size_bytes = EXCLUDED.size_bytes, http_metadata = EXCLUDED.http_metadata, custom_metadata = EXCLUDED.custom_metadata, created_at = EXCLUDED.created_at RETURNING size_bytes",
        [safeKey, body, body.byteLength, JSON.stringify(httpMetadata), JSON.stringify(customMetadata), createdAt]
      );
      return { key: safeKey, size: result.rows[0]?.size_bytes ?? body.byteLength, uploaded: new Date(createdAt) };
    },
    async head(key) {
      const row = await readObject(key);
      if (!row) return null;
      return {
        key: row.object_key,
        size: Number(row.size_bytes),
        uploaded: new Date(row.created_at),
        httpMetadata: row.http_metadata || {},
        customMetadata: row.custom_metadata || {}
      };
    },
    async get(key) {
      const row = await readObject(key);
      if (!row) return null;
      const body = Buffer.from(row.body);
      const httpMetadata = row.http_metadata || {};
      return {
        key: row.object_key,
        size: body.byteLength,
        uploaded: new Date(row.created_at),
        httpMetadata,
        customMetadata: row.custom_metadata || {},
        body: new Response(body).body,
        async arrayBuffer() { return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength); },
        async text() { return body.toString("utf8"); },
        async json() { return JSON.parse(body.toString("utf8")); },
        writeHttpMetadata(target) {
          if (httpMetadata.contentType) target.set("Content-Type", httpMetadata.contentType);
          if (httpMetadata.cacheControl) target.set("Cache-Control", httpMetadata.cacheControl);
        }
      };
    },
    async delete(key) {
      await pool.query("DELETE FROM stored_objects WHERE object_key = $1", [safeObjectKey(key)]);
    },
    async list(options = {}) {
      const prefix = String(options.prefix || "");
      const requested = Number(options.limit || 1000);
      const limit = Number.isInteger(requested) ? Math.max(1, Math.min(1000, requested)) : 1000;
      const result = await pool.query(
        "SELECT object_key, size_bytes, http_metadata, custom_metadata, created_at FROM stored_objects WHERE left(object_key, length($1)) = $1 ORDER BY object_key LIMIT $2",
        [prefix, limit + 1]
      );
      const truncated = result.rows.length > limit;
      return {
        objects: result.rows.slice(0, limit).map((row) => ({
          key: row.object_key,
          size: Number(row.size_bytes),
          uploaded: new Date(row.created_at),
          httpMetadata: row.http_metadata || {},
          customMetadata: row.custom_metadata || {}
        })),
        truncated,
        cursor: null
      };
    }
  };
}

function makeKeyValue(pool) {
  return {
    async get(key, type) {
      const result = await pool.query(
        "SELECT value FROM kv_store WHERE key = $1 AND (expires_at IS NULL OR expires_at > $2)",
        [String(key), Math.floor(Date.now() / 1000)]
      );
      const value = result.rows[0]?.value ?? null;
      if (value === null || type !== "json") return value;
      try { return JSON.parse(value); } catch { return null; }
    },
    async put(key, value, options = {}) {
      const ttl = Number(options.expirationTtl || 0);
      const expiresAt = ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : null;
      await pool.query(
        "INSERT INTO kv_store (key, value, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at",
        [String(key), String(value), expiresAt]
      );
    },
    async delete(key) {
      await pool.query("DELETE FROM kv_store WHERE key = $1", [String(key)]);
    },
    async consume(key, ttlSeconds = 60) {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + Math.max(1, Number(ttlSeconds) || 60);
      const result = await pool.query(
        "INSERT INTO kv_store (key, value, expires_at) VALUES ($1, '1', $2) ON CONFLICT (key) DO UPDATE SET value = CASE WHEN kv_store.expires_at IS NULL OR kv_store.expires_at <= $3 THEN '1' ELSE (CAST(kv_store.value AS BIGINT) + 1)::text END, expires_at = CASE WHEN kv_store.expires_at IS NULL OR kv_store.expires_at <= $3 THEN $2 ELSE kv_store.expires_at END RETURNING value",
        [String(key), expiresAt, now]
      );
      return Number(result.rows[0]?.value || 1);
    }
  };
}

export async function createRenderPlatform(env = process.env) {
  const connectionString = String(env.DATABASE_URL || "");
  if (!connectionString) throw new Error("DATABASE_URL is required for Render PostgreSQL.");
  const pool = new Pool({
    connectionString,
    ssl: env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
    max: Number(env.PGPOOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    application_name: "hendy-server-app-store"
  });
  await pool.query("SELECT 1");
  return {
    pool,
    DB: makeD1Adapter(pool),
    RELEASES: makeObjectStorage(pool),
    RATE_LIMITS: makeKeyValue(pool),
    async close() { await pool.end(); }
  };
}

export { normalizeSql, safeObjectKey };
