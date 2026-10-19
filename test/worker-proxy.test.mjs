import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";
test("blocks origins outside allowlist", async () => {
  const r = await worker.fetch(new Request("https://edge.example.workers.dev/api/releases", { headers: { Origin: "https://evil.example" } }), { RENDER_API_ORIGIN: "https://api.example.com", ALLOWED_ORIGIN: "https://store.example.com" });
  assert.equal(r.status, 403);
});
test("rejects missing upstream configuration", async () => {
  const r = await worker.fetch(new Request("https://edge.example.workers.dev/api/releases"), {});
  assert.equal(r.status, 503); assert.match((await r.json()).error, /RENDER_API_ORIGIN/);
});
test("returns edge metadata", async () => {
  const r = await worker.fetch(new Request("https://edge.example.workers.dev/"), {}), data = await r.json();
  assert.equal(r.status, 200); assert.equal(data.service, "Hendy Server App Store Edge"); assert.equal(data.upstreamConfigured, false);
});
test("valid CORS preflight returns required headers", async () => {
  const r = await worker.fetch(new Request("https://edge.example.workers.dev/api/releases", { method: "OPTIONS", headers: { Origin: "https://store.example.com", "Access-Control-Request-Method": "GET" } }), { ALLOWED_ORIGIN: "https://store.example.com", RENDER_API_ORIGIN: "https://api.example.com" });
  assert.equal(r.status, 204); assert.equal(r.headers.get("access-control-allow-origin"), "https://store.example.com");
});