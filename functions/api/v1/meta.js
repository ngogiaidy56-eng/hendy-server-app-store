export async function onRequestGet(context) {
  const env = context.env || {};
  return Response.json({
    service: env.APP_NAME || "Hendy App Store",
    version: "3.3.0",
    runtime: "cloudflare-pages-functions",
    environment: env.ENVIRONMENT || "production",
    health: "/api/healthz",
    api: {
      releases: "/api/v1/published-releases",
      storeConfig: "/api/v1/store-config",
      manifest: "/api/v1/public/manifest.json",
      auth: "/api/auth",
      syncLogs: "/api/sync-logs"
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
