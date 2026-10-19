import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
delete process.env.DATABASE_URL;
delete process.env.ADMIN_API_TOKEN;
process.env.NODE_ENV = "test";
process.env.RELEASES_JSON = JSON.stringify([
  { id: "test-win", name: "Hendy Desktop", version: "2.1.0", build: 21, platform: "windows", channel: "stable", status: "published", downloadUrl: "https://downloads.example.com/hendy.exe", sha256: "a".repeat(64), fileSize: 2048 },
  { id: "test-draft", name: "Draft", version: "99.0.0", platform: "windows", channel: "stable", status: "draft", downloadUrl: "https://downloads.example.com/draft.exe", sha256: "b".repeat(64), fileSize: 100 }
]);
const { app } = await import("../server.js");
test("health, catalogue and update check work in read-only mode", async t => {
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); t.after(() => new Promise(resolve => server.close(resolve)));
  const base = "http://127.0.0.1:" + server.address().port;
  const health = await fetch(base + "/api/health"); assert.equal(health.status, 200); assert.equal((await health.json()).service, "hendy-server-app-store");
  const response = await fetch(base + "/api/releases"), data = await response.json();
  assert.equal(response.status, 200); assert.equal(data.total, 1); assert.equal(data.releases[0].id, "test-win");
  const update = await fetch(base + "/api/update-check?platform=windows&channel=stable&currentVersion=2.0.0");
  assert.equal((await update.json()).updateAvailable, true);
  assert.equal((await fetch(base + "/api/update-check?platform=toaster")).status, 400);
});
test("admin API is disabled when no token is configured", async t => {
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal((await fetch("http://127.0.0.1:" + server.address().port + "/api/admin/releases")).status, 503);
});