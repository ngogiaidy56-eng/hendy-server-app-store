export async function onRequestGet(context) {
  const env = context.env || {};
  const identity = context.data?.adminIdentity;
  if (!identity?.email) return Response.json({ success: false, error: "authentication_required" }, { status: 401 });
  return Response.json({
    success: true,
    identity: { email: identity.email },
    storageConfigured: Boolean(env.DB && env.RELEASES?.put && env.RELEASES?.list),
    publisherConfigured: Boolean(env.RELEASE_PUBLISH_TOKEN),
    accessConfigured: Boolean(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD && env.CF_ACCESS_ADMIN_EMAILS),
    certificateEncryptionConfigured: Boolean(env.CERTIFICATE_ENCRYPTION_KEY),
    nativeBuilders: {
      windows: "Windows GitHub Actions runner required",
      android: "Android SDK runner required",
      ios: "macOS Xcode runner required",
      macos: "macOS runner required",
      linux: "Linux runner required"
    },
    limits: { directUploadBytes: 25 * 1024 * 1024, certificateUploadBytes: 20 * 1024 * 1024, sourceBundleBytes: 50 * 1024 * 1024 }
  }, { headers: { "Cache-Control": "no-store" } });
}
