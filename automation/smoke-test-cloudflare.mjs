const baseUrl = String(process.env.APP_BASE_URL || "https://hendy-app-store.pages.dev").replace(/\/+$/, "");
const attempts = Number(process.env.SMOKE_RETRIES || 6);

async function fetchRoute(path, acceptable = (response) => response.ok) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(baseUrl + path, { signal: AbortSignal.timeout(15000), redirect: "manual", headers: { Accept: path === "/admin" ? "text/html" : "application/json" } });
      if (acceptable(response)) return response;
      lastError = new Error(path + " returned HTTP " + response.status);
    } catch (error) { lastError = error; }
    if (i + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw lastError || new Error("Smoke test failed for " + path);
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const healthResponse = await fetchRoute("/api/healthz");
const health = await healthResponse.json();
assert(health.status === "healthy", "Pages Functions health check did not return healthy.");
assert(health.runtime === "cloudflare-pages-functions", "The site is not running on Cloudflare Pages Functions.");

const metaResponse = await fetchRoute("/api/v1/meta");
const meta = await metaResponse.json();
assert(meta.service === "Hendy App Store", "Metadata endpoint has the wrong service identifier.");

const readinessResponse = await fetchRoute("/api/v1/runtime/readiness");
const readiness = await readinessResponse.json();
assert(readiness.success === true, "Runtime readiness route returned an error.");
assert(readiness.checks?.d1 === true, "D1 database binding is missing.");
assert(readiness.checks?.r2 === true, "R2 binding is missing.");
assert(readiness.checks?.kv === true, "KV namespace binding is missing.");
assert(readiness.checks?.access === true, "Cloudflare Access secrets have not been provisioned.");
assert(readiness.ready === true, "Core runtime readiness is false.");

const catalogResponse = await fetchRoute("/api/v1/published-releases");
const catalog = await catalogResponse.json();
assert(catalog.success === true && Array.isArray(catalog.releases), "Published release catalog is invalid.");

const manifestResponse = await fetchRoute("/api/v1/public/manifest.json");
const manifest = await manifestResponse.json();
assert(manifest.schemaVersion === "1.0.0" && Array.isArray(manifest.artifacts), "Public manifest is invalid.");

const adminResponse = await fetchRoute("/admin", (response) => [302, 303, 401, 403].includes(response.status));
assert([302, 303, 401, 403].includes(adminResponse.status), "Unauthenticated Admin route did not require Cloudflare Access.");

console.log(JSON.stringify({
  success: true,
  baseUrl,
  checks: {
    pagesFunctionsHealth: true,
    metadata: true,
    d1: readiness.checks.d1,
    r2: readiness.checks.r2,
    kv: readiness.checks.kv,
    cloudflareAccess: readiness.checks.access,
    publishedReleaseCatalog: true,
    publicManifest: true,
    adminProtected: true
  }
}, null, 2));
