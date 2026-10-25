export async function onRequestGet(context) {
  const env = context.env || {};
  const checks = {
    d1: Boolean(env.DB),
    r2: Boolean(env.RELEASES?.get && env.RELEASES?.put && env.RELEASES?.head),
    kv: Boolean(env.RATE_LIMITS?.get && env.RATE_LIMITS?.put),
    access: Boolean(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD && env.CF_ACCESS_ADMIN_EMAILS),
    publisher: Boolean(env.RELEASE_PUBLISH_TOKEN),
    certificateEncryption: Boolean(env.CERTIFICATE_ENCRYPTION_KEY)
  };
  const coreReady = checks.d1 && checks.r2 && checks.kv && checks.access && checks.publisher;
  return Response.json({
    success: true,
    ready: coreReady,
    adminReady: checks.d1 && checks.r2 && checks.kv && checks.access,
    checkedAt: new Date().toISOString(),
    runtime: "cloudflare-pages-functions",
    checks
  }, { headers: { "Cache-Control": "no-store" } });
}
