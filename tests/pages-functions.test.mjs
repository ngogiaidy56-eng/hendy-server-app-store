import test from "node:test";
import assert from "node:assert/strict";
import { onRequest as middleware } from "../functions/_middleware.js";
import { onRequestGet as health } from "../functions/api/healthz.js";
import { onRequestGet as publishedReleases } from "../functions/api/v1/published-releases.js";

test("Pages Functions health route reports the runtime and binding state", async () => {
  const response = await health({ env: { APP_NAME: "Hendy Test", ENVIRONMENT: "test", DB: {}, RELEASES: {}, RATE_LIMITS: {} } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "healthy");
  assert.equal(body.runtime, "cloudflare-pages-functions");
  assert.equal(body.bindings.d1, true);
  assert.equal(body.bindings.r2, true);
  assert.equal(body.bindings.kv, true);
});

test("published catalog fails closed when D1 or R2 is not bound", async () => {
  const response = await publishedReleases({ env: {} });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error, "release_storage_not_configured");
  assert.deepEqual(body.releases, []);
});

test("Admin routes fail closed when Cloudflare Access configuration is absent", async () => {
  const request = new Request("https://hendy-app-store.pages.dev/admin.html", { headers: { Accept: "text/html" } });
  const response = await middleware({
    request,
    env: { ENVIRONMENT: "production" },
    data: {},
    next: async () => new Response("should not be reached", { status: 200 })
  });
  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
  assert.match(await response.text(), /Hendy Admin Console/);
});

test("public health path continues without requiring Admin credentials", async () => {
  const response = await middleware({
    request: new Request("https://hendy-app-store.pages.dev/api/healthz"),
    env: {},
    data: {},
    next: async () => new Response("ok", { status: 200 })
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});
