import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 10000);
const uploadLimitBytes = 25 * 1024 * 1024;
const platforms = new Set(["windows", "android", "ios"]);
const channels = new Set(["stable", "beta", "preview"]);
const publishedStatuses = new Set(["published", "draft", "archived"]);
const allowedExtensions = new Set([".exe", ".msi", ".msix", ".zip", ".7z", ".apk", ".aab", ".dmg", ".pkg", ".ipa", ".appimage"]);
let pool;
let schemaPromise;
let s3Client;

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");
  next();
});

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });
  return pool;
}
async function ensureSchema() {
  const db = getPool();
  if (!db) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!schemaPromise) schemaPromise = db.query(`
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      build INTEGER NOT NULL DEFAULT 0,
      platform TEXT NOT NULL CHECK (platform IN ('windows','android','ios')),
      channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable','beta','preview')),
      release_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      file_size BIGINT NOT NULL DEFAULT 0,
      download_url TEXT,
      sha256 TEXT,
      release_notes TEXT NOT NULL DEFAULT '',
      mandatory BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      r2_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(platform, channel, version)
    )
  `).catch(error => { schemaPromise = undefined; throw error; });
  await schemaPromise;
  return db;
}
function rowToRelease(row) {
  return {
    id: row.id, name: row.name, version: row.version, build: Number(row.build || 0),
    platform: row.platform, channel: row.channel, releaseDate: new Date(row.release_date).toISOString(),
    fileSize: Number(row.file_size || 0), downloadUrl: row.download_url || null,
    sha256: row.sha256 || null, releaseNotes: row.release_notes || "",
    mandatory: Boolean(row.mandatory), status: row.status, r2Key: row.r2_key || null,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString()
  };
}
function configuredReleases() {
  try {
    const value = JSON.parse(process.env.RELEASES_JSON || "[]");
    return Array.isArray(value) ? value.map((r, i) => ({
      id: String(r.id || `config-${i}`), name: String(r.name || "Hendy Tools"),
      version: String(r.version || "0.0.0"), build: Number(r.build || 0),
      platform: String(r.platform || "windows"), channel: String(r.channel || "stable"),
      releaseDate: r.releaseDate || null, fileSize: Number(r.fileSize || 0),
      downloadUrl: safeHttpsUrl(r.downloadUrl) ? r.downloadUrl : null,
      sha256: /^[a-f0-9]{64}$/i.test(String(r.sha256 || "")) ? String(r.sha256).toLowerCase() : null,
      releaseNotes: String(r.releaseNotes || ""), mandatory: Boolean(r.mandatory),
      status: r.status || "published"
    })) : [];
  } catch { return []; }
}
async function getReleases(includeDrafts = false) {
  const db = getPool();
  if (!db) return configuredReleases().filter(r => includeDrafts || r.status === "published");
  await ensureSchema();
  const { rows } = await db.query(
    includeDrafts ? "SELECT * FROM releases ORDER BY updated_at DESC" : "SELECT * FROM releases WHERE status = 'published' ORDER BY release_date DESC"
  );
  return rows.map(rowToRelease);
}
function safeHttpsUrl(value) {
  try { const u = new URL(String(value || "")); return u.protocol === "https:" && Boolean(u.hostname); } catch { return false; }
}
function compareVersions(a, b) {
  const left = String(a || "0").split(/[.+-]/).map(x => /^\d+$/.test(x) ? Number(x) : x.toLowerCase());
  const right = String(b || "0").split(/[.+-]/).map(x => /^\d+$/.test(x) ? Number(x) : x.toLowerCase());
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const x = left[i] ?? 0, y = right[i] ?? 0;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x).localeCompare(String(y), undefined, { numeric: true });
  }
  return 0;
}
function validSha(value) { return /^[a-f0-9]{64}$/i.test(String(value || "")); }
function normalizeRelease(body, { allowDraft = true } = {}) {
  const name = String(body?.name || "").trim().slice(0, 120);
  const version = String(body?.version || "").trim().slice(0, 64);
  const platform = String(body?.platform || "");
  const channel = String(body?.channel || "stable");
  const status = String(body?.status || "draft");
  const downloadUrl = body?.downloadUrl ? String(body.downloadUrl).trim() : null;
  const sha256 = body?.sha256 ? String(body.sha256).trim().toLowerCase() : null;
  const fileSize = Number(body?.fileSize || 0);
  const build = Number(body?.build || 0);
  if (!name || !version) throw new Error("Tên ứng dụng và phiên bản là bắt buộc.");
  if (!/^[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}$/.test(version)) throw new Error("Phiên bản không đúng định dạng.");
  if (!platforms.has(platform)) throw new Error("Nền tảng phải là windows, android hoặc ios.");
  if (!channels.has(channel)) throw new Error("Kênh phát hành không hợp lệ.");
  if (!publishedStatuses.has(status) || (!allowDraft && status !== "published")) throw new Error("Trạng thái phát hành không hợp lệ.");
  if (!Number.isSafeInteger(build) || build < 0) throw new Error("Build number không hợp lệ.");
  if (!Number.isSafeInteger(fileSize) || fileSize < 0) throw new Error("Dung lượng tệp không hợp lệ.");
  if (downloadUrl && !safeHttpsUrl(downloadUrl)) throw new Error("URL tải phải dùng HTTPS.");
  if (sha256 && !validSha(sha256)) throw new Error("SHA-256 phải có đúng 64 ký tự hex.");
  if (status === "published" && (!downloadUrl || !sha256 || fileSize < 1)) {
    throw new Error("Muốn xuất bản cần URL HTTPS, SHA-256 hợp lệ và dung lượng tệp lớn hơn 0.");
  }
  return {
    name, version, build, platform, channel, status, downloadUrl, sha256, fileSize,
    releaseNotes: String(body?.releaseNotes || "").slice(0, 8000),
    mandatory: Boolean(body?.mandatory),
    r2Key: body?.r2Key ? String(body.r2Key).slice(0, 512) : null
  };
}
function authorized(req) {
  const expected = process.env.ADMIN_API_TOKEN || "";
  const received = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;
  const a = Buffer.from(expected), b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_API_TOKEN) return res.status(503).json({ error: "ADMIN_API_TOKEN chưa được cấu hình." });
  if (!authorized(req)) return res.status(401).json({ error: "Không có quyền quản trị." });
  if (!getPool()) return res.status(503).json({ error: "Cần cấu hình DATABASE_URL để bật quản trị bền vững." });
  next();
}
function s3() {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) return null;
  if (!s3Client) s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
  });
  return s3Client;
}
function publicObjectUrl(key) {
  const base = String(process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!base || !safeHttpsUrl(base)) return null;
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
async function deleteObject(key) {
  const client = s3();
  if (client && key) await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
}
app.get(["/api/health", "/health"], async (_req, res) => {
  let database = "manifest";
  try {
    if (getPool()) { await ensureSchema(); database = "postgres"; }
    res.json({ status: "ok", service: "hendy-server-app-store", platform: "render", database, objectStorage: Boolean(s3() && process.env.R2_PUBLIC_BASE_URL), timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", service: "hendy-server-app-store", database: "unavailable", timestamp: new Date().toISOString() });
  }
});
app.get("/api/releases", async (_req, res, next) => {
  try { const items = await getReleases(false); res.json({ success: true, total: items.length, releases: items }); } catch (error) { next(error); }
});
app.get("/api/update-check", async (req, res, next) => {
  try {
    const platform = String(req.query.platform || "windows");
    const channel = String(req.query.channel || "stable");
    const version = String(req.query.clientVersion || "0.0.0");
    if (!platforms.has(platform)) return res.status(400).json({ error: "Nền tảng không hợp lệ." });
    const latest = (await getReleases(false)).filter(r => r.platform === platform && r.channel === channel).sort((a, b) => compareVersions(b.version, a.version))[0];
    if (!latest) return res.json({ updateAvailable: false, message: "Chưa có bản phát hành phù hợp." });
    res.json({ updateAvailable: compareVersions(latest.version, version) > 0, latestVersion: latest.version, platform: latest.platform, channel: latest.channel, downloadUrl: latest.downloadUrl || null, sha256: latest.sha256 || null, fileSize: latest.fileSize || 0, releaseNotes: latest.releaseNotes || "", mandatory: Boolean(latest.mandatory) });
  } catch (error) { next(error); }
});
app.get("/api/telemetry", (_req, res) => res.json({ service: "hendy-server-app-store", runtime: "node", uptimeSeconds: Math.floor(process.uptime()), timestamp: new Date().toISOString() }));

app.use("/api/admin", requireAdmin);
app.get("/api/admin/releases", async (_req, res, next) => {
  try { const items = await getReleases(true); res.json({ success: true, total: items.length, releases: items }); } catch (error) { next(error); }
});
app.post("/api/admin/releases", async (req, res, next) => {
  try {
    const data = normalizeRelease(req.body);
    const db = await ensureSchema();
    const id = randomUUID();
    const { rows } = await db.query(
      `INSERT INTO releases (id,name,version,build,platform,channel,file_size,download_url,sha256,release_notes,mandatory,status,r2_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id,data.name,data.version,data.build,data.platform,data.channel,data.fileSize,data.downloadUrl,data.sha256,data.releaseNotes,data.mandatory,data.status,data.r2Key]
    );
    res.status(201).json({ success: true, release: rowToRelease(rows[0]) });
  } catch (error) {
    if (error?.code === "23505") return res.status(409).json({ error: "Đã có phiên bản này trên cùng nền tảng và kênh." });
    if (error instanceof Error && !("code" in error)) return res.status(400).json({ error: error.message });
    next(error);
  }
});
app.patch("/api/admin/releases/:id", async (req, res, next) => {
  try {
    const db = await ensureSchema();
    const { rows: currentRows } = await db.query("SELECT * FROM releases WHERE id=$1", [req.params.id]);
    if (!currentRows.length) return res.status(404).json({ error: "Không tìm thấy bản phát hành." });
    const current = rowToRelease(currentRows[0]);
    const data = normalizeRelease({ ...current, ...req.body }, { allowDraft: true });
    const { rows } = await db.query(
      `UPDATE releases SET name=$2,version=$3,build=$4,platform=$5,channel=$6,file_size=$7,download_url=$8,sha256=$9,release_notes=$10,mandatory=$11,status=$12,r2_key=$13,updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id,data.name,data.version,data.build,data.platform,data.channel,data.fileSize,data.downloadUrl,data.sha256,data.releaseNotes,data.mandatory,data.status,data.r2Key]
    );
    res.json({ success: true, release: rowToRelease(rows[0]) });
  } catch (error) {
    if (error?.code === "23505") return res.status(409).json({ error: "Đã có phiên bản này trên cùng nền tảng và kênh." });
    if (error instanceof Error && !("code" in error)) return res.status(400).json({ error: error.message });
    next(error);
  }
});
app.delete("/api/admin/releases/:id", async (req, res, next) => {
  try {
    const db = await ensureSchema();
    const { rows } = await db.query("DELETE FROM releases WHERE id=$1 RETURNING r2_key", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy bản phát hành." });
    if (rows[0].r2_key) {
      try { await deleteObject(rows[0].r2_key); } catch (error) { console.error("R2 delete failed:", error.message); }
    }
    res.json({ success: true });
  } catch (error) { next(error); }
});
app.post("/api/admin/uploads", express.raw({ type: "application/octet-stream", limit: uploadLimitBytes }), async (req, res) => {
  try {
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length < 1) return res.status(400).json({ error: "Gửi nội dung tệp dạng application/octet-stream." });
    if (body.length > uploadLimitBytes) return res.status(413).json({ error: "Bản tải trực tiếp giới hạn 25 MiB; với gói lớn, hãy tải lên R2 riêng và nhập URL HTTPS." });
    const original = path.basename(String(req.get("x-filename") || "release.bin")).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);
    const extension = path.extname(original).toLowerCase();
    if (!allowedExtensions.has(extension)) return res.status(400).json({ error: "Định dạng chưa được hỗ trợ. Cho phép: EXE, MSI, MSIX, ZIP, 7Z, APK, AAB, DMG, PKG, IPA, AppImage." });
    const client = s3();
    if (!client || !process.env.R2_PUBLIC_BASE_URL || !safeHttpsUrl(process.env.R2_PUBLIC_BASE_URL)) {
      return res.status(503).json({ error: "Cần cấu hình R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME và R2_PUBLIC_BASE_URL." });
    }
    const platform = String(req.get("x-platform") || "windows");
    if (!platforms.has(platform)) return res.status(400).json({ error: "Nền tảng không hợp lệ." });
    const sha256 = createHash("sha256").update(body).digest("hex");
    const key = `releases/${platform}/${new Date().toISOString().slice(0,10)}/${randomUUID()}-${original}`;
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: body,
      ContentType: "application/octet-stream", ContentLength: body.length,
      ContentDisposition: `attachment; filename="${original}"`,
      Metadata: { sha256, platform }
    }));
    const downloadUrl = publicObjectUrl(key);
    if (!downloadUrl) return res.status(503).json({ error: "R2 upload hoàn tất nhưng URL công khai chưa hợp lệ; cấu hình R2_PUBLIC_BASE_URL." });
    res.status(201).json({ success: true, key, filename: original, downloadUrl, fileSize: body.length, sha256 });
  } catch (error) {
    console.error("Release upload failed:", error?.message || error);
    res.status(500).json({ error: "Không thể tải tệp lên kho lưu trữ." });
  }
});

app.use(express.static(path.join(root, "dist"), { index: false, maxAge: "1h" }));
app.get("/{*path}", (req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API route not found" });
  res.sendFile(path.join(root, "dist", "index.html"), err => { if (err) next(err); });
});
app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "Nội dung yêu cầu quá lớn." });
  console.error("Request failed:", error?.message || error);
  res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
});

const server = app.listen(port, "0.0.0.0", () => console.log(`Hendy Server App Store listening on ${port}`));
async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down gracefully.`);
  server.close(async () => {
    try { await pool?.end(); } finally { process.exit(0); }
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
