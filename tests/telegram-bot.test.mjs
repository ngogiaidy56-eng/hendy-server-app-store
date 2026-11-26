import test from "node:test";
import assert from "node:assert/strict";
import { escapeTelegramHtml } from "../server/telegram-bot.js";

test("Telegram HTML escaping neutralizes markup characters", () => {
  assert.equal(escapeTelegramHtml("<script>&\""), "&lt;script&gt;&amp;&quot;");
});

test("Telegram HTML escaping safely stringifies values", () => {
  assert.equal(escapeTelegramHtml(null), "");
  assert.equal(escapeTelegramHtml(42), "42");
});
