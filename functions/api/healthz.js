export async function onRequestGet(context) {
  const env = context.env || {};
  return Response.json({
    status: "healthy",
    service: env.APP_NAME || "Hendy App Store",
    runtime: "cloudflare-pages-functions",
    environment: env.ENVIRONMENT || "production",
    timestamp: new Date().toISOString(),
    bindings: {
      d1: Boolean(env.DB),
      r2: Boolean(env.RELEASES),
      kv: Boolean(env.RATE_LIMITS)
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
