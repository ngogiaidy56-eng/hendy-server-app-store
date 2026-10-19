import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("studio workspace exposes local media, timeline, project and subtitle exports", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /Hendy Studio Workspace/);
  assert.match(html, /media-input/);
  assert.match(html, /track-video/);
  assert.match(html, /Xuất project JSON/);
  assert.match(html, /Xuất phụ đề \.SRT/);
  assert.match(html, /render MP4/i);
});

test("studio controller implements bounded editable clip metadata and SRT export", async () => {
  const source = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");
  assert.match(source, /Math\.max\(10,Math\.min\(400/);
  assert.match(source, /application\/x-subrip/);
  assert.match(source, /schemaVersion:"2\.0"/);
});