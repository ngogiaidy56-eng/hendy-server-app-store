export async function onRequestGet(context) {
  const env = context.env || {};
  if (!env.DB || !env.RELEASES?.head) {
    return Response.json({ success: false, error: "release_storage_not_configured", schemaVersion: "1.0.0", artifacts: [] }, { status: 503 });
  }
  try {
    const result = await env.DB.prepare("SELECT id, app_slug AS appSlug, app_name AS appName, version, platform, file_name AS fileName, r2_key AS r2Key, size_bytes AS sizeBytes, sha256, release_notes AS releaseNotes, published_at AS publishedAt FROM releases WHERE status = 'published' ORDER BY published_at DESC LIMIT 500").all();
    const artifacts = await Promise.all((result.results || []).map(async (row) => {
      let stored = null;
      try { stored = await env.RELEASES.head(row.r2Key); } catch {}
      const available = Boolean(stored);
      return {
        id: row.id,
        filename: row.fileName,
        version: row.version,
        platform: row.platform,
        appId: row.appSlug,
        appName: row.appName,
        sizeBytes: stored?.size ?? row.sizeBytes,
        sha256: row.sha256,
        url: available ? new URL("/api/v1/published/download?key=" + encodeURIComponent(row.r2Key), context.request.url).toString() : null,
        uploadedAt: row.publishedAt,
        releaseNotes: row.releaseNotes,
        available,
        verified: available && /^[a-f0-9]{64}$/i.test(String(row.sha256 || ""))
      };
    }));
    return Response.json({
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      repository: "https://github.com/ngogiaidy56-eng/hendy-server-app-store",
      app: { id: "hendy-app-store", name: "Hendy App Store", publisher: "Hendy" },
      totalArtifacts: artifacts.length,
      artifacts,
      note: "Artifact chỉ được đánh dấu available khi object thật tồn tại trong R2."
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("public manifest query failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ success: false, error: "manifest_unavailable", artifacts: [] }, { status: 503 });
  }
}
