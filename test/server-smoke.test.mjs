import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";

let child;
let baseUrl;
let childOutput = "";
const fixture = [{
  id: "fixture-release", name: "Test App", version: "1.10.0", build: 110,
  platform: "windows", channel: "stable", downloadUrl: "https://example.com/test.exe",
  sha256: "a".repeat(64), fileSize: 1024, releaseNotes: "fixture", status: "published"
}];

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a test port");
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}
async function waitForHealth(url) {
  const deadline = Date.now() + 12000;
  let lastError;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Test server exited early: ${childOutput}`);
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Test server did not become healthy: ${lastError}; ${childOutput}`);
}
before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(port), DATABASE_URL: "", ADMIN_API_TOKEN: "test-only-token", RELEASES_JSON: JSON.stringify(fixture) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", chunk => { childOutput += chunk.toString(); });
  child.stderr.on("data", chunk => { childOutput += chunk.toString(); });
  await waitForHealth(baseUrl);
});
after(async () => {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise(resolve => child.once("exit", resolve)),
    new Promise(resolve => setTimeout(resolve, 3000))
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
});

test("health endpoint reports the service is online", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, "ok");
  assert.equal(data.database, "manifest");
});

test("public releases endpoint only returns the configured manifest", async () => {
  const response = await fetch(`${baseUrl}/api/releases`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.total, 1);
  assert.equal(data.releases[0].id, "fixture-release");
});

test("update check compares numeric version segments correctly", async () => {
  const newer = await fetch(`${baseUrl}/api/update-check?platform=windows&channel=stable&clientVersion=1.9.9`);
  assert.equal(newer.status, 200);
  const data = await newer.json();
  assert.equal(data.updateAvailable, true);
  assert.equal(data.latestVersion, "1.10.0");
  assert.equal(data.sha256, "a".repeat(64));

  const current = await fetch(`${baseUrl}/api/update-check?platform=windows&channel=stable&clientVersion=1.10.0`);
  assert.equal((await current.json()).updateAvailable, false);
});

test("update-check rejects unsupported platforms", async () => {
  const response = await fetch(`${baseUrl}/api/update-check?platform=linux`);
  assert.equal(response.status, 400);
});

test("admin API denies missing credentials and fails closed without persistent storage", async () => {
  const denied = await fetch(`${baseUrl}/api/admin/releases`);
  assert.equal(denied.status, 401);
  const noDatabase = await fetch(`${baseUrl}/api/admin/releases`, {
    headers: { Authorization: "Bearer test-only-token" }
  });
  assert.equal(noDatabase.status, 503);
});
