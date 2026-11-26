async function probeD1(binding) {
  if (!binding?.prepare) return false;
  try {
    const result = await binding.prepare("SELECT 1 AS ok").first();
    return result?.ok === 1;
  } catch { return false; }
}

async function probeR2(binding) {
  if (!binding?.list || !binding?.get || !binding?.put || !binding?.head) return false;
  try {
    await binding.list({ limit: 1 });
    return true;
  } catch { return false; }
}

async function probeKv(binding) {
  if (!binding?.get || !binding?.put) return false;
  try {
    await binding.get("__hendy_readiness_probe__");
    return true;
  } catch { return false; }
}

function hasValidEncryptionKey(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const decoded = atob(value.trim());
    return decoded.length === 32;
  } catch { return false; }
}

export async function onRequestGet(context) {
  const env = context.env || {};
  const [d1, r2, kv] = await Promise.all([
    probeD1(env.DB),
    probeR2(env.RELEASES),
    probeKv(env.RATE_LIMITS)
  ]);

  const checks = {
    d1,
    r2,
    kv,
    access: Boolean(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD && env.CF_ACCESS_ADMIN_EMAILS),
    publisher: typeof env.RELEASE_PUBLISH_TOKEN === "string" && env.RELEASE_PUBLISH_TOKEN.length >= 32,
    certificateEncryption: hasValidEncryptionKey(env.CERTIFICATE_ENCRYPTION_KEY)
  };
  const ready = checks.d1 && checks.r2 && checks.kv && checks.access && checks.publisher;

  return Response.json({
    success: true,
    ready,
    adminReady: checks.d1 && checks.r2 && checks.kv && checks.access,
    checkedAt: new Date().toISOString(),
    runtime: "cloudflare-pages-functions",
    checks
  }, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" }
  });
}
