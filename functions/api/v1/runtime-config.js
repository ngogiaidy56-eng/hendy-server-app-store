export async function onRequestGet(context) {
  const env = context.env || {};
  const origin = new URL(context.request.url).origin;
  const appUrl = env.PUBLIC_BASE_URL || origin;
  const checked = {
    hasAdminUsername: Boolean(env.ADMIN_USERNAME),
    hasAdminPassword: Boolean(env.ADMIN_PASSWORD),
    hasAdminEmail: Boolean(env.ADMIN_EMAIL),
    hasReleasePublishToken: Boolean(env.RELEASE_PUBLISH_TOKEN),
    hasCertificateEncryptionKey: Boolean(env.CERTIFICATE_ENCRYPTION_KEY),
    hasTelegramBotToken: Boolean(env.BOT_TOKEN),
    hasTelegramWebhookSecret: Boolean(env.TELEGRAM_WEBHOOK_SECRET),
    hasDatabaseUrl: Boolean(env.DATABASE_URL),
    hasPostgres: Boolean(env.DB),
    hasObjectStorage: Boolean(env.RELEASES),
    hasRateLimiting: Boolean(env.RATE_LIMITS)
  };
  const statuses = Object.values(checked);
  const secrets = {
    ...checked,
    activeBindingsCount: statuses.filter(Boolean).length,
    totalBindingsCount: statuses.length
  };
  const config = {
    appName: env.APP_NAME || "Hendy App Store",
    appUrl,
    environment: env.ENVIRONMENT || "production",
    releaseChannel: env.RELEASE_CHANNEL || "stable",
    deploymentProvider: "Render",
    runtime: "Node.js + Express",
    databaseProvider: "Render PostgreSQL",
    artifactStorageProvider: "PostgreSQL BYTEA object store",
    adminAuthentication: "HTTP Basic Auth",
    cloudflarePagesDomain: new URL(appUrl).host,
    cloudflarePagesUrl: appUrl,
    cloudflareWorkerDomain: new URL(appUrl).host,
    r2BucketName: "Render PostgreSQL object store",
    version: "3.3.0",
    isAirGapped: false,
    apiBaseUrl: "/api"
  };
  return Response.json({ success: true, config, data: config, secrets }, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }
  });
}
