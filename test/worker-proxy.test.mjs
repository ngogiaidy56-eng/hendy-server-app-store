import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";

test("edge proxy rejects browser origins other than the configured Pages origin", async () => {
  const response = await worker.fetch(
    new Request("https://edge.example.workers.dev/api/releases", {
      headers: { origin: "https://attacker.example" }
    }),
    {
      RENDER_API_ORIGIN: "https://hendy-api.example",
      ALLOWED_ORIGIN: "https://store.example"
    }
  );
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Origin không được cho phép." });
});

test("edge proxy forwards API requests to Render and adds CORS only for the allowed origin", async () => {
  const originalFetch = globalThis.fetch;
  let proxiedRequest;
  globalThis.fetch = async input => {
    proxiedRequest = input instanceof Request ? input : new Request(input);
    return new Response(JSON.stringify({ status: "ok", source: "render-fixture" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const response = await worker.fetch(
      new Request("https://edge.example.workers.dev/api/releases?channel=stable", {
        headers: {
          origin: "https://store.example",
          authorization: "Bearer test-token",
          accept: "application/json"
        }
      }),
      {
        RENDER_API_ORIGIN: "https://hendy-api.example",
        ALLOWED_ORIGIN: "https://store.example"
      }
    );
    assert.equal(response.status, 200);
    assert.equal(new URL(proxiedRequest.url).origin, "https://hendy-api.example");
    assert.equal(new URL(proxiedRequest.url).pathname, "/api/releases");
    assert.equal(new URL(proxiedRequest.url).search, "?channel=stable");
    assert.equal(proxiedRequest.headers.get("authorization"), "Bearer test-token");
    assert.equal(proxiedRequest.headers.get("origin"), null);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://store.example");
    assert.equal(response.headers.get("x-hendy-edge"), "cloudflare-worker");
    assert.deepEqual(await response.json(), { status: "ok", source: "render-fixture" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("edge proxy fails closed when the Render origin is not configured", async () => {
  const response = await worker.fetch(
    new Request("https://edge.example.workers.dev/api/health", {
      headers: { origin: "https://store.example" }
    }),
    { ALLOWED_ORIGIN: "https://store.example" }
  );
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /RENDER_API_ORIGIN/);
});
