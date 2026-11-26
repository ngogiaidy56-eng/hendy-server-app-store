import test from "node:test";
import assert from "node:assert/strict";
import { compareVersions, formatBytes } from "../server/downloader-api.js";

test("Downloader version comparison follows semantic version precedence", () => {
  assert.equal(compareVersions("1.2.0", "1.1.9"), 1);
  assert.equal(compareVersions("v1.2.0", "1.2.0"), 0);
  assert.equal(compareVersions("1.2.0", "1.2.0-beta.2"), 1);
  assert.equal(compareVersions("1.2.0-beta.3", "1.2.0-beta.2"), 1);
  assert.equal(compareVersions("1.2.0-alpha", "1.2.0"), -1);
});

test("Downloader byte formatter handles boundaries", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1048576), "1.00 MB");
  assert.equal(formatBytes(-1), "—");
});
