export async function onRequestGet(context) {
  const env = context.env || {};
  const bindings = {
    postgres: Boolean(env.DB?.prepare),
    objectStorage: Boolean(env.RELEASES?.get && env.RELEASES?.head && env.RELEASES?.list && env.RELEASES?.put),
    rateLimiting: Boolean(env.RATE_LIMITS?.get && env.RATE_LIMITS?.put && env.RATE_LIMITS?.consume)
  };
  const healthy = Object.values(bindings).every(Boolean);
  return Response.json({
    status: healthy ? "healthy" : "degraded",
    service: env.APP_NAME || "Hendy App Store",
    runtime: "render-node-express",
    provider: "render",
    environment: env.ENVIRONMENT || "production",
    timestamp: new Date().toISOString(),
    bindings
  }, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" }
  });
}
