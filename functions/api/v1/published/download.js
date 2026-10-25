export async function onRequestGet(context) {
  const env = context.env || {};
  const url = new URL(context.request.url);
  const key = url.searchParams.get("key") || "";
  if (!key.startsWith("published/") || key.split("/").some((part) => part === ".." || part === "")) {
    return Response.json({ success: false, error: "invalid_artifact_key" }, { status: 400 });
  }
  if (!env.DB || !env.RELEASES) return Response.json({ success: false, error: "release_storage_not_configured" }, { status: 503 });
  try {
    const row = await env.DB.prepare("SELECT id, file_name AS fileName, sha256 FROM releases WHERE r2_key = ? AND status = 'published' LIMIT 1").bind(key).first();
    if (!row) return Response.json({ success: false, error: "artifact_not_found" }, { status: 404 });
    const object = await env.RELEASES.get(key);
    if (!object) return Response.json({ success: false, error: "artifact_not_found" }, { status: 404 });
    const name = String(row.fileName || key.split("/").pop() || "download").replace(/["\r\n]/g, "_");
    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
    headers.set("Content-Disposition", "attachment; filename=\"" + name + "\"; filename*=UTF-8''" + encodeURIComponent(name));
    headers.set("Content-Length", String(object.size));
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "public, max-age=3600");
    if (/^[a-f0-9]{64}$/i.test(String(row.sha256 || ""))) headers.set("X-Artifact-SHA256", row.sha256);
    if (context.request.method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    console.error("artifact download failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ success: false, error: "download_failed" }, { status: 503 });
  }
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, headers: response.headers });
}
