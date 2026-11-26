const baseUrl = String(process.env.APP_BASE_URL || process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
if (!baseUrl) throw new Error("Set APP_BASE_URL to the deployed Render URL.");

async function request(path, options = {}) {
  const response = await fetch(baseUrl + path, {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
    headers: { Accept: path === "/admin" ? "text/html" : "application/json", ...(options.headers || {}) }
  });
  return response;
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const home = await request("/");
assert(home.ok, "Storefront returned HTTP " + home.status);
assert((home.headers.get("content-type") || "").includes("text/html"), "Storefront is not HTML.");

const healthResponse = await request("/api/healthz");
assert(healthResponse.ok, "Health check returned HTTP " + healthResponse.status);
const health = await healthResponse.json();
assert(health.status === "healthy", "Render service health is not healthy.");
assert(health.runtime === "render-node-express", "Unexpected runtime identifier.");
assert(health.bindings?.postgres, "Render PostgreSQL adapter is missing.");
assert(health.bindings?.objectStorage, "PostgreSQL object storage adapter is missing.");
assert(health.bindings?.rateLimiting, "PostgreSQL rate limiter is missing.");

const metaResponse = await request("/api/v1/meta");
assert(metaResponse.ok, "Metadata route returned HTTP " + metaResponse.status);
const meta = await metaResponse.json();
assert(meta.provider === "render", "Metadata does not identify Render.");

const readinessResponse = await request("/api/v1/runtime/readiness");
assert(readinessResponse.ok, "Readiness returned HTTP " + readinessResponse.status);
const readiness = await readinessResponse.json();
assert(readiness.ready === true, "Runtime is not ready; inspect the readiness.checks response.");

const catalogResponse = await request("/api/v1/published-releases");
assert(catalogResponse.ok, "Release catalog returned HTTP " + catalogResponse.status);
const catalog = await catalogResponse.json();
assert(catalog.success === true && Array.isArray(catalog.releases), "Release catalog response is invalid.");

const admin = await request("/admin");
assert([302, 401].includes(admin.status), "Admin route must redirect or require Basic Auth; received HTTP " + admin.status);

console.log(JSON.stringify({
  success: true,
  baseUrl,
  checks: {
    storefront: true,
    renderNodeHealth: true,
    postgres: true,
    objectStorage: true,
    rateLimiting: true,
    runtimeReadiness: true,
    releaseCatalog: true,
    adminRequiresAuthentication: true
  }
}, null, 2));
