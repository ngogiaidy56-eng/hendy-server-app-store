export async function onRequestGet(context) {
  const identity = context.data?.adminIdentity;
  if (!identity?.email) {
    return Response.json({ success: false, error: "authentication_required" }, { status: 401 });
  }
  const env = context.env || {};
  return Response.json({
    success: true,
    user: { email: identity.email, authenticated: true },
    bindings: {
      CF_ACCESS_TEAM_DOMAIN: Boolean(env.CF_ACCESS_TEAM_DOMAIN),
      CF_ACCESS_AUD: Boolean(env.CF_ACCESS_AUD),
      CF_ACCESS_ADMIN_EMAILS: Boolean(env.CF_ACCESS_ADMIN_EMAILS),
      RELEASE_PUBLISH_TOKEN: Boolean(env.RELEASE_PUBLISH_TOKEN),
      CERTIFICATE_ENCRYPTION_KEY: Boolean(env.CERTIFICATE_ENCRYPTION_KEY),
      DB: Boolean(env.DB),
      RELEASES: Boolean(env.RELEASES),
      RATE_LIMITS: Boolean(env.RATE_LIMITS)
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
