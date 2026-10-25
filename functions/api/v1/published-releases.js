export async function onRequestGet(context) {
  const env = context.env || {};
  if (!env.DB || !env.RELEASES?.head) {
    return Response.json({ success: false, error: "release_storage_not_configured", releases: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await env.DB.prepare("SELECT id, app_slug AS appSlug, app_name AS appName, version, platform, file_name AS fileName, r2_key AS r2Key, size_bytes AS sizeBytes, sha256, release_notes AS releaseNotes, published_at AS publishedAt FROM releases WHERE status = 'published' ORDER BY published_at DESC LIMIT 500").all();
    const releases = await Promise.all((result.results || []).map(async (row) => {
      let object = null;
      try { object = await env.RELEASES.head(row.r2Key); } catch {}
      const available = Boolean(object);
      const downloadUrl = available ? new URL("/api/v1/published/download?key=" + encodeURIComponent(row.r2Key), context.request.url).toString() : null;
      return {
        id: row.id,
        key: row.r2Key,
        appSlug: row.appSlug,
        appName: row.appName,
        version: row.version,
        platform: row.platform,
        fileName: row.fileName,
        sizeBytes: object?.size ?? row.sizeBytes,
        sha256: row.sha256,
        releaseNotes: row.releaseNotes,
        publishedAt: row.publishedAt,
        available,
        downloadUrl
      };
    }));
    return Response.json({ success: true, total: releases.length, available: releases.filter((item) => item.available).length, releases }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("published release query failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ success: false, error: "release_catalog_unavailable", releases: [] }, { status: 503 });
  }
}
