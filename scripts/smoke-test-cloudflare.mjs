const workerBase = (process.env.APP_BASE_URL || "https://hendy-tool-releas.ngogiaidy56.workers.dev").replace(/\/+$/, "");
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
const health = await healthResponse.json();
assert(healthResponse.status === 200 && health.status === "healthy", "Worker health check failed.");

const readinessResponse = await fetchWithRetry(workerBase + "/api/v1/runtime/readiness");
const readiness = await readinessResponse.json();
assert(readiness.success === true, "Worker readiness endpoint returned an error.");
assert(readiness.checks?.worker === true, "Worker runtime is not ready.");
assert(readiness.checks?.staticAssets === true, "Worker Static Assets binding is missing.");
assert(readiness.checks?.releaseStorage === true, "R2 release bucket binding is missing.");
assert(readiness.checks?.adminAccess === true, "Cloudflare Access secrets are not linked.");
assert(readiness.adminReady === true, "Admin readiness is false; inspect the readiness payload.");

const metaResponse = await fetchWithRetry(workerBase + "/api/v1/meta");
const meta = await metaResponse.json();
assert(metaResponse.status === 200 && meta.success !== false, "Worker metadata endpoint did not return a successful response.");

const releaseResponse = await fetchWithRetry(workerBase + "/api/v1/published-releases");
const releasePayload = await releaseResponse.json();
assert(releaseResponse.status === 200 && releasePayload.success === true && Array.isArray(releasePayload.releases), "Published release catalog response is invalid.");

const storeResponse = await fetchWithRetry(workerBase + "/", { headers: { Accept: "text/html" } });
assert(storeResponse.status === 200 && /text\/html/i.test(storeResponse.headers.get("content-type") || ""), "Storefront HTML was not served.");

const adminResponse = await fetchWithRetry(
  workerBase + "/admin",
  { headers: { Accept: "text/html" } },
  (response) => [200, 302, 303, 307, 308, 401, 403].includes(response.status)
);
assert(adminResponse.status !== 503, "Admin route still reports missing Access configuration.");

console.log(JSON.stringify({
  success: true,
  worker: workerBase,
  checks: {
    workerHealth: true,
    runtimeReadiness: true,
    staticAssets: readiness.checks.staticAssets,
    r2Binding: readiness.checks.releaseStorage,
    accessRuntime: readiness.checks.adminAccess,
    storefront: true,
    adminRouteProtected: true,
    publishedReleaseCatalog: true,
  },
}, null, 2));
