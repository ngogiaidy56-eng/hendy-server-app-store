import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSql, safeObjectKey } from "../server/platform.js";

test("D1 compatibility adapter converts positional placeholders and preserves aliases", () => {
  const sql = normalizeSql("SELECT app_slug AS appSlug FROM apps WHERE app_slug = ? AND app_name = ?");
  assert.equal(sql, 'SELECT app_slug AS "appSlug" FROM apps WHERE app_slug = $1 AND app_name = $2');
});

test("Render object storage accepts only published and private certificate prefixes", () => {
  assert.equal(safeObjectKey("published/tools/1.0.0/abc/app.zip"), "published/tools/1.0.0/abc/app.zip");
  assert.equal(safeObjectKey("private/certificates/abc.aesgcm"), "private/certificates/abc.aesgcm");
  assert.throws(() => safeObjectKey("../secret.txt"));
  assert.throws(() => safeObjectKey("public/secret.txt"));
  assert.throws(() => safeObjectKey("published/app//file.zip"));
});
