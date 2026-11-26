import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as health } from "../functions/api/healthz.js";
import { onRequestGet as publishedReleases } from "../functions/api/v1/published-releases.js";

test("Render health route probes PostgreSQL, object storage and rate-limit adapters", async () => {
  const env = {
    APP_NAME: "Hendy Test",
    ENVIRONMENT: "test",
    DB: { prepare: () => ({ first: async () => ({ ok: 1 }) }) },
    RELEASES: {
      get: async () => null,
      head: async () => null,
      list: async () => ({ objects: [] }),
      put: async () => ({})
    },
    RATE_LIMITS: { get: async () => null, put: async () => {}, consume: async () => 1 }
  };
  const response = await health({ env });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "healthy");
  assert.equal(body.runtime, "render-node-express");
  assert.equal(body.provider, "render");
  assert.equal(body.bindings.postgres, true);
  assert.equal(body.bindings.objectStorage, true);
  assert.equal(body.bindings.rateLimiting, true);
});

test("published catalog fails closed when Render PostgreSQL/object storage is not bound", async () => {
  const response = await publishedReleases({ env: {} });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error, "release_storage_not_configured");
  assert.deepEqual(body.releases, []);
});

test("health route reports degraded when required Render adapters are missing", async () => {
  const response = await health({ env: { APP_NAME: "Hendy Test" } });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.status, "degraded");
  assert.equal(body.runtime, "render-node-express");
});
