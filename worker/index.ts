interface Env {
  RENDER_API_ORIGIN?: string;
  ALLOWED_ORIGIN?: string;
}

const JSON_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
};
const ALLOWED_METHODS = "GET,HEAD,POST,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Authorization,Content-Type,X-Filename,X-Platform";

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

function normalizedHttpsOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function corsHeaders(origin: string | null, allowedOrigin: string | null): Record<string, string> {
  if (!origin || !allowedOrigin || origin !== allowedOrigin) return {};
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": ALLOWED_METHODS,
    "access-control-allow-headers": ALLOWED_HEADERS,
    "access-control-max-age": "600",
    "vary": "Origin"
  };
}

function withResponseHeaders(response: Response, extra: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(JSON_HEADERS)) headers.set(name, value);
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  headers.set("x-hendy-edge", "cloudflare-worker");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incomingUrl = new URL(request.url);
    const origin = request.headers.get("origin");
    const allowedOrigin = normalizedHttpsOrigin(env.ALLOWED_ORIGIN);
    const cors = corsHeaders(origin, allowedOrigin);

    if (incomingUrl.pathname === "/" && request.method === "GET") {
      return json({
        service: "Hendy Server App Store Edge",
        role: "Cloudflare API proxy",
        status: "ok",
        upstreamConfigured: Boolean(normalizedHttpsOrigin(env.RENDER_API_ORIGIN)),
        endpoints: ["/api/health", "/api/releases", "/api/update-check"]
      });
    }

    const isHealthAlias = incomingUrl.pathname === "/health";
    const isApiPath = incomingUrl.pathname === "/api" || incomingUrl.pathname.startsWith("/api/");
    if (!isApiPath && !isHealthAlias) return json({ error: "Route not found" }, 404);

    if (origin && (!allowedOrigin || origin !== allowedOrigin)) {
      return json({ error: "Origin không được cho phép." }, 403);
    }

    if (request.method === "OPTIONS") {
      if (!origin || !allowedOrigin || origin !== allowedOrigin) {
        return json({ error: "Origin không được cho phép." }, 403);
      }
      return new Response(null, {
        status: 204,
        headers: {
          ...JSON_HEADERS,
          ...cors,
          "x-hendy-edge": "cloudflare-worker"
        }
      });
    }

    if (!["GET", "HEAD", "POST", "PATCH", "DELETE"].includes(request.method)) {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    const upstreamOrigin = normalizedHttpsOrigin(env.RENDER_API_ORIGIN);
    if (!upstreamOrigin) {
      return json({
        error: "RENDER_API_ORIGIN chưa được cấu hình thành một origin HTTPS hợp lệ."
      }, 503, cors);
    }

    const path = isHealthAlias ? "/api/health" : incomingUrl.pathname;
    const target = new URL(path + incomingUrl.search, upstreamOrigin);
    const headers = new Headers(request.headers);
    // CORS is enforced at this edge. The private upstream need not trust browser Origin.
    headers.delete("origin");
    headers.delete("host");

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual"
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    try {
      const upstreamResponse = await fetch(new Request(target.toString(), init));
      return withResponseHeaders(upstreamResponse, cors);
    } catch (error) {
      console.error("Render API proxy failed:", error instanceof Error ? error.message : "unknown error");
      return json({ error: "Không thể kết nối API backend." }, 502, cors);
    }
  }
};
