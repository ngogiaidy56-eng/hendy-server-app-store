export async function onRequestGet(context) {
  const env = context.env || {};
  const checked = {
    hasCloudflareApiToken: false,
    hasCloudflareAccountId: false,
    hasReleasePublishToken: Boolean(env.RELEASE_PUBLISH_TOKEN),
    hasFirebaseConfig: false,
    hasGoogleDriveScope: false,
    hasCfAccessConfig: Boolean(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD && env.CF_ACCESS_ADMIN_EMAILS)
  };
  const statuses = Object.values(checked);
  const secrets = {
    ...checked,
    activeBindingsCount: statuses.filter(Boolean).length,
    totalBindingsCount: statuses.length
  };
  const config = {
    appName: env.APP_NAME || "Hendy App Store",
    appUrl: env.PUBLIC_BASE_URL || new URL(context.request.url).origin,
    environment: env.ENVIRONMENT || "production",
    releaseChannel: env.RELEASE_CHANNEL || "stable",
    cloudflarePagesDomain: new URL(env.PUBLIC_BASE_URL || context.request.url).host,
    cloudflarePagesUrl: env.PUBLIC_BASE_URL || new URL(context.request.url).origin,
    r2BucketName: env.R2_BUCKET_NAME || "hendy-tool-releases",
    version: "3.3.0",
    isAirGapped: false,
    apiBaseUrl: "/api"
  };
  return Response.json({ success: true, config, data: config, secrets }, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }
  });
}
