export async function onRequestGet(context) {
  const { DB, RELEASES } = context.env || {};
  const url = new URL(context.request.url);
  const platform = (url.searchParams.get("platform") || "windows").toLowerCase();
  const clientVersion = url.searchParams.get("clientVersion") || "0.0.0";
  if (!DB || !RELEASES) return Response.json({ success: false, error: "release_storage_not_configured" }, { status: 503 });
  try {
    const row = await DB.prepare("SELECT id, version, platform, file_name AS fileName, r2_key AS r2Key, size_bytes AS sizeBytes, sha256, release_notes AS releaseNotes, published_at AS publishedAt FROM releases WHERE status = 'published' AND platform = ? ORDER BY published_at DESC LIMIT 1").bind(platform).first();
    if (!row) return Response.json({ updateAvailable: false, available: false, platform, message: "Chưa có bản phát hành cho nền tảng này." });
    const object = await RELEASES.head(row.r2Key);
    const parse = (value) => String(value).split(/[.-]/).map((part) => Number(part) || 0);
    const latest = parse(row.version), current = parse(clientVersion);
    let newer = false;
    for (let i = 0; i < Math.max(latest.length, current.length); i++) {
      if ((latest[i] || 0) !== (current[i] || 0)) { newer = (latest[i] || 0) > (current[i] || 0); break; }
    }
    return Response.json({
      success: true,
      platform,
      version: row.version,
      updateAvailable: Boolean(object) && newer,
      available: Boolean(object),
      publishedAt: row.publishedAt,
      releaseNotes: row.releaseNotes,
      fileName: row.fileName,
      sizeBytes: object?.size ?? row.sizeBytes,
      sha256: row.sha256,
      downloadUrl: object ? new URL("/api/v1/published/download?key=" + encodeURIComponent(row.r2Key), context.request.url).toString() : null
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("update check failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ success: false, error: "update_check_failed" }, { status: 503 });
  }
}
