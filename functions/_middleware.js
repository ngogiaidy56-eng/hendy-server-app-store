const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
function secure(response, pathname = "") {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", pathname.startsWith("/admin") ? "DENY" : "SAMEORIGIN");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/v1/admin") || pathname === "/api/auth" || pathname === "/api/v1/runtime-config" || pathname.startsWith("/api/sync-logs")) {
    headers.set("Cache-Control", "no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function decodeJsonPart(part) {
  try {
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}
function adminPath(path) {
  return path === "/admin" || path === "/admin/" || path.startsWith("/admin/") ||
    path === "/admin.html" || path === "/studio" || path.startsWith("/studio/") ||
    path === "/api/auth" || path === "/api/v1/runtime-config" || path === "/api/sync-logs" || path.startsWith("/api/sync-logs/") ||
    path.startsWith("/api/v1/admin/");
}
function isAdminDocument(path) {
  return path === "/admin" || path === "/admin/" || path === "/admin.html" || path === "/studio" || path.startsWith("/studio/");
}
function authError(request, status, message) {
  if ((request.headers.get("accept") || "").includes("text/html")) {
    return new Response(
      '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hendy Admin — Access required</title><body style="font:16px system-ui;background:#0b0c12;color:#e2e8f0;display:grid;min-height:100vh;place-items:center"><main style="max-width:620px;padding:32px;border:1px solid #ffffff22;border-radius:20px"><h1>Hendy Admin Console</h1><p>' + message + '</p><p><a style="color:#a5b4fc" href="/">Quay lại Store</a></p></main></body></html>',
      { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }
    );
  }
  return json({ success: false, error: status === 503 ? "access_not_configured" : "authentication_required", message }, status);
}
async function accessIdentity(request, env) {
  const rawDomain = (env.CF_ACCESS_TEAM_DOMAIN || "").trim().replace(/\/+$/, "");
  const audiences = (env.CF_ACCESS_AUD || "").split(",").map((value) => value.trim()).filter(Boolean);
  const allowlist = (env.CF_ACCESS_ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  if (!rawDomain || !audiences.length || !allowlist.length) {
    return { error: authError(request, 503, "Cloudflare Access chưa được cấu hình đầy đủ cho các đường dẫn quản trị.") };
  }
  let teamDomain;
  try {
    const parsed = new URL(rawDomain.includes("://") ? rawDomain : "https://" + rawDomain);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".cloudflareaccess.com")) throw new Error("Invalid Access team domain");
    teamDomain = parsed.origin;
  } catch {
    return { error: authError(request, 503, "Cloudflare Access team domain không hợp lệ.") };
  }
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return { error: authError(request, 401, "Hãy đăng nhập qua Cloudflare Access bằng email đã được cấp quyền.") };
  const parts = token.split(".");
  if (parts.length !== 3) return { error: authError(request, 401, "Access token không hợp lệ.") };
  const header = decodeJsonPart(parts[0]);
  const claims = decodeJsonPart(parts[1]);
  const kid = typeof header?.kid === "string" ? header.kid : "";
  if (!header || header.alg !== "RS256" || !claims || !kid) return { error: authError(request, 401, "Access token không hợp lệ.") };
  const aud = claims.aud;
  const audienceMatches = Array.isArray(aud) ? audiences.some((candidate) => aud.includes(candidate)) : typeof aud === "string" && audiences.includes(aud);
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== teamDomain || !audienceMatches || typeof claims.exp !== "number" || claims.exp <= now || (typeof claims.nbf === "number" && claims.nbf > now)) {
    return { error: authError(request, 401, "Access token đã hết hạn hoặc không khớp ứng dụng.") };
  }
  try {
    const certs = await fetch(teamDomain + "/cdn-cgi/access/certs", { headers: { Accept: "application/json" } });
    if (!certs.ok) throw new Error("Could not retrieve Access keys");
    const keySet = await certs.json();
    const jwk = keySet.keys?.find((key) => key.kid === kid);
    if (!jwk) throw new Error("Access signing key not found");
    const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signaturePart = parts[2].replace(/-/g, "+").replace(/_/g, "/");
    const signature = Uint8Array.from(atob(signaturePart + "=".repeat((4 - signaturePart.length % 4) % 4)), (char) => char.charCodeAt(0));
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, new TextEncoder().encode(parts[0] + "." + parts[1]));
    if (!valid) throw new Error("Access JWT signature mismatch");
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    if (!email || !allowlist.includes(email)) return { error: authError(request, 403, "Tài khoản này chưa nằm trong danh sách Admin được phép truy cập.") };
    return { identity: { email, authenticated: true } };
  } catch (error) {
    console.error("Cloudflare Access verification failed", error instanceof Error ? error.message : "unknown error");
    return { error: authError(request, 401, "Không xác minh được chữ ký Access token.") };
  }
}
async function rateLimit(request, env) {
  if (!env.RATE_LIMITS || !new URL(request.url).pathname.startsWith("/api/")) return null;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const bucket = Math.floor(Date.now() / 60000);
  const key = "ratelimit:" + ip + ":" + bucket;
  try {
    const current = Number(await env.RATE_LIMITS.get(key) || 0) + 1;
    await env.RATE_LIMITS.put(key, String(current), { expirationTtl: 180 });
    if (current > 120) return json({ success: false, error: "rate_limited", message: "Quá nhiều request. Vui lòng thử lại sau một phút." }, 429);
  } catch (error) {
    console.error("KV rate limiter unavailable", error instanceof Error ? error.message : "unknown error");
  }
  return null;
}

export async function onRequest(context) {
  const pathname = new URL(context.request.url).pathname;
  try {
    if (adminPath(pathname)) {
      const result = await accessIdentity(context.request, context.env || {});
      if (result.error) return secure(result.error, pathname);
      context.data.adminIdentity = result.identity;
    }
    const limited = await rateLimit(context.request, context.env || {});
    if (limited) return secure(limited, pathname);
    const response = await context.next();
    return secure(response, pathname);
  } catch (error) {
    console.error("Pages middleware error", error instanceof Error ? error.message : "unknown error");
    return secure(json({ success: false, error: "internal_error", message: "Yêu cầu không thể được xử lý." }, 500), pathname);
  }
}
