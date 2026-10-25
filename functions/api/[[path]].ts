/**
 * Cloudflare Pages API gateway.
 *
 * The Pages deployment is storefront-only. All public API data is served by the
 * primary Worker/R2 backend; this function never fabricates releases, checksums,
 * telemetry or successful responses when the backend is unavailable.
 *
 * The private Admin Console must be opened on the primary Worker/Admin host so
 * Cloudflare Access can issue an assertion for the correct application audience.
 * Admin endpoints are therefore rejected at this Pages origin.
 */
interface Env {
  BACKEND_ORIGIN?: string;
  ENVIRONMENT?: string;
}

interface Context {
  request: Request;
  env: Env;
  params: { path?: string[] | string };
}

const DEFAULT_BACKEND_ORIGIN = "https://hendy-tool-releas.ngogiaidy56.workers.dev";

function jsonError(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({
    success: false,
    error,
    message,
    runtime: "cloudflare-pages",
    timestamp: new Date().toISOString(),
  }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    },
  });
}

export async function onRequest(context: Context): Promise<Response> {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const pathParts = Array.isArray(params.path)
    ? params.path
    : (params.path ? [params.path] : []);
  const subPath = pathParts.join("/").replace(/^\/+|\/+$/g, "");

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
      },
    });
  }

  if (subPath === "v1/admin" || subPath.startsWith("v1/admin/") ||
      subPath === "admin" || subPath.startsWith("admin/")) {
    return jsonError(
      403,
      "admin_requires_primary_origin",
      "Admin chỉ hoạt động trên Worker chính, nơi Cloudflare Access xác thực đúng ứng dụng. Hãy mở không gian quản trị trên domain Worker/Admin đã cấu hình."
    );
  }

  if (subPath === "v1/ci/publish") {
    return jsonError(
      403,
      "ci_publish_requires_primary_origin",
      "CI publishing chỉ được phép trên Worker chính; Pages không nhận endpoint phát hành."
    );
  }

  const backendOrigin = (env.BACKEND_ORIGIN || DEFAULT_BACKEND_ORIGIN).trim();
  let backend: URL;
  try {
    backend = new URL(backendOrigin);
    if (backend.protocol !== "https:" || backend.username || backend.password) {
      throw new Error("BACKEND_ORIGIN must be a trusted HTTPS origin");
    }
  } catch {
    return jsonError(503, "backend_origin_invalid", "BACKEND_ORIGIN phải là một URL HTTPS hợp lệ.");
  }

  const target = new URL(backend.origin);
  target.pathname = url.pathname;
  target.search = url.search;
  target.hash = "";

  try {
    const upstreamRequest = new Request(target.toString(), request);
    const upstreamResponse = await fetch(upstreamRequest);
    const headers = new Headers(upstreamResponse.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (url.pathname.startsWith("/api/")) headers.set("Cache-Control", "no-store");
    return new Response(request.method === "HEAD" ? null : upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch {
    return jsonError(
      502,
      "backend_unavailable",
      "Không kết nối được Worker API chính. Dữ liệu không được giả lập; hãy kiểm tra trạng thái Worker và binding R2."
    );
  }
}
