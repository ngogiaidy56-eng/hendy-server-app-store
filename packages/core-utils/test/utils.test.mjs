import test from "node:test";
import assert from "node:assert/strict";
import { compareVersions, formatBytes, isHttpsUrl, isSha256 } from "../src/index.ts";

test("validates secure URLs and SHA-256", () => {
  assert.equal(isHttpsUrl("https://downloads.example.com/app.zip"), true);
  assert.equal(isHttpsUrl("http://downloads.example.com/app.zip"), false);
  assert.equal(isSha256("a".repeat(64)), true);
  assert.equal(isSha256("not-a-hash"), false);
});
test("compares numeric app versions", () => {
  assert.ok(compareVersions("1.10.0", "1.9.9") > 0);
  assert.equal(compareVersions("2.0.0", "2.0.0"), 0);
});
test("formats bytes", () => {
  assert.equal(formatBytes(0), "—");
  assert.equal(formatBytes(1024), "1.0 KB");
});
