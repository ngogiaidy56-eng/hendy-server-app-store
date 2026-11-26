export async function onRequestGet(context) {
  const env = context.env || {};
  const origin = new URL(context.request.url).origin;
  return Response.json({
    service: env.APP_NAME || "Hendy App Store",
    version: "3.3.0",
    runtime: "render-node-express",
    provider: "render",
    environment: env.ENVIRONMENT || "production",
    health: "/api/healthz",
    api: {
      releases: "/api/v1/published-releases",
      storeConfig: "/api/v1/store-config",
      manifest: "/api/v1/public/manifest.json",
      auth: "/api/auth",
      syncLogs: "/api/sync-logs"
    },
    deployment: {
      platform: "Render",
      baseUrl: env.PUBLIC_BASE_URL || origin,
      database: "Render PostgreSQL",
      artifactStorage: "PostgreSQL BYTEA object store",
      adminAuth: "HTTP Basic Auth"
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
