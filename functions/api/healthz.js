export async function onRequestGet(context) {
  const env = context.env || {};
  const bindings = {
    d1: Boolean(env.DB?.prepare),
    r2: Boolean(env.RELEASES?.get && env.RELEASES?.head && env.RELEASES?.list),
    kv: Boolean(env.RATE_LIMITS?.get && env.RATE_LIMITS?.put)
  };
  const healthy = Object.values(bindings).every(Boolean);

  return Response.json({
    status: healthy ? "healthy" : "degraded",
    service: env.APP_NAME || "Hendy App Store",
    runtime: "cloudflare-pages-functions",
    environment: env.ENVIRONMENT || "production",
    timestamp: new Date().toISOString(),
    bindings
  }, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" }
  });
}
