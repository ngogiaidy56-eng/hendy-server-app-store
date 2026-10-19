interface ReleaseRow {
  id: string; name: string; version: string; build: number; platform: string; channel: string;
  release_date: string; file_size: number; download_url: string | null; sha256: string | null;
  release_notes: string; mandatory: number | boolean; status: string; r2_key: string | null;
  created_at: string; updated_at: string;
}
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
interface D1Database { prepare(sql: string): D1Statement; }
interface R2Bucket {
  put(key: string, value: ArrayBuffer | ReadableStream | ArrayBufferView | string, options?: Record<string, unknown>): Promise<unknown>;
  delete(key: string): Promise<void>;
}
interface Env {
  RELEASES_JSON?: string;
  ADMIN_API_TOKEN?: string;
  ALLOWED_ORIGIN?: string;
  PUBLIC_DOWNLOAD_BASE_URL?: string;
  RELEASES_DB?: D1Database;
  RELEASES_BUCKET?: R2Bucket;
}
const UPLOAD_LIMIT = 25 * 1024 * 1024;
const PLATFORMS = new Set(["windows", "android", "ios"]);
const CHANNELS = new Set(["stable", "beta", "preview"]);
const STATUSES = new Set(["draft", "published", "archived"]);
const EXTENSIONS = new Set([".exe", ".msi", ".msix", ".zip", ".7z", ".apk", ".aab", ".dmg", ".pkg", ".ipa", ".appimage"]);
const baseHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin"
};
let schemaReady = new WeakMap<D1Database, Promise<void>>();
function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...baseHeaders, ...extra } });
}
function safeHttpsUrl(value: unknown): value is string {
  try { const u = new URL(String(value || "")); return u.protocol === "https:" && Boolean(u.hostname); } catch { return false; }
}
function validSha(value: unknown) { return /^[a-f0-9]{64}$/i.test(String(value || "")); }
function compareVersions(a: unknown, b: unknown) {
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
function constantTimeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function normalizeRelease(body: any) {
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
  if (!PLATFORMS.has(platform)) throw new Error("Nền tảng phải là windows, android hoặc ios.");
  if (!CHANNELS.has(channel)) throw new Error("Kênh phát hành không hợp lệ.");
  if (!STATUSES.has(status)) throw new Error("Trạng thái phát hành không hợp lệ.");
  if (!Number.isSafeInteger(build) || build < 0) throw new Error("Build number không hợp lệ.");
  if (!Number.isSafeInteger(fileSize) || fileSize < 0) throw new Error("Dung lượng tệp không hợp lệ.");
  if (downloadUrl && !safeHttpsUrl(downloadUrl)) throw new Error("URL tải phải dùng HTTPS.");
  if (sha256 && !validSha(sha256)) throw new Error("SHA-256 phải có đúng 64 ký tự hex.");
  if (status === "published" && (!downloadUrl || !sha256 || fileSize < 1)) {
    throw new Error("Muốn xuất bản cần URL HTTPS, SHA-256 hợp lệ và dung lượng tệp lớn hơn 0.");
  }
  return { name, version, build, platform, channel, status, downloadUrl, sha256, fileSize,
    releaseNotes: String(body?.releaseNotes || "").slice(0, 8000), mandatory: Boolean(body?.mandatory),
    r2Key: body?.r2Key ? String(body.r2Key).slice(0, 512) : null };
}
async function ensureSchema(db: D1Database) {
  let pending = schemaReady.get(db);
  if (!pending) {
    pending = db.prepare(`
      CREATE TABLE IF NOT EXISTS releases (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, version TEXT NOT NULL, build INTEGER NOT NULL DEFAULT 0,
        platform TEXT NOT NULL CHECK (platform IN ('windows','android','ios')),
        channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable','beta','preview')),
        release_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        file_size INTEGER NOT NULL DEFAULT 0, download_url TEXT, sha256 TEXT, release_notes TEXT NOT NULL DEFAULT '',
        mandatory INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        r2_key TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        UNIQUE(platform, channel, version)
      )
    `).run().then(() => undefined).catch(error => { schemaReady.delete(db); throw error; });
    schemaReady.set(db, pending);
  }
  await pending;
}
function rowToRelease(row: ReleaseRow) {
  return { id: row.id, name: row.name, version: row.version, build: Number(row.build || 0), platform: row.platform,
    channel: row.channel, releaseDate: row.release_date, fileSize: Number(row.file_size || 0),
    downloadUrl: row.download_url || null, sha256: row.sha256 || null, releaseNotes: row.release_notes || "",
    mandatory: Boolean(row.mandatory), status: row.status, r2Key: row.r2_key || null,
    createdAt: row.created_at, updatedAt: row.updated_at };
}
function configuredReleases(env: Env) {
  try {
    const value = JSON.parse(env.RELEASES_JSON || "[]");
    if (!Array.isArray(value)) return [];
    return value.map((r: any, i: number) => ({ id: String(r.id || `config-${i}`), name: String(r.name || "Hendy Tools"),
      version: String(r.version || "0.0.0"), build: Number(r.build || 0), platform: String(r.platform || "windows"),
      channel: String(r.channel || "stable"), releaseDate: r.releaseDate || null, fileSize: Number(r.fileSize || 0),
      downloadUrl: safeHttpsUrl(r.downloadUrl) ? r.downloadUrl : null, sha256: validSha(r.sha256) ? String(r.sha256).toLowerCase() : null,
      releaseNotes: String(r.releaseNotes || ""), mandatory: Boolean(r.mandatory), status: r.status || "published" }));
  } catch { return []; }
}
async function getReleases(env: Env, includeDrafts = false) {
  if (!env.RELEASES_DB) return configuredReleases(env).filter((r: any) => includeDrafts || r.status === "published");
  await ensureSchema(env.RELEASES_DB);
  const sql = includeDrafts ? "SELECT * FROM releases ORDER BY updated_at DESC" : "SELECT * FROM releases WHERE status='published' ORDER BY release_date DESC";
  const { results } = await env.RELEASES_DB.prepare(sql).all<ReleaseRow>();
  return results.map(rowToRelease);
}
function objectUrl(env: Env, key: string) {
  const base = String(env.PUBLIC_DOWNLOAD_BASE_URL || "").replace(/\/+$/, "");
  if (!safeHttpsUrl(base)) return null;
  return base + "/" + key.split("/").map(encodeURIComponent).join("/");
}
function adminAuthorized(request: Request, env: Env) {
  const token = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return constantTimeEqual(String(env.ADMIN_API_TOKEN || ""), token);
}
async function uploadFile(request: Request, env: Env) {
  if (!env.RELEASES_BUCKET) return json({ error: "Cần cấu hình binding R2 RELEASES_BUCKET." }, 503);
  const base = String(env.PUBLIC_DOWNLOAD_BASE_URL || "");
  if (!safeHttpsUrl(base)) return json({ error: "Cần cấu hình PUBLIC_DOWNLOAD_BASE_URL trỏ tới domain HTTPS của bucket R2." }, 503);
  const filenameHeader = request.headers.get("x-filename") || "release.bin";
  const filename = filenameHeader.split(/[\\/]/).pop()!.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (!EXTENSIONS.has(extension)) return json({ error: "Định dạng chưa được hỗ trợ." }, 400);
  const platform = request.headers.get("x-platform") || "windows";
  if (!PLATFORMS.has(platform)) return json({ error: "Nền tảng không hợp lệ." }, 400);
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > UPLOAD_LIMIT) return json({ error: "Giới hạn upload trực tiếp là 25 MiB." }, 413);
  if (!request.body) return json({ error: "Tệp rỗng." }, 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    totalBytes += item.value.byteLength;
    if (totalBytes > UPLOAD_LIMIT) {
      await reader.cancel();
      return json({ error: "Giới hạn upload trực tiếp là 25 MiB; với gói lớn, hãy tải lên R2 riêng và nhập URL HTTPS." }, 413);
    }
    chunks.push(item.value);
  }
  if (totalBytes < 1) return json({ error: "Tệp rỗng." }, 400);
  const buffer = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const key = `releases/${platform}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${filename}`;
  await env.RELEASES_BUCKET.put(key, buffer.buffer, { httpMetadata: { contentType: "application/octet-stream", contentDisposition: `attachment; filename="${filename}"` }, customMetadata: { sha256, platform } });
  const downloadUrl = objectUrl(env, key);
  if (!downloadUrl) return json({ error: "R2 upload hoàn tất nhưng URL công khai chưa hợp lệ." }, 503);
  return json({ success: true, key, filename, downloadUrl, fileSize: totalBytes, sha256 }, 201);
}
async function handleAdmin(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.ADMIN_API_TOKEN) return json({ error: "ADMIN_API_TOKEN chưa được cấu hình." }, 503);
  if (!adminAuthorized(request, env)) return json({ error: "Không có quyền quản trị." }, 401);
  if (!env.RELEASES_DB) return json({ error: "Cần cấu hình D1 binding RELEASES_DB để bật quản trị bền vững." }, 503);
  const db = env.RELEASES_DB;
  await ensureSchema(db);
  if (request.method === "GET" && url.pathname === "/api/admin/releases") {
    const items = await getReleases(env, true); return json({ success: true, total: items.length, releases: items });
  }
  if (request.method === "POST" && url.pathname === "/api/admin/uploads") return uploadFile(request, env);
  if (request.method === "POST" && url.pathname === "/api/admin/releases") {
    let body: any; try { body = await request.json(); } catch { return json({ error: "JSON không hợp lệ." }, 400); }
    let data: ReturnType<typeof normalizeRelease>; try { data = normalizeRelease(body); } catch (e) { return json({ error: (e as Error).message }, 400); }
    const id = crypto.randomUUID();
    try {
      await db.prepare(`INSERT INTO releases (id,name,version,build,platform,channel,file_size,download_url,sha256,release_notes,mandatory,status,r2_key)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,data.name,data.version,data.build,data.platform,data.channel,data.fileSize,data.downloadUrl,data.sha256,data.releaseNotes,data.mandatory ? 1 : 0,data.status,data.r2Key).run();
    } catch (e) {
      if (/unique/i.test(String((e as Error).message))) return json({ error: "Đã có phiên bản này trên cùng nền tảng và kênh." }, 409);
      throw e;
    }
    const created = await db.prepare("SELECT * FROM releases WHERE id=?").bind(id).first<ReleaseRow>();
    return json({ success: true, release: rowToRelease(created!) }, 201);
  }
  const match = url.pathname.match(/^\/api\/admin\/releases\/([A-Za-z0-9_-]+)$/);
  if (match && request.method === "PATCH") {
    let body: any; try { body = await request.json(); } catch { return json({ error: "JSON không hợp lệ." }, 400); }
    const current = await db.prepare("SELECT * FROM releases WHERE id=?").bind(match[1]).first<ReleaseRow>();
    if (!current) return json({ error: "Không tìm thấy bản phát hành." }, 404);
    let data: ReturnType<typeof normalizeRelease>; try { data = normalizeRelease({ ...rowToRelease(current), ...body }); } catch (e) { return json({ error: (e as Error).message }, 400); }
    try {
      await db.prepare(`UPDATE releases SET name=?,version=?,build=?,platform=?,channel=?,file_size=?,download_url=?,sha256=?,release_notes=?,mandatory=?,status=?,r2_key=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`)
        .bind(data.name,data.version,data.build,data.platform,data.channel,data.fileSize,data.downloadUrl,data.sha256,data.releaseNotes,data.mandatory ? 1 : 0,data.status,data.r2Key,match[1]).run();
    } catch (e) {
      if (/unique/i.test(String((e as Error).message))) return json({ error: "Đã có phiên bản này trên cùng nền tảng và kênh." }, 409);
      throw e;
    }
    const updated = await db.prepare("SELECT * FROM releases WHERE id=?").bind(match[1]).first<ReleaseRow>();
    return json({ success: true, release: rowToRelease(updated!) });
  }
  if (match && request.method === "DELETE") {
    const current = await db.prepare("SELECT r2_key FROM releases WHERE id=?").bind(match[1]).first<{ r2_key: string | null }>();
    if (!current) return json({ error: "Không tìm thấy bản phát hành." }, 404);
    await db.prepare("DELETE FROM releases WHERE id=?").bind(match[1]).run();
    if (current.r2_key && env.RELEASES_BUCKET) {
      try { await env.RELEASES_BUCKET.delete(current.r2_key); } catch { /* metadata deletion still succeeds */ }
    }
    return json({ success: true });
  }
  return json({ error: "Admin route not found" }, 404);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const allowedOrigin = env.ALLOWED_ORIGIN || "";
    const cors: Record<string, string> = origin && allowedOrigin && origin === allowedOrigin ? {
      "access-control-allow-origin": allowedOrigin,
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "Authorization,Content-Type,X-Filename,X-Platform",
      "access-control-max-age": "600",
      "vary": "Origin"
    } : {};
    if (request.method === "OPTIONS") return origin && origin === allowedOrigin && allowedOrigin
      ? new Response(null, { status: 204, headers: cors })
      : json({ error: "Origin không được cho phép." }, 403);
    try {
      if (url.pathname === "/api/health" || url.pathname === "/health") {
        let database = "manifest";
        if (env.RELEASES_DB) { await ensureSchema(env.RELEASES_DB); database = "d1"; }
        return json({ status: "ok", service: "hendy-server-app-store", platform: "cloudflare-workers", database, objectStorage: Boolean(env.RELEASES_BUCKET && safeHttpsUrl(env.PUBLIC_DOWNLOAD_BASE_URL)), timestamp: new Date().toISOString() }, 200, cors);
      }
      if (url.pathname.startsWith("/api/admin/")) return await handleAdmin(request, env, url).then(r => addCors(r, cors));
      if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method not allowed" }, 405, cors);
      if (url.pathname === "/api/releases") {
        const releases = await getReleases(env, false); return json({ success: true, total: releases.length, releases }, 200, cors);
      }
      if (url.pathname === "/api/update-check") {
        const platform = url.searchParams.get("platform") || "windows";
        const channel = url.searchParams.get("channel") || "stable";
        const version = url.searchParams.get("clientVersion") || "0.0.0";
        if (!PLATFORMS.has(platform)) return json({ error: "Nền tảng không hợp lệ." }, 400, cors);
        const latest = (await getReleases(env, false)).filter((r: any) => r.platform === platform && r.channel === channel).sort((a: any,b: any) => compareVersions(b.version,a.version))[0];
        return json(latest ? { updateAvailable: compareVersions(latest.version, version) > 0, latestVersion: latest.version, platform: latest.platform, channel: latest.channel, downloadUrl: latest.downloadUrl || null, sha256: latest.sha256 || null, fileSize: latest.fileSize || 0, releaseNotes: latest.releaseNotes || "", mandatory: Boolean(latest.mandatory) } : { updateAvailable: false, message: "Chưa có bản phát hành phù hợp." }, 200, cors);
      }
      if (url.pathname === "/api/telemetry") return json({ service: "hendy-server-app-store", runtime: "cloudflare-workers", timestamp: new Date().toISOString() }, 200, cors);
      if (url.pathname.startsWith("/api/")) return json({ error: "API route not found" }, 404, cors);
      return new Response("Hendy Server App Store API is online. Deploy the Vite frontend to Cloudflare Pages.", { status: 200, headers: { "content-type": "text/plain; charset=utf-8", ...cors } });
    } catch (error) {
      console.error("Request failed:", (error as Error)?.message || error);
      return json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." }, 500, cors);
    }
  }
};
function addCors(response: Response, cors: Record<string, string>) {
  if (!Object.keys(cors).length) return response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
