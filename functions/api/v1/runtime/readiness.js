async function probeDatabase(binding) {
  if (!binding?.prepare) return false;
  try {
    const result = await binding.prepare("SELECT 1 AS ok").first();
    return result?.ok === 1;
  } catch { return false; }
}
async function probeObjectStorage(binding) {
  if (!binding?.list || !binding?.get || !binding?.put || !binding?.head) return false;
  try {
    await binding.list({ limit: 1 });
    return true;
  } catch { return false; }
}
async function probeRateLimit(binding) {
  if (!binding?.get || !binding?.put || !binding?.consume) return false;
  try {
    await binding.get("__hendy_render_readiness_probe__");
    return true;
  } catch { return false; }
}
function hasValidEncryptionKey(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try { return atob(value.trim()).length === 32; } catch { return false; }
}
export async function onRequestGet(context) {
  const env = context.env || {};
  const [database, objectStorage, rateLimiting] = await Promise.all([
    probeDatabase(env.DB),
    probeObjectStorage(env.RELEASES),
    probeRateLimit(env.RATE_LIMITS)
  ]);
  const adminAuthentication = Boolean(
    env.ADMIN_USERNAME &&
    typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length >= 20 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(env.ADMIN_EMAIL || ""))
  );
  const publisher = typeof env.RELEASE_PUBLISH_TOKEN === "string" && env.RELEASE_PUBLISH_TOKEN.length >= 32;
  const certificateEncryption = hasValidEncryptionKey(env.CERTIFICATE_ENCRYPTION_KEY);
  const checks = {
    database,
    objectStorage,
    rateLimiting,
    adminAuthentication,
    publisher,
    certificateEncryption,
    // Compatibility aliases for older status widgets; these now map to Render services.
    d1: database,
    r2: objectStorage,
    kv: rateLimiting,
    access: adminAuthentication
  };
  const ready = database && objectStorage && rateLimiting && adminAuthentication && publisher && certificateEncryption;
  return Response.json({
    success: true,
    ready,
    adminReady: database && objectStorage && rateLimiting && adminAuthentication,
    checkedAt: new Date().toISOString(),
    runtime: "render-node-express",
    provider: "render",
    checks
  }, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" }
  });
}
