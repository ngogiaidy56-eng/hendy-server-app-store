import test from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../../functions/api/[[path]].ts";

test("Pages gateway blocks Admin APIs because they require the primary Access-protected origin", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  globalThis.fetch = (async () => {
    upstreamCalled = true;
    return new Response(JSON.stringify({ success: true }));
  }) as typeof fetch;
  try {
    const response = await onRequest({
      request: new Request("https://hendy-tool-releas.pages.dev/api/v1/admin/status"),
      env: { BACKEND_ORIGIN: "https://worker.example.com" },
      params: { path: ["v1", "admin", "status"] },
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json() as { error: string }).error, "admin_requires_primary_origin");
    assert.equal(upstreamCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Pages gateway proxies public API to the Worker without fabricating data", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrl = input instanceof Request ? input.url : String(input);
    return new Response(JSON.stringify({
      success: true,
      total: 0,
      releases: [],
      marker: "upstream-response",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const response = await onRequest({
      request: new Request("https://hendy-tool-releas.pages.dev/api/v1/published-releases?limit=15"),
      env: { BACKEND_ORIGIN: "https://hendy-tool-releas.ngogiaidy56.workers.dev" },
      params: { path: ["v1", "published-releases"] },
    });
    assert.equal(response.status, 200);
    assert.equal(requestedUrl, "https://hendy-tool-releas.ngogiaidy56.workers.dev/api/v1/published-releases?limit=15");
    const body = await response.json() as { marker: string; total: number };
    assert.equal(body.marker, "upstream-response");
    assert.equal(body.total, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Pages gateway returns a real 502 when its backend is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("upstream disconnected"); }) as typeof fetch;
  try {
    const response = await onRequest({
      request: new Request("https://hendy-tool-releas.pages.dev/api/v1/published-releases"),
      env: {},
      params: { path: ["v1", "published-releases"] },
    });
    assert.equal(response.status, 502);
    assert.equal((await response.json() as { error: string }).error, "backend_unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Pages gateway denies the CI publisher endpoint at the public origin", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  globalThis.fetch = (async () => {
    upstreamCalled = true;
    return new Response("unexpected upstream call");
  }) as typeof fetch;
  try {
    const response = await onRequest({
      request: new Request("https://hendy-tool-releas.pages.dev/api/v1/ci/publish", { method: "POST", body: new FormData() }),
      env: { BACKEND_ORIGIN: "https://hendy-tool-releas.ngogiaidy56.workers.dev" },
      params: { path: ["v1", "ci", "publish"] },
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json() as { error: string }).error, "ci_publish_requires_primary_origin");
    assert.equal(upstreamCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
