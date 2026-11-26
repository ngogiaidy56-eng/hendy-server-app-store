export async function onRequestGet(context) {
  const env = context.env || {};
  const identity = context.data?.adminIdentity;
  if (!identity?.email) return Response.json({ success: false, error: "authentication_required" }, { status: 401 });
  const adminAuthConfigured = Boolean(env.ADMIN_USERNAME && env.ADMIN_PASSWORD && env.ADMIN_EMAIL);
  return Response.json({
    success: true,
    identity: { email: identity.email },
    storageConfigured: Boolean(env.DB && env.RELEASES?.put && env.RELEASES?.list),
    publisherConfigured: Boolean(env.RELEASE_PUBLISH_TOKEN),
    adminAuthConfigured,
    accessConfigured: adminAuthConfigured,
    certificateEncryptionConfigured: Boolean(env.CERTIFICATE_ENCRYPTION_KEY),
    deployment: "Render Web Service + Render PostgreSQL",
    nativeBuilders: {
      windows: "Dedicated Windows CI runner required",
      android: "Android SDK runner required",
      ios: "macOS Xcode runner required",
      macos: "macOS runner required",
      linux: "Linux toolchain runner required"
    },
    limits: { directUploadBytes: 25 * 1024 * 1024, certificateUploadBytes: 20 * 1024 * 1024, sourceBundleBytes: 50 * 1024 * 1024 }
  }, { headers: { "Cache-Control": "no-store" } });
}
