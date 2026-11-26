const SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const ALLOWED_PLATFORMS = new Set(["web", "windows", "android", "ios", "macos", "linux"]);

function parseSemver(input) {
  const value = String(input || "").trim().replace(/^v/, "");
  const match = SEMVER_PATTERN.exec(value);
  if (!match) return null;
  return {
    core: match.slice(1, 4).map((part) => BigInt(part)),
    prerelease: match[4] ? match[4].split(".") : null
  };
}

function compareSemver(left, right) {
  for (let index = 0; index < 3; index++) {
    if (left.core[index] > right.core[index]) return 1;
    if (left.core[index] < right.core[index]) return -1;
  }
  if (left.prerelease === null && right.prerelease === null) return 0;
  if (left.prerelease === null) return 1;
  if (right.prerelease === null) return -1;
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index++) {
    const a = left.prerelease[index], b = right.prerelease[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    if (a === b) continue;
    const aNumeric = /^[0-9]+$/.test(a), bNumeric = /^[0-9]+$/.test(b);
    if (aNumeric && bNumeric) return BigInt(a) > BigInt(b) ? 1 : -1;
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a > b ? 1 : -1;
  }
  return 0;
}

export async function onRequestGet(context) {
  const { DB, RELEASES } = context.env || {};
  const url = new URL(context.request.url);
  const platform = (url.searchParams.get("platform") || "windows").toLowerCase();
  const clientVersion = parseSemver(url.searchParams.get("clientVersion") || "0.0.0");
  if (!DB || !RELEASES?.head) return Response.json({ success: false, error: "release_storage_not_configured" }, { status: 503 });
  if (!ALLOWED_PLATFORMS.has(platform)) return Response.json({ success: false, error: "invalid_platform" }, { status: 400 });
  if (!clientVersion) return Response.json({ success: false, error: "invalid_client_version", message: "clientVersion phải là phiên bản SemVer hợp lệ." }, { status: 400 });
  try {
    const row = await DB.prepare("SELECT id, version, platform, file_name AS fileName, r2_key AS r2Key, size_bytes AS sizeBytes, sha256, release_notes AS releaseNotes, published_at AS publishedAt FROM releases WHERE status = 'published' AND platform = ? ORDER BY published_at DESC LIMIT 1").bind(platform).first();
    if (!row) return Response.json({ success: true, updateAvailable: false, available: false, platform, message: "Chưa có bản phát hành cho nền tảng này." }, { headers: { "Cache-Control": "no-store" } });
    const latestVersion = parseSemver(row.version);
    if (!latestVersion) {
      console.error("published release has invalid SemVer", row.id);
      return Response.json({ success: false, error: "invalid_published_version" }, { status: 503 });
    }
    const object = await RELEASES.head(row.r2Key);
    return Response.json({
      success: true,
      platform,
      version: row.version,
      updateAvailable: Boolean(object) && compareSemver(latestVersion, clientVersion) > 0,
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
