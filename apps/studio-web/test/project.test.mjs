import test from "node:test";
import assert from "node:assert/strict";

test("studio route and export labels remain explicit", async () => {
  const html = await (await import("node:fs/promises")).readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /Hendy Studio/);
  assert.match(html, /Xuất manifest/);
  assert.match(html, /control-plane/);
});
