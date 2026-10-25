export async function onRequestGet(context) {
  const env = context.env || {};
  const url = new URL(context.request.url);
  const fileName = String(url.searchParams.get("file") || "").split(/[\\/]/).pop() || "";
  if (!fileName || fileName.includes("..") || !/^[a-zA-Z0-9._-]{1,180}$/.test(fileName)) {
    return Response.json({ success: false, error: "invalid_file_name" }, { status: 400 });
  }
  if (!env.DB || !env.RELEASES) return Response.json({ success: false, error: "release_storage_not_configured" }, { status: 503 });
  try {
    const row = await env.DB.prepare("SELECT file_name AS fileName, r2_key AS r2Key, sha256 FROM releases WHERE file_name = ? AND status = 'published' ORDER BY published_at DESC LIMIT 1").bind(fileName).first();
    if (!row) return Response.json({ success: false, error: "artifact_not_found" }, { status: 404 });
    const object = await env.RELEASES.get(row.r2Key);
    if (!object) return Response.json({ success: false, error: "artifact_not_found" }, { status: 404 });
    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
    headers.set("Content-Disposition", "attachment; filename=\"" + fileName.replace(/["\r\n]/g, "_") + "\"");
    headers.set("Content-Length", String(object.size));
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("X-Content-Type-Options", "nosniff");
    if (/^[a-f0-9]{64}$/i.test(String(row.sha256 || ""))) headers.set("X-Artifact-SHA256", row.sha256);
    if (context.request.method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    console.error("artifact compatibility download failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ success: false, error: "download_failed" }, { status: 503 });
  }
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, headers: response.headers });
}
