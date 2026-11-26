import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/v1/update-check.js";

function context(version, clientVersion) {
  const row = { id: "release-1", version, platform: "windows", fileName: "app.exe", r2Key: "published/app/1.0.0/app.exe", sizeBytes: 100, sha256: "a".repeat(64), releaseNotes: "", publishedAt: "2026-11-26T00:00:00.000Z" };
  return {
    request: new Request("https://store.example/api/v1/update-check?platform=windows&clientVersion=" + encodeURIComponent(clientVersion)),
    env: {
      DB: { prepare: () => ({ bind: () => ({ first: async () => row }) }) },
      RELEASES: { head: async () => ({ size: 100 }) }
    }
  };
}

test("update check follows SemVer prerelease precedence", async () => {
  const stableVsRc = await onRequestGet(context("2.0.0", "2.0.0-rc.9"));
  assert.equal((await stableVsRc.json()).updateAvailable, true);

  const rcVsBeta = await onRequestGet(context("2.0.0-rc.1", "2.0.0-beta.9"));
  assert.equal((await rcVsBeta.json()).updateAvailable, true);

  const betaVsRc = await onRequestGet(context("2.0.0-beta.2", "2.0.0-beta.10"));
  assert.equal((await betaVsRc.json()).updateAvailable, false);
});

test("update check ignores build metadata when comparing versions", async () => {
  const response = await onRequestGet(context("1.2.3+build.2", "1.2.3+build.1"));
  assert.equal((await response.json()).updateAvailable, false);
});

test("update check rejects invalid client versions and platforms", async () => {
  const invalidVersion = await onRequestGet(context("1.0.1", "1.0"));
  assert.equal(invalidVersion.status, 400);
  const invalidPlatform = await onRequestGet({
    ...context("1.0.1", "1.0.0"),
    request: new Request("https://store.example/api/v1/update-check?platform=freebsd&clientVersion=1.0.0")
  });
  assert.equal(invalidPlatform.status, 400);
});
