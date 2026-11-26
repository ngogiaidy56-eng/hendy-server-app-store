import { randomUUID } from "node:crypto";
import { publishArtifact } from "../packages/shared-types/src/release-utils.js";

const CHANNELS = new Set(["stable", "beta", "nightly"]);

export function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export function compareVersions(left, right) {
  const parse = (value) => {
    const normalized = String(value || "").trim().replace(/^v/i, "");
    const match = normalized.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
    if (!match) return null;
    return { core: match.slice(1, 4).map(Number), pre: match[4] ? match[4].split(".") : null };
  };
  const a = parse(left);
  const b = parse(right);
  if (!a || !b) return String(left).localeCompare(String(right), undefined, { numeric: true });
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1;
  if (!a.pre && !b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    if (a.pre[i] === undefined) return -1;
    if (b.pre[i] === undefined) return 1;
    if (a.pre[i] === b.pre[i]) continue;
    const an = /^\d+$/.test(a.pre[i]);
    const bn = /^\d+$/.test(b.pre[i]);
    if (an && bn) return Number(a.pre[i]) > Number(b.pre[i]) ? 1 : -1;
    if (an !== bn) return an ? -1 : 1;
    return a.pre[i] > b.pre[i] ? 1 : -1;
  }
  return 0;
}

function json(res, status, payload) {
  return res.status(status).set("Cache-Control", "no-store").json(payload);
}

function platformFromCategory(value) {
  const category = String(value || "").trim().toLowerCase();
  if (category === "android") return "android";
  if (category === "windows") return "windows";
  if (category === "macos" || category === "mac") return "macos";
  if (category === "ios" || category === "iphone" || category === "ipad") return "ios";
  if (category === "linux") return "linux";
  return "web";
}

export function registerDownloaderRoutes(app, env, helpers) {
  app.get("/api/apps", async (_req, res) => {
    try {
      if (!env.DB) return json(res, 503, { success: false, error: "database_not_configured", apps: [] });
      const result = await env.DB.prepare(
        "SELECT a.app_slug AS id, a.app_slug AS slug, a.app_name AS name, r.version, r.platform AS category, r.channel, r.file_name AS filename, r.size_bytes AS sizeBytes, r.release_notes AS changelog, r.published_at AS createdAt, COALESCE(d.downloads, 0) AS downloads FROM apps a JOIN LATERAL (SELECT id, version, platform, file_name, size_bytes, release_notes, channel, published_at FROM releases WHERE app_slug = a.app_slug AND status = 'published' ORDER BY published_at DESC LIMIT 1) r ON TRUE LEFT JOIN (SELECT release_id, COUNT(*) AS downloads FROM download_events GROUP BY release_id) d ON d.release_id = r.id ORDER BY r.published_at DESC LIMIT 500"
      ).all();
      const apps = (result.results || []).map((row) => ({ ...row, size: formatBytes(row.sizeBytes), rating: null }));
      return json(res, 200, { success: true, apps, total: apps.length });
    } catch (error) {
      console.error("Downloader catalog failed:", error instanceof Error ? error.message : "unknown error");
      return json(res, 503, { success: false, error: "catalog_unavailable", apps: [] });
    }
  });

  app.get("/api/check-update", async (req, res) => {
    try {
      if (!env.DB) return json(res, 503, { success: false, error: "database_not_configured" });
      const appId = String(req.query.appId || "").trim();
      const currentVersion = String(req.query.currentVersion || "").trim();
      if (!appId) return json(res, 400, { success: false, error: "app_id_required" });
      const latest = await env.DB.prepare(
        "SELECT id, app_slug AS appSlug, app_name AS appName, version, platform, file_name AS filename, size_bytes AS sizeBytes, release_notes AS changelog, channel FROM releases WHERE status = 'published' AND (app_slug = ? OR lower(app_name) = lower(?)) ORDER BY published_at DESC LIMIT 1"
      ).bind(appId, appId).first();
      if (!latest) return json(res, 404, { success: false, hasUpdate: false, message: "App không tồn tại." });
      const hasUpdate = compareVersions(latest.version, currentVersion) > 0;
      const origin = env.PUBLIC_BASE_URL || (req.protocol + "://" + req.get("host"));
      return json(res, 200, {
        success: true,
        hasUpdate,
        latestVersion: latest.version,
        downloadUrl: new URL("/api/download/" + encodeURIComponent(latest.id), origin).toString(),
        changelog: latest.changelog,
        size: formatBytes(latest.sizeBytes),
        platform: latest.platform
      });
    } catch (error) {
      console.error("Downloader update check failed:", error instanceof Error ? error.message : "unknown error");
      return json(res, 503, { success: false, error: "update_check_unavailable" });
    }
  });

  app.get("/api/download/:id", async (req, res) => {
    try {
      if (!env.DB || !env.RELEASES) return json(res, 503, { success: false, error: "download_storage_unavailable" });
      const id = String(req.params.id || "");
      const release = await env.DB.prepare(
        "SELECT id, app_slug AS appSlug, file_name AS fileName, r2_key AS objectKey, size_bytes AS sizeBytes, sha256 FROM releases WHERE status = 'published' AND (id = ? OR app_slug = ?) ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, published_at DESC LIMIT 1"
      ).bind(id, id, id).first();
      if (!release || !String(release.objectKey || "").startsWith("published/")) return json(res, 404, { success: false, error: "release_not_found" });
      const object = await env.RELEASES.get(release.objectKey);
      if (!object) return json(res, 404, { success: false, error: "artifact_not_found" });
      await env.DB.prepare("INSERT INTO download_events (id, release_id, downloaded_at) VALUES (?, ?, ?)").bind(randomUUID(), release.id, new Date().toISOString()).run();
      const headers = new Headers();
      if (typeof object.writeHttpMetadata === "function") object.writeHttpMetadata(headers);
      headers.set("Content-Disposition", "attachment; filename=\"" + String(release.fileName || "download.bin").replace(/["\\\r\n]/g, "_") + "\"");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Cache-Control", "private, no-store");
      headers.set("Content-Length", String(object.size || release.sizeBytes));
      if (release.sha256) headers.set("X-Checksum-SHA256", release.sha256);
      return helpers.sendWebResponse(new Response(object.body, { headers }), res);
    } catch (error) {
      console.error("Downloader download failed:", error instanceof Error ? error.message : "unknown error");
      return json(res, 503, { success: false, error: "download_unavailable" });
    }
  });

  app.post("/api/admin/upload", async (req, res) => {
    try {
      const incoming = await helpers.toWebRequest(req, helpers.maxBodyBytes);
      const form = await incoming.formData();
      const file = form.get("softwareFile") || form.get("file");
      if (!file || typeof file.arrayBuffer !== "function") return json(res, 400, { success: false, error: "artifact_required" });
      const normalized = new FormData();
      normalized.set("file", file, file.name || "artifact.bin");
      normalized.set("appName", String(form.get("name") || form.get("appName") || ""));
      normalized.set("appSlug", String(form.get("appSlug") || ""));
      normalized.set("version", String(form.get("version") || ""));
      normalized.set("platform", String(form.get("platform") || platformFromCategory(form.get("category"))));
      normalized.set("channel", String(form.get("channel") || "stable"));
      normalized.set("releaseNotes", String(form.get("releaseNotes") || form.get("changelog") || ""));
      const request = new Request(incoming.url, { method: "POST", body: normalized });
      const response = await publishArtifact({ request, env, data: { adminIdentity: req.adminIdentity } }, "admin");
      return helpers.sendWebResponse(response, res);
    } catch (error) {
      if (error?.status === 413) return json(res, 413, { success: false, error: "payload_too_large" });
      console.error("Downloader upload failed:", error instanceof Error ? error.message : "unknown error");
      return json(res, 400, { success: false, error: "invalid_upload_request" });
    }
  });

  app.put("/api/admin/apps/:id", async (req, res) => {
    try {
      const request = await helpers.toWebRequest(req, helpers.maxBodyBytes);
      const body = await request.json();
      const slug = String(req.params.id || "").toLowerCase();
      const name = String(body.name || "").trim().slice(0, 120);
      const channelValue = String(body.channel || "stable").toLowerCase();
      const channel = CHANNELS.has(channelValue) ? channelValue : "stable";
      const notes = String(body.changelog ?? body.releaseNotes ?? "").slice(0, 2000);
      const existing = await env.DB.prepare("SELECT app_slug FROM apps WHERE app_slug = ?").bind(slug).first();
      if (!existing) return json(res, 404, { success: false, error: "app_not_found" });
      const result = await env.DB.batch([
        env.DB.prepare("UPDATE apps SET app_name = ? WHERE app_slug = ?").bind(name || slug, slug),
        env.DB.prepare("UPDATE releases SET app_name = ?, channel = ?, release_notes = ? WHERE app_slug = ? AND status = 'published'").bind(name || slug, channel, notes, slug)
      ]);
      return json(res, 200, { success: true, message: "Đã cập nhật ứng dụng.", app: { id: slug, name: name || slug, channel }, changes: result });
    } catch (error) {
      console.error("Downloader app update failed:", error instanceof Error ? error.message : "unknown error");
      return json(res, 503, { success: false, error: "app_update_failed" });
    }
  });

  app.delete("/api/admin/apps/:id", async (req, res) => {
    try {
      const slug = String(req.params.id || "").toLowerCase();
      const result = await env.DB.prepare("UPDATE releases SET status = 'withdrawn' WHERE app_slug = ? AND status = 'published'").bind(slug).run();
      return json(res, 200, { success: true, message: "Ứng dụng đã được ẩn khỏi Store.", changes: result.meta?.changes || 0 });
    } catch (error) {
      console.error("Downloader app removal failed:", error instanceof Error ? error.message : "unknown error");
      return json(res, 503, { success: false, error: "app_withdraw_failed" });
    }
  });
}
