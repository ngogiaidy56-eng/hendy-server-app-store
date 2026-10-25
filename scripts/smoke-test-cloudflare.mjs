const workerBase = (process.env.APP_BASE_URL || "https://hendy-tool-releas.ngogiaidy56.workers.dev").replace(/\/$/, "");
const pagesBase = (process.env.PAGES_BASE_URL || "https://hendy-tool-releas.pages.dev").replace(/\/$/, "");
const maxAttempts = Number(process.env.SMOKE_RETRIES || 8);
const delayMs = Number(process.env.SMOKE_DELAY_MS || 4000);

async function fetchWithRetry(url, options = {}, predicate = (response) => response.ok) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000), redirect: "manual" });
      if (predicate(response)) return response;
      lastError = new Error(url + " returned HTTP " + response.status);
    } catch (error) {
      lastError = error;
    }
    if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw lastError || new Error("Smoke test request failed: " + url);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const healthResponse = await fetchWithRetry(workerBase + "/healthz");
assert(healthResponse.status === 200, "Worker health check failed.");
const health = await healthResponse.json();
assert(health.status === "healthy", "Worker health payload is not healthy.");

const readyResponse = await fetchWithRetry(workerBase + "/api/v1/runtime/readiness");
const readiness = await readyResponse.json();
assert(readiness.success === true, "Worker readiness endpoint returned an error.");
assert(readiness.checks?.staticAssets === true, "Worker static Assets binding is missing.");
assert(readiness.checks?.releaseStorage === true, "R2 release storage is not fully bound.");
assert(readiness.checks?.adminAccess === true, "Cloudflare Access runtime variables were not linked.");
assert(readiness.adminReady === true, "Admin readiness is false; inspect the runtime readiness payload.");

const workerReleasesResponse = await fetchWithRetry(workerBase + "/api/v1/published-releases");
const workerReleases = await workerReleasesResponse.json();
assert(workerReleases.success === true && Array.isArray(workerReleases.releases), "Worker public release catalog response is invalid.");

const adminResponse = await fetchWithRetry(
  workerBase + "/admin",
  { headers: { Accept: "text/html" } },
  (response) => [200, 302, 303, 307, 308, 401, 403].includes(response.status)
);
assert(adminResponse.status !== 503, "Admin route still reports missing Access configuration.");

const pagesReleasesResponse = await fetchWithRetry(pagesBase + "/api/v1/published-releases");
const pagesReleases = await pagesReleasesResponse.json();
assert(pagesReleases.success === true && Array.isArray(pagesReleases.releases), "Pages public API proxy did not return the Worker catalog.");

const pagesAdminResponse = await fetchWithRetry(
  pagesBase + "/api/v1/admin/status",
  { headers: { Accept: "application/json" } },
  (response) => response.status === 403
);
const pagesAdmin = await pagesAdminResponse.json();
assert(pagesAdmin.error === "admin_requires_primary_origin", "Pages must deny Admin API routes and use the Worker Access-protected origin.");

const pagesCiResponse = await fetchWithRetry(
  pagesBase + "/api/v1/ci/publish",
  { method: "POST", body: new FormData() },
  (response) => response.status === 403
);
const pagesCi = await pagesCiResponse.json();
assert(pagesCi.error === "ci_publish_requires_primary_origin", "Pages must deny CI publisher routes and leave publishing on the primary Worker.");

console.log(JSON.stringify({
  success: true,
  worker: workerBase,
  pages: pagesBase,
  checks: {
    workerHealth: true,
    workerStaticAssets: readiness.checks.staticAssets,
    r2Binding: readiness.checks.releaseStorage,
    accessRuntime: readiness.checks.adminAccess,
    adminRouteNotInSetupError: adminResponse.status !== 503,
    workerCatalog: true,
    pagesProxy: true,
    pagesAdminDenied: true,
  },
}, null, 2));
