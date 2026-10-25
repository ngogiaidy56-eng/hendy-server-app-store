/**
 * Hendy Tools frontend + public release API.
 *
 * Runtime: Cloudflare Workers with Static Assets.
 * The Worker named "hendy-tool-releas" serves the UI at:
 * https://hendy-tool-releas.ngogiaidy56.workers.dev/
 */

export interface AssetBinding {
  fetch(request: Request | string): Promise<Response>;
}

interface R2ObjectMetadata {
  size: number;
  etag?: string;
  key?: string;
  uploaded?: Date | string;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
}

interface R2ObjectBody extends R2ObjectMetadata {
  body: ReadableStream<Uint8Array>;
}

export interface ReleaseBucketBinding {
  head(key: string): Promise<R2ObjectMetadata | null>;
  get(key: string): Promise<R2ObjectBody | null>;
  put?(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }
  ): Promise<R2ObjectMetadata>;
  list?(options?: { prefix?: string; limit?: number; include?: string[] }): Promise<{
    objects: R2ObjectMetadata[];
    truncated?: boolean;
    cursor?: string;
  }>;
}

export interface Env {
  ASSETS?: AssetBinding;
  RELEASES_BUCKET?: ReleaseBucketBinding;
  ENVIRONMENT?: string;
  APP_NAME?: string;
  PUBLIC_BASE_URL?: string;
  RELEASE_PUBLISH_TOKEN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_ADMIN_EMAILS?: string;
}

type ReleaseRecord = {
  version: string;
  build: number;
  platform: "windows" | "android";
  channel: "stable";
  fileName: string;
  objectKey: string;
  minSupportedVersion: string;
  releaseNotes: string;
};

const RELEASE_CATALOG: ReleaseRecord[] = [
  {
    version: "3.2.0",
    build: 30200,
    platform: "windows",
    channel: "stable",
    fileName: "HendyToolsPro-3.2.0-Setup.exe",
    objectKey: "windows/3.2.0/HendyToolsPro-3.2.0-Setup.exe",
    minSupportedVersion: "2.0.0",
    releaseNotes: "Bản ghi phát hành mẫu. Chỉ phân phối sau khi tải artifact đã build thật lên R2.",
  },
  {
    version: "3.2.0",
    build: 30200,
    platform: "android",
    channel: "stable",
    fileName: "HendyToolsMobile-3.2.0.apk",
    objectKey: "android/3.2.0/HendyToolsMobile-3.2.0.apk",
    minSupportedVersion: "2.0.0",
    releaseNotes: "Bản ghi phát hành mẫu. Chỉ phân phối sau khi tải artifact đã build thật lên R2.",
  },
];

function baseUrl(request: Request, env: Env): string {
  const configured = env.PUBLIC_BASE_URL?.trim();
  return (configured || new URL(request.url).origin).replace(/\/$/, "");
}

function securityHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  result.set("X-Content-Type-Options", "nosniff");
  result.set("X-Frame-Options", "SAMEORIGIN");
  result.set("Referrer-Policy", "strict-origin-when-cross-origin");
  result.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return result;
}

function json(data: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = securityHeaders(extra);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function sha256From(metadata: R2ObjectMetadata | null): string | null {
  const value = metadata?.customMetadata?.sha256?.toLowerCase();
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

function contentType(fileName: string, storedType?: string): string {
  if (storedType) return storedType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".apk")) return "application/vnd.android.package-archive";
  if (lower.endsWith(".exe")) return "application/vnd.microsoft.portable-executable";
  if (lower.endsWith(".msi")) return "application/x-msi";
  if (lower.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

async function releasesResponse(request: Request, env: Env): Promise<Response> {
  const origin = baseUrl(request, env);
  const releases = await Promise.all(
    RELEASE_CATALOG.map(async (release) => {
      const metadata = env.RELEASES_BUCKET
        ? await env.RELEASES_BUCKET.head(release.objectKey)
        : null;
      const available = metadata !== null;
      const sha256 = sha256From(metadata);
      return {
        version: release.version,
        build: release.build,
        platform: release.platform,
        channel: release.channel,
        fileName: release.fileName,
        fileSizeBytes: metadata?.size ?? null,
        sha256,
        checksumVerified: sha256 !== null,
        available,
        publishedAt: metadata?.customMetadata?.publishedAt ?? null,
        minSupportedVersion: release.minSupportedVersion,
        releaseNotes: release.releaseNotes,
        downloadUrl: available
          ? `${origin}/api/v1/downloads/artifacts/${encodeURIComponent(release.fileName)}`
          : null,
      };
    })
  );

  return json({
    success: true,
    service: "Hendy Tools Release API",
    total: releases.length,
    available: releases.filter((release) => release.available).length,
    note: "Metadata mẫu chưa phải bằng chứng rằng gói cài đặt đã được phát hành.",
    releases,
  });
}

async function downloadRelease(request: Request, env: Env): Promise<Response> {
  if (!env.RELEASES_BUCKET) {
    return json({
      success: false,
      error: "release_storage_not_configured",
      message: "Worker chưa được gắn R2 bucket binding RELEASES_BUCKET.",
    }, 503);
  }

  const url = new URL(request.url);
  const artifactPrefix = "/api/v1/downloads/artifacts/";
  let release: ReleaseRecord | undefined;

  if (url.pathname.startsWith(artifactPrefix)) {
    let requestedFile = "";
    try {
      requestedFile = decodeURIComponent(url.pathname.slice(artifactPrefix.length));
    } catch {
      return json({ success: false, error: "invalid_artifact_name" }, 400);
    }
    release = RELEASE_CATALOG.find((candidate) => candidate.fileName === requestedFile);
  } else {
    const platform = url.searchParams.get("platform");
    const channel = url.searchParams.get("channel") || "stable";
    release = RELEASE_CATALOG.find(
      (candidate) => candidate.platform === platform && candidate.channel === channel
    );
  }

  if (!release) {
    return json({
      success: false,
      error: "release_not_found",
      message: "Không có bản phát hành tương ứng với nền tảng và kênh đã chọn.",
    }, 404);
  }

  const object = await env.RELEASES_BUCKET.get(release.objectKey);
  if (!object) {
    return json({
      success: false,
      error: "artifact_not_published",
      message: "Chưa tìm thấy file cài đặt thật trong R2. Hãy tải artifact vào đúng object key trước khi phát hành.",
      requiredObjectKey: release.objectKey,
    }, 404);
  }

  const headers = securityHeaders();
  headers.set("Content-Type", contentType(release.fileName, object.httpMetadata?.contentType));
  headers.set("Content-Disposition", `attachment; filename="${release.fileName}"`);
  headers.set("Content-Length", String(object.size));
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  const sha256 = sha256From(object);
  if (sha256) headers.set("X-Artifact-SHA256", sha256);

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(object.body, { status: 200, headers });
}


async function manifestResponse(request: Request, env: Env): Promise<Response> {
  const origin = baseUrl(request, env);
  const artifactEntries = await Promise.all(
    RELEASE_CATALOG.map(async (release) => {
      const metadata = env.RELEASES_BUCKET
        ? await env.RELEASES_BUCKET.head(release.objectKey)
        : null;
      const sha256 = sha256From(metadata);
      const available = metadata !== null;
      return {
        id: `release-${release.platform}-${release.version}`,
        filename: release.fileName,
        version: release.version,
        platform: release.platform,
        format: release.fileName.slice(release.fileName.lastIndexOf(".")),
        arch: release.platform === "windows" ? "x86_64" : "arm64",
        sizeBytes: metadata?.size ?? null,
        sha256,
        url: available ? `${origin}/api/v1/downloads/artifacts/${encodeURIComponent(release.fileName)}` : null,
        uploadedAt: metadata?.customMetadata?.publishedAt ?? null,
        contentType: contentType(release.fileName, metadata?.httpMetadata?.contentType),
        available,
        verified: sha256 !== null,
      };
    })
  );
  return json({
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    repository: "https://github.com/ngogiaidy56-eng/hendy-tool-releas",
    app: {
      id: "hendy-tools-pro",
      name: "Hendy Tools Pro",
      slug: "hendy-tools",
      latestVersion: "3.2.0",
      publisher: "Hendy Tools",
    },
    totalArtifacts: artifactEntries.length,
    artifacts: artifactEntries,
    note: "Các artifact chỉ được coi là đã phát hành khi tồn tại trong R2.",
  });
}



function safeSlug(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function tokenMatches(provided: string, expected: string): boolean {
  let diff = provided.length ^ expected.length;
  const count = Math.max(provided.length, expected.length);
  for (let index = 0; index < count; index++) {
    diff |= (provided.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return diff === 0;
}

function hexSha256(bytes: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest("SHA-256", bytes).then((digest) =>
    Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

async function publishedReleasesResponse(request: Request, env: Env): Promise<Response> {
  if (!env.RELEASES_BUCKET?.list) {
    return json({ success: false, error: "release_catalog_unavailable", message: "R2 bucket chưa hỗ trợ liệt kê artifact." }, 503);
  }
  const result = await env.RELEASES_BUCKET.list({
    prefix: "published/",
    limit: 1000,
    include: ["customMetadata"],
  });
  const origin = baseUrl(request, env);
  const releases = result.objects
    .filter((object) => Boolean(object.key && object.key.startsWith("published/")))
    .map((object) => {
      const metadata = object.customMetadata || {};
      const key = object.key || "";
      const fileName = metadata.fileName || key.split("/").pop() || "artifact";
      const publishedAt = metadata.publishedAt ||
        (object.uploaded instanceof Date ? object.uploaded.toISOString() : object.uploaded || null);
      const encodedKey = key.split("/").map((part) => encodeURIComponent(part)).join("/");
      return {
        key,
        appName: metadata.appName || key.split("/")[1] || "Application",
        appSlug: metadata.appSlug || key.split("/")[1] || "application",
        version: metadata.version || key.split("/")[2] || "0.0.0",
        platform: metadata.platform || "web",
        fileName,
        sizeBytes: object.size,
        sha256: sha256From(object),
        publishedAt,
        releaseNotes: metadata.releaseNotes || "",
        downloadUrl: origin + "/api/v1/published/downloads/" + encodedKey,
      };
    })
    .sort((left, right) => String(right.publishedAt || "").localeCompare(String(left.publishedAt || "")));
  return json({ success: true, total: releases.length, releases, truncated: Boolean(result.truncated) });
}

async function publishArtifact(request: Request, env: Env, authMode: "admin" | "ci" = "admin"): Promise<Response> {
  const denied = authMode === "ci"
    ? await authorizeCiPublisher(request, env)
    : await authorizeAdmin(request, env);
  if (denied) return denied;
  if (!env.RELEASES_BUCKET || !env.RELEASES_BUCKET.put) {
    return json({
      success: false,
      error: "publish_storage_unavailable",
      message: "R2 bucket hoặc quyền put chưa sẵn sàng cho API publish.",
    }, 503);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: "invalid_multipart", message: "Yêu cầu phải là multipart/form-data." }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ success: false, error: "artifact_required", message: "Thiếu trường file trong dữ liệu tải lên." }, 400);
  }
  const maxUploadBytes = 25 * 1024 * 1024;
  if (file.size < 1 || file.size > maxUploadBytes) {
    return json({ success: false, error: "artifact_size_limit", message: "Artifact phải lớn hơn 0 byte và không vượt quá 25 MB cho endpoint upload trực tiếp." }, 413);
  }

  const appName = String(form.get("appName") || "").trim().slice(0, 120);
  const appSlug = safeSlug(String(form.get("appSlug") || appName));
  const version = String(form.get("version") || "").trim();
  const platform = String(form.get("platform") || "web").trim().toLowerCase();
  const releaseNotes = String(form.get("releaseNotes") || "").trim().slice(0, 2000);
  if (!appName || !appSlug) {
    return json({ success: false, error: "invalid_app", message: "Tên ứng dụng và slug là bắt buộc." }, 400);
  }
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(version)) {
    return json({ success: false, error: "invalid_version", message: "Phiên bản phải dùng SemVer, ví dụ 1.2.3." }, 400);
  }
  if (!["web", "windows", "android", "ios", "macos", "linux"].includes(platform)) {
    return json({ success: false, error: "invalid_platform", message: "Nền tảng không được hỗ trợ." }, 400);
  }
  const rawName = file.name.split(/[\\/]/).pop() || "artifact.bin";
  const fileName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  if (!fileName || fileName === "." || fileName === "..") {
    return json({ success: false, error: "invalid_filename", message: "Tên artifact không hợp lệ." }, 400);
  }

  const bytes = await file.arrayBuffer();
  const sha256 = await hexSha256(bytes);
  const publishedAt = new Date().toISOString();
  const key = "published/" + appSlug + "/" + version + "/" + fileName;
  const storedContentType = contentType(fileName, file.type || undefined);
  await env.RELEASES_BUCKET.put(key, bytes, {
    httpMetadata: { contentType: storedContentType },
    customMetadata: {
      appName,
      appSlug,
      version,
      platform,
      fileName,
      sha256,
      publishedAt,
      releaseNotes,
    },
  });
  const origin = baseUrl(request, env);
  const downloadUrl = origin + "/api/v1/published/downloads/" +
    key.split("/").map((part) => encodeURIComponent(part)).join("/");
  return json({
    success: true,
    message: "Artifact đã được tải lên R2.",
    key,
    appName,
    appSlug,
    version,
    platform,
    fileName,
    sizeBytes: file.size,
    sha256,
    publishedAt,
    releaseNotes,
    downloadUrl,
  }, 201);
}

async function downloadPublishedArtifact(request: Request, env: Env): Promise<Response> {
  if (!env.RELEASES_BUCKET) {
    return json({ success: false, error: "release_storage_not_configured" }, 503);
  }
  const prefix = "/api/v1/published/downloads/";
  let key: string;
  try {
    key = new URL(request.url).pathname.slice(prefix.length).split("/").map((part) => decodeURIComponent(part)).join("/");
  } catch {
    return json({ success: false, error: "invalid_artifact_key" }, 400);
  }
  if (!key.startsWith("published/") || key.split("/").some((part) => part === ".." || part === "")) {
    return json({ success: false, error: "invalid_artifact_key" }, 400);
  }
  const object = await env.RELEASES_BUCKET.get(key);
  if (!object) return json({ success: false, error: "artifact_not_found" }, 404);
  const safeName = (object.customMetadata?.fileName || key.split("/").pop() || "artifact").replace(/["\r\n]/g, "_");
  const headers = securityHeaders();
  headers.set("Content-Type", contentType(safeName, object.httpMetadata?.contentType));
  headers.set("Content-Disposition", "attachment; filename=\"" + safeName + "\"");
  headers.set("Content-Length", String(object.size));
  headers.set("Cache-Control", "public, max-age=3600");
  const sha256 = sha256From(object);
  if (sha256) headers.set("X-Artifact-SHA256", sha256);
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(object.body, { status: 200, headers });
}


type StorefrontConfig = {
  brandName: string;
  announcement: string;
  heroEyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  supportUrl: string;
  repositoryUrl: string;
};

const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  brandName: "Hendy Store",
  announcement: "",
  heroEyebrow: "ỨNG DỤNG · CÔNG CỤ · BẢN PHÁT HÀNH",
  heroTitle: "Tất cả ứng dụng",
  heroAccent: "trong một nơi.",
  heroDescription: "Khám phá ứng dụng và tải xuống các bản phát hành thật, với thông tin phiên bản và mã kiểm tra tệp rõ ràng.",
  supportUrl: "",
  repositoryUrl: "https://github.com/ngogiaidy56-eng/hendy-tool-releas",
};

function parseStorefrontConfig(value: unknown): StorefrontConfig {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const clean = (key: keyof StorefrontConfig, fallback: string, max = 500): string => {
    const input = record[key];
    return typeof input === "string" ? input.trim().slice(0, max) : fallback;
  };
  const safeUrl = (raw: string): string => {
    if (!raw) return "";
    try {
      const url = new URL(raw);
      return url.protocol === "https:" ? url.toString() : "";
    } catch { return ""; }
  };
  return {
    brandName: clean("brandName", DEFAULT_STOREFRONT_CONFIG.brandName, 70) || DEFAULT_STOREFRONT_CONFIG.brandName,
    announcement: clean("announcement", "", 240),
    heroEyebrow: clean("heroEyebrow", DEFAULT_STOREFRONT_CONFIG.heroEyebrow, 100),
    heroTitle: clean("heroTitle", DEFAULT_STOREFRONT_CONFIG.heroTitle, 100),
    heroAccent: clean("heroAccent", DEFAULT_STOREFRONT_CONFIG.heroAccent, 100),
    heroDescription: clean("heroDescription", DEFAULT_STOREFRONT_CONFIG.heroDescription, 500),
    supportUrl: safeUrl(clean("supportUrl", "", 500)),
    repositoryUrl: safeUrl(clean("repositoryUrl", DEFAULT_STOREFRONT_CONFIG.repositoryUrl, 500)) || DEFAULT_STOREFRONT_CONFIG.repositoryUrl,
  };
}

function decodeJwtPart(value: string): Record<string, unknown> | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch { return null; }
}

function isCloudflareAccessConfigured(env: Env): boolean {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/+$/, "");
  const audiences = (env.CF_ACCESS_AUD || "").split(",").map((value) => value.trim()).filter(Boolean);
  const emails = (env.CF_ACCESS_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (!teamDomain || audiences.length === 0 || emails.length === 0) return false;
  try {
    const issuer = new URL(teamDomain);
    return issuer.protocol === "https:" &&
      issuer.hostname.endsWith(".cloudflareaccess.com") &&
      !issuer.username && !issuer.password;
  } catch {
    return false;
  }
}

function runtimeChecks(env: Env) {
  return {
    staticAssets: Boolean(env.ASSETS?.fetch),
    releaseStorage: Boolean(env.RELEASES_BUCKET?.head && env.RELEASES_BUCKET?.get &&
      env.RELEASES_BUCKET?.put && env.RELEASES_BUCKET?.list),
    adminAccess: isCloudflareAccessConfigured(env),
    ciPublisher: Boolean(env.RELEASE_PUBLISH_TOKEN?.trim()),
  };
}

async function verifyCloudflareAccess(request: Request, env: Env): Promise<Response | null> {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/+$/, "");
  const expectedAudiences = (env.CF_ACCESS_AUD || "").split(",").map((value) => value.trim()).filter(Boolean);
  const allowedAdminEmails = (env.CF_ACCESS_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (!teamDomain || expectedAudiences.length === 0 || allowedAdminEmails.length === 0) {
    return json({
      success: false,
      error: "admin_access_not_configured",
      message: "Cần cấu hình CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD và CF_ACCESS_ADMIN_EMAILS (danh sách email quản trị cho phép).",
    }, 503);
  }
  try {
    const issuer = new URL(teamDomain);
    if (issuer.protocol !== "https:" || !issuer.hostname.endsWith(".cloudflareaccess.com")) throw new Error("Invalid team domain");
  } catch {
    return json({ success: false, error: "invalid_access_config", message: "CF_ACCESS_TEAM_DOMAIN phải là HTTPS team domain của Cloudflare Access." }, 503);
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return json({
    success: false,
    error: "cloudflare_access_required",
    message: "Đăng nhập qua Cloudflare Access để thực hiện thao tác quản trị.",
  }, 401);

  const parts = token.split(".");
  if (parts.length !== 3) return json({ success: false, error: "invalid_access_token" }, 401);
  const header = decodeJwtPart(parts[0]);
  const claims = decodeJwtPart(parts[1]);
  const kid = typeof header?.kid === "string" ? header.kid : "";
  if (!header || header.alg !== "RS256" || !claims || !kid) return json({ success: false, error: "invalid_access_token" }, 401);

  const now = Math.floor(Date.now() / 1000);
  const aud = claims.aud;
  const audMatches = Array.isArray(aud)
    ? expectedAudiences.some((expected) => aud.includes(expected))
    : typeof aud === "string" && expectedAudiences.includes(aud);
  if (claims.iss !== teamDomain || !audMatches || typeof claims.exp !== "number" || claims.exp <= now ||
      (typeof claims.nbf === "number" && claims.nbf > now)) {
    return json({ success: false, error: "access_claims_invalid", message: "Access JWT hết hạn hoặc không khớp issuer/audience." }, 401);
  }

  try {
    const keyResponse = await fetch(teamDomain + "/cdn-cgi/access/certs", { headers: { Accept: "application/json" } });
    if (!keyResponse.ok) throw new Error("Could not load Access signing keys");
    const keySet = await keyResponse.json() as { keys?: JsonWebKey[] };
    const jwk = keySet.keys?.find((key) => (key as JsonWebKey & { kid?: string }).kid === kid);
    if (!jwk) throw new Error("Signing key was not found");
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const encodedSig = parts[2].replace(/-/g, "+").replace(/_/g, "/");
    const sigBytes = Uint8Array.from(atob(encodedSig + "=".repeat((4 - encodedSig.length % 4) % 4)), (character) => character.charCodeAt(0));
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sigBytes, new TextEncoder().encode(parts[0] + "." + parts[1]));
    if (!valid) throw new Error("JWT signature did not verify");
    // Only trust identity claims after the JWT signature has been verified.
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    if (!email || !allowedAdminEmails.includes(email)) {
      return json({ success: false, error: "admin_identity_not_allowed", message: "Tài khoản Cloudflare Access này chưa được cấp quyền quản trị." }, 403);
    }
    return null;
  } catch (error) {
    console.error("Cloudflare Access validation error", error);
    return json({ success: false, error: "access_verification_failed", message: "Không xác minh được danh tính qua Cloudflare Access." }, 401);
  }
}

function adminAccessPage(status: number): Response {
  const needsSetup = status === 503;
  const identityDenied = status === 403;
  const title = needsSetup
    ? "Không gian quản trị chưa sẵn sàng"
    : identityDenied ? "Tài khoản chưa được cấp quyền" : "Vui lòng đăng nhập để tiếp tục";
  const message = needsSetup
    ? "Không gian quản trị hiện chưa thể mở. Vui lòng thử lại sau hoặc liên hệ người vận hành hệ thống."
    : identityDenied
      ? "Tài khoản hiện tại chưa được cấp quyền truy cập không gian quản trị."
      : "Bạn cần đăng nhập bằng tài khoản được cấp quyền để tiếp tục.";
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="same-origin">
<title>${title} — Hendy Admin</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#090b12;color:#e2e8f0}
*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 70% 5%,#312e8133,transparent 45%),#090b12}
main{width:min(100%,620px);border:1px solid #ffffff18;border-radius:28px;background:linear-gradient(145deg,#151724,#0f111a);padding:clamp(24px,6vw,44px);box-shadow:0 30px 100px #0008}
.brand{display:flex;align-items:center;gap:12px;font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#a5b4fc}
.mark{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;background:linear-gradient(135deg,#6366f1,#8b5cf6);font-size:20px;color:white;letter-spacing:0}
.pill{display:inline-flex;align-items:center;gap:8px;margin-top:30px;border:1px solid #fbbf2433;border-radius:999px;background:#fbbf240d;padding:7px 11px;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#fcd34d}
.dot{width:7px;height:7px;border-radius:50%;background:#fbbf24}
h1{margin:18px 0 12px;font-size:clamp(29px,5vw,42px);line-height:1.1;letter-spacing:-.045em}
p{margin:0;color:#a1a1aa;font-size:14px;line-height:1.85}
nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border-radius:12px;padding:0 16px;text-decoration:none;font-size:12px;font-weight:800}
.primary{background:#6366f1;color:#fff}.secondary{border:1px solid #ffffff1c;color:#cbd5e1}
small{display:block;margin-top:25px;color:#71717a;font-size:10px;line-height:1.8}
</style>
</head>
<body><main>
<div class="brand"><span class="mark">H</span><span>Hendy Admin Console<br><span style="color:#71717a;font-weight:600;letter-spacing:.08em">SECURE DEVELOPER WORKSPACE</span></span></div>
<div class="pill"><span class="dot"></span>${needsSetup ? "Access setup required" : identityDenied ? "Admin allow-list denied" : "Authentication required"}</div>
<h1>${title}</h1><p>${message}</p>
<nav><a class="primary" href="/">Quay về cửa hàng</a></nav>
<small>Trang quản trị không được cung cấp từ giao diện cửa hàng công khai. Không gửi secret hoặc token vào mã nguồn, trình duyệt hay tin nhắn.</small>
</main></body></html>`;
  const headers = securityHeaders({ "Content-Type": "text/html; charset=utf-8" });
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  return new Response(html, { status, headers });
}

async function authorizeCiPublisher(request: Request, env: Env): Promise<Response | null> {
  const expected = env.RELEASE_PUBLISH_TOKEN?.trim();
  if (!expected) {
    return json({
      success: false,
      error: "publish_not_configured",
      message: "CI publisher secret chưa được liên kết trên Worker.",
    }, 503);
  }
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\\s+(.+)$/i);
  if (!match || !tokenMatches(match[1].trim(), expected)) {
    return json({ success: false, error: "invalid_publish_token", message: "CI publisher token không hợp lệ." }, 401);
  }
  return null;
}

async function authorizeAdmin(request: Request, env: Env): Promise<Response | null> {
  const expected = env.RELEASE_PUBLISH_TOKEN?.trim();
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  // CI can publish with a server-side token. Interactive admins still authenticate
  // through Cloudflare Access even when the optional CI publisher token is absent.
  if (expected && match && tokenMatches(match[1].trim(), expected)) return null;
  return verifyCloudflareAccess(request, env);
}

async function storefrontConfigResponse(env: Env): Promise<Response> {
  if (!env.RELEASES_BUCKET) return json({ success: true, config: DEFAULT_STOREFRONT_CONFIG, source: "defaults" });
  const stored = await env.RELEASES_BUCKET.get("config/storefront.json");
  if (!stored) return json({ success: true, config: DEFAULT_STOREFRONT_CONFIG, source: "defaults" });
  try {
    const text = await new Response(stored.body).text();
    return json({ success: true, config: parseStorefrontConfig(JSON.parse(text)), source: "r2" });
  } catch {
    return json({ success: true, config: DEFAULT_STOREFRONT_CONFIG, source: "defaults", warning: "stored_config_invalid" });
  }
}

async function adminStatusResponse(request: Request, env: Env): Promise<Response> {
  const denied = await verifyCloudflareAccess(request, env);
  if (denied) return denied;
  return json({
    success: true,
    storageConfigured: Boolean(env.RELEASES_BUCKET?.put && env.RELEASES_BUCKET?.list),
    publishSecretConfigured: Boolean(env.RELEASE_PUBLISH_TOKEN?.trim()),
    accessConfigured: isCloudflareAccessConfigured(env),
    adminAllowlistConfigured: Boolean((env.CF_ACCESS_ADMIN_EMAILS || "").split(",").some((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))),
    nativeBuilders: {
      windows: "ci-runner-required",
      android: "android-sdk-required",
      ios: "macos-xcode-runner-required",
      macos: "macos-runner-required",
      linux: "linux-runner-required",
    },
    limits: { directUploadBytes: 25 * 1024 * 1024, sourceBundleBytes: 50 * 1024 * 1024 },
  });
}

async function saveStorefrontConfig(request: Request, env: Env): Promise<Response> {
  const denied = await authorizeAdmin(request, env);
  if (denied) return denied;
  if (!env.RELEASES_BUCKET?.put) return json({ success: false, error: "publish_storage_unavailable" }, 503);
  let body: unknown;
  try { body = await request.json(); }
  catch { return json({ success: false, error: "invalid_json" }, 400); }
  const candidate = body && typeof body === "object" ? (body as Record<string, unknown>).config : null;
  const config = parseStorefrontConfig(candidate);
  const encoded = new TextEncoder().encode(JSON.stringify(config, null, 2));
  await env.RELEASES_BUCKET.put("config/storefront.json", encoded, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { updatedAt: new Date().toISOString(), type: "storefront-config" },
  });
  return json({ success: true, message: "Đã lưu cấu hình giao diện cửa hàng vào R2.", config });
}

async function routeApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const isGet = method === "GET" || method === "HEAD";

  if (path === "/health" || path === "/healthz" || path === "/api/health" || path === "/api/v1/health") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const cf = request as Request & { cf?: { colo?: string; country?: string } };
    const checks = runtimeChecks(env);
    return json({
      status: "healthy",
      service: env.APP_NAME || "Hendy Tools Platform & App Downloader",
      runtime: "cloudflare-workers",
      environment: env.ENVIRONMENT || "production",
      timestamp: new Date().toISOString(),
      edge: { colo: cf.cf?.colo ?? null, country: cf.cf?.country ?? null },
      frontend: baseUrl(request, env),
      readiness: {
        adminUi: checks.staticAssets && checks.adminAccess,
        releaseApi: checks.releaseStorage,
        ciPublisher: checks.ciPublisher,
      },
      endpoints: ["/api/v1/meta", "/api/v1/releases", "/api/v1/runtime/readiness", "/api/v1/domains"],
    });
  }

  if (path === "/api/v1/runtime/readiness") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const checks = runtimeChecks(env);
    return json({
      success: true,
      service: env.APP_NAME || "Hendy Tools Platform & App Downloader",
      environment: env.ENVIRONMENT || "production",
      checkedAt: new Date().toISOString(),
      ready: checks.staticAssets && checks.releaseStorage && checks.adminAccess,
      adminReady: checks.staticAssets && checks.adminAccess,
      checks: {
        worker: true,
        staticAssets: checks.staticAssets,
        releaseStorage: checks.releaseStorage,
        adminAccess: checks.adminAccess,
        ciPublisher: checks.ciPublisher,
      },
    });
  }

  if (path === "/api" || path === "/api/meta" || path === "/api/v1/meta") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    return json({
      service: env.APP_NAME || "Hendy Tools Platform & App Downloader",
      version: "3.2.0",
      environment: env.ENVIRONMENT || "production",
      frontend: baseUrl(request, env),
      health: "/healthz",
      api: {
        releases: "/api/v1/releases",
        updateCheck: "/api/v1/update-check",
        domains: "/api/v1/domains",
        telemetry: "/api/v1/telemetry",
      },
      releaseStorage: env.RELEASES_BUCKET ? "r2-bound" : "not-configured",
    });
  }

  if (path === "/api/releases" || path === "/api/v1/releases") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    return releasesResponse(request, env);
  }

  if (path === "/api/v1/admin/manifest.json") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const denied = await verifyCloudflareAccess(request, env);
    if (denied) return denied;
    return manifestResponse(request, env);
  }

  if (path === "/api/v1/public/manifest.json" || path === "/api/v1/manifest.json") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    return manifestResponse(request, env);
  }

  if (path === "/api/releases/download" || path === "/api/v1/releases/download" || path.startsWith("/api/v1/downloads/artifacts/")) {
    if (method !== "GET" && method !== "HEAD") {
      return json({ success: false, error: "method_not_allowed" }, 405);
    }
    return downloadRelease(request, env);
  }

  if (path === "/api/update-check" || path === "/api/v1/update-check") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const platform = url.searchParams.get("platform") || "windows";
    const channel = url.searchParams.get("channel") || "stable";
    const clientBuild = Number(url.searchParams.get("clientBuild") || 0);
    const release = RELEASE_CATALOG.find(
      (candidate) => candidate.platform === platform && candidate.channel === channel
    );
    if (!release) {
      return json({ updateAvailable: false, message: "Không tìm thấy kênh phát hành phù hợp." }, 404);
    }

    const metadata = env.RELEASES_BUCKET
      ? await env.RELEASES_BUCKET.head(release.objectKey)
      : null;
    const available = metadata !== null;
    return json({
      appId: "hendy-tools-pro",
      platform: release.platform,
      channel: release.channel,
      latestVersion: release.version,
      latestBuild: release.build,
      updateAvailable: available && release.build > clientBuild,
      available,
      mandatory: false,
      minSupportedVersion: release.minSupportedVersion,
      releaseNotes: release.releaseNotes,
      fileName: release.fileName,
      fileSizeBytes: metadata?.size ?? null,
      sha256: sha256From(metadata),
      downloadUrl: available
        ? `${baseUrl(request, env)}/api/v1/downloads/artifacts/${encodeURIComponent(release.fileName)}`
        : null,
    });
  }


  if (path === "/api/v1/store-config") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    return storefrontConfigResponse(env);
  }

  if (path === "/api/v1/admin/status") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    return adminStatusResponse(request, env);
  }

  if (path === "/api/v1/admin/store-config") {
    if (method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);
    return saveStorefrontConfig(request, env);
  }

  if (path === "/api/v1/published-releases") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    return publishedReleasesResponse(request, env);
  }

  if (path === "/api/v1/admin/publish") {
    if (method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);
    return publishArtifact(request, env);
  }

  // CI publishing is intentionally outside the path-scoped Access application so
  // GitHub Actions can authenticate with its server-only bearer secret. The Worker
  // validates that secret itself before reading any multipart upload.
  if (path === "/api/v1/ci/publish") {
    if (method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);
    return publishArtifact(request, env, "ci");
  }

  if (path.startsWith("/api/v1/published/downloads/")) {
    if (method !== "GET" && method !== "HEAD") return json({ success: false, error: "method_not_allowed" }, 405);
    return downloadPublishedArtifact(request, env);
  }

  if (path === "/api/domains" || path === "/api/v1/domains") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const origin = baseUrl(request, env);
    return json({
      success: true,
      domains: [
        { domain: new URL(origin).host, provider: "cloudflare-workers", targetInterface: "store", primary: true },
        { domain: "hendy-tool-releas.pages.dev", provider: "cloudflare-pages", targetInterface: "store", primary: false },
      ],
      note: "Danh sách domain mục tiêu; hãy kiểm tra trạng thái thực trong Cloudflare Dashboard.",
    });
  }

  if (path === "/api/telemetry" || path === "/api/v1/telemetry") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const cf = request as Request & { cf?: { colo?: string; country?: string; asn?: number; tlsVersion?: string } };
    return json({
      success: true,
      runtime: "cloudflare-workers",
      edgeLocation: cf.cf?.colo ?? null,
      country: cf.cf?.country ?? null,
      asn: cf.cf?.asn ?? null,
      tlsVersion: cf.cf?.tlsVersion ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  if (path.startsWith("/api/")) {
    return json({ success: false, error: "api_route_not_found", path }, 404);
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === "OPTIONS") {
      const headers = securityHeaders();
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      headers.set("Access-Control-Max-Age", "86400");
      return new Response(null, { status: 204, headers });
    }

    try {
      // Admin is served from its own HTML entrypoint and fails closed until Cloudflare Access is configured.
      const host = url.hostname.toLowerCase();
      const adminHost = /^(admin|studio|serverplus|admin-plus)\./.test(host);
      const adminRootPath = url.pathname === "/" || url.pathname === "/index.html";
      const adminUiPath =
        (adminHost && adminRootPath) ||
        url.pathname === "/admin" || url.pathname === "/admin/" ||
        url.pathname.startsWith("/admin/") || url.pathname === "/admin.html" ||
        url.pathname === "/studio" || url.pathname === "/studio/" ||
        url.pathname.startsWith("/studio/");
      if (adminUiPath) {
        if (method !== "GET" && method !== "HEAD") {
          return json({ success: false, error: "method_not_allowed" }, 405);
        }
        const denied = await verifyCloudflareAccess(request, env);
        if (denied) return adminAccessPage(denied.status);
        if (!env.ASSETS) {
          return json({ success: false, error: "static_assets_not_configured" }, 503);
        }
        const adminDocumentUrl = new URL("/admin.html", url);
        const assetResponse = await env.ASSETS.fetch(new Request(adminDocumentUrl, {
          method: "GET",
          headers: request.headers,
        }));
        const headers = securityHeaders(assetResponse.headers);
        headers.set("Cache-Control", "no-store");
        headers.set("X-Robots-Tag", "noindex, nofollow");
        headers.set("X-Frame-Options", "DENY");
        return new Response(method === "HEAD" ? null : assetResponse.body, {
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          headers,
        });
      }

      const apiResponse = await routeApi(request, env);
      if (apiResponse) return apiResponse;

      if (!env.ASSETS) {
        return json({
          success: false,
          error: "static_assets_not_configured",
          message: "Static Assets binding ASSETS chưa được cấu hình trong wrangler.toml.",
        }, 503);
      }

      let response = await env.ASSETS.fetch(request);
      if (response.status === 404 && (method === "GET" || method === "HEAD") && !url.pathname.includes(".")) {
        response = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
      }

      const headers = securityHeaders(response.headers);
      if (url.pathname.startsWith("/assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (url.pathname === "/" || url.pathname.endsWith(".html")) {
        headers.set("Cache-Control", "no-cache");
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error("Hendy Worker request failed", error);
      return json({
        success: false,
        error: "internal_error",
        message: "Đã xảy ra lỗi trong Worker. Kiểm tra Cloudflare Workers Logs để biết chi tiết.",
      }, 500);
    }
  },
};
