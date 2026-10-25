const ALLOWED_PLATFORMS = new Set(["web", "windows", "android", "ios", "macos", "linux"]);
const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function safeSlug(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function tokenMatches(a, b) {
  let diff = a.length ^ b.length;
  const count = Math.max(a.length, b.length);
  for (let i = 0; i < count; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function fileContentType(fileName, declared) {
  if (declared && declared !== "application/octet-stream") return declared;
  const ext = fileName.toLowerCase().split(".").pop();
  const values = {
    apk: "application/vnd.android.package-archive",
    ipa: "application/octet-stream",
    exe: "application/vnd.microsoft.portable-executable",
    msi: "application/x-msi",
    zip: "application/zip",
    dmg: "application/x-apple-diskimage",
    pkg: "application/octet-stream",
    deb: "application/vnd.debian.binary-package",
    appimage: "application/octet-stream"
  };
  return values[ext] || "application/octet-stream";
}
async function digestSha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}
export async function publishArtifact(context, mode = "admin") {
  const env = context.env || {};
  const identity = context.data?.adminIdentity;
  if (mode === "admin" && !identity?.email) return json({ success: false, error: "authentication_required" }, 401);
  if (mode === "ci") {
    const expected = String(env.RELEASE_PUBLISH_TOKEN || "");
    const header = context.request.headers.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!expected) return json({ success: false, error: "publish_not_configured" }, 503);
    if (!match || !tokenMatches(match[1].trim(), expected)) return json({ success: false, error: "invalid_publish_token" }, 401);
  }
  if (!env.DB || !env.RELEASES?.put) return json({ success: false, error: "release_storage_not_configured" }, 503);

  let form;
  try { form = await context.request.formData(); }
  catch { return json({ success: false, error: "invalid_multipart" }, 400); }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ success: false, error: "artifact_required", message: "Thiếu trường file." }, 400);
  if (file.size < 1 || file.size > MAX_ARTIFACT_BYTES) return json({ success: false, error: "artifact_size_limit", message: "Artifact phải lớn hơn 0 byte và không vượt quá 25 MB." }, 413);

  const appName = String(form.get("appName") || "").trim().slice(0, 120);
  const appSlug = safeSlug(String(form.get("appSlug") || appName));
  const version = String(form.get("version") || "").trim();
  const platform = String(form.get("platform") || "web").trim().toLowerCase();
  const releaseNotes = String(form.get("releaseNotes") || "").trim().slice(0, 2000);
  if (!appName || !appSlug) return json({ success: false, error: "invalid_app" }, 400);
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(version)) return json({ success: false, error: "invalid_version", message: "Phiên bản phải là SemVer, ví dụ 1.2.3." }, 400);
  if (!ALLOWED_PLATFORMS.has(platform)) return json({ success: false, error: "invalid_platform" }, 400);

  const rawName = file.name.split(/[\\/]/).pop() || "artifact.bin";
  const fileName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  if (!fileName || fileName === "." || fileName === "..") return json({ success: false, error: "invalid_filename" }, 400);

  const id = crypto.randomUUID();
  const key = "published/" + appSlug + "/" + version + "/" + id + "/" + fileName;
  const bytes = await file.arrayBuffer();
  const sha256 = await digestSha256(bytes);
  const publishedAt = new Date().toISOString();
  const actorEmail = mode === "ci" ? "github-actions" : identity.email;
  const contentType = fileContentType(fileName, file.type);
  try {
    await env.RELEASES.put(key, bytes, {
      httpMetadata: { contentType },
      customMetadata: { appName, appSlug, version, platform, fileName, sha256, publishedAt, releaseNotes, uploadedBy: actorEmail }
    });
    await env.DB.prepare("INSERT INTO apps (app_slug, app_name, created_at) VALUES (?, ?, ?) ON CONFLICT(app_slug) DO UPDATE SET app_name = excluded.app_name")
      .bind(appSlug, appName, publishedAt).run();
    await env.DB.prepare("INSERT INTO releases (id, app_slug, app_name, version, platform, file_name, r2_key, size_bytes, sha256, release_notes, status, created_by, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)")
      .bind(id, appSlug, appName, version, platform, fileName, key, file.size, sha256, releaseNotes, actorEmail, publishedAt).run();
  } catch (error) {
    try { await env.RELEASES.delete(key); } catch {}
    console.error("publish artifact failed", error instanceof Error ? error.message : "unknown error");
    return json({ success: false, error: "publish_failed", message: "Không thể lưu artifact vào kho phát hành." }, 503);
  }
  const url = new URL("/api/v1/published/download?key=" + encodeURIComponent(key), context.request.url).toString();
  return json({
    success: true,
    message: "Artifact đã được lưu vào Cloudflare R2 và metadata được ghi vào D1.",
    id, key, appName, appSlug, version, platform, fileName,
    sizeBytes: file.size, sha256, publishedAt, releaseNotes, downloadUrl: url
  }, 201);
}
