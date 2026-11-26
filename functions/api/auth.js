export async function onRequestGet(context) {
  const identity = context.data?.adminIdentity;
  if (!identity?.email) {
    return Response.json({ success: false, error: "authentication_required" }, { status: 401 });
  }
  const env = context.env || {};
  return Response.json({
    success: true,
    user: { email: identity.email, authenticated: true, provider: identity.provider || "render-basic-auth" },
    bindings: {
      ADMIN_USERNAME: Boolean(env.ADMIN_USERNAME),
      ADMIN_PASSWORD: Boolean(env.ADMIN_PASSWORD),
      ADMIN_EMAIL: Boolean(env.ADMIN_EMAIL),
      RELEASE_PUBLISH_TOKEN: Boolean(env.RELEASE_PUBLISH_TOKEN),
      CERTIFICATE_ENCRYPTION_KEY: Boolean(env.CERTIFICATE_ENCRYPTION_KEY),
      DATABASE_URL: Boolean(env.DATABASE_URL),
      DB: Boolean(env.DB),
      RELEASES: Boolean(env.RELEASES),
      RATE_LIMITS: Boolean(env.RATE_LIMITS)
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
