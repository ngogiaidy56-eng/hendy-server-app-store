import { createHash, timingSafeEqual } from "node:crypto";

const MENU = [
  [{ text: "🛍 Kho ứng dụng" }, { text: "🔎 Tìm ứng dụng" }],
  [{ text: "📦 Bản phát hành" }, { text: "📲 Tải theo nền tảng" }],
  [{ text: "🌐 Mở Hendy Store" }, { text: "❔ Trợ giúp" }]
];
const LABELS = { android: "Android", windows: "Windows", macos: "macOS", ios: "iPhone/iPad", linux: "Linux", web: "Web" };

export function escapeTelegramHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}
function secretEqual(left, right) {
  const a = createHash("sha256").update(String(left || "")).digest();
  const b = createHash("sha256").update(String(right || "")).digest();
  return timingSafeEqual(a, b);
}
function validWebhookSecret(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 256 && /^[A-Za-z0-9_-]+$/.test(value);
}
async function telegramApi(token, method, payload) {
  const response = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) throw new Error("Telegram API " + method + " failed with HTTP " + response.status);
  return result.result;
}
async function sendMessage(token, chatId, text, replyMarkup) {
  return telegramApi(token, "sendMessage", {
    chat_id: chatId,
    text: String(text).slice(0, 4096),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup
  });
}
async function getApps(env, query = "") {
  const result = await env.DB.prepare(
    "SELECT DISTINCT a.app_slug AS slug, a.app_name AS name FROM apps a JOIN releases r ON r.app_slug = a.app_slug WHERE r.status = 'published' ORDER BY a.app_name LIMIT 100"
  ).all();
  const term = String(query || "").trim().toLocaleLowerCase();
  return (result.results || []).filter((app) => !term || (app.name + " " + app.slug).toLocaleLowerCase().includes(term));
}
async function getReleases(env, platform = "") {
  const rows = await env.DB.prepare(
    "SELECT id, app_slug AS appSlug, app_name AS appName, version, platform, file_name AS fileName, sha256 FROM releases WHERE status = 'published' ORDER BY published_at DESC LIMIT 50"
  ).all();
  const base = String(env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");
  return (rows.results || []).filter((row) => !platform || row.platform === platform).map((row) => ({
    ...row,
    downloadUrl: base + "/api/download/" + encodeURIComponent(row.id)
  }));
}
async function handleMessage(env, message) {
  const chatId = message.chat?.id;
  if (!chatId) return;
  const text = String(message.text || "").trim();
  const name = escapeTelegramHtml(message.from?.first_name || "");
  if (text === "/start" || text === "/help" || text === "❔ Trợ giúp") {
    await sendMessage(env.BOT_TOKEN, chatId,
      (name ? "Xin chào <b>" + name + "</b>!\n\n" : "") + "<b>HENDY APP STORE</b>\nKho ứng dụng và bản phát hành chính thức. Chọn chức năng bên dưới.",
      { keyboard: MENU, resize_keyboard: true, is_persistent: true }
    );
    return;
  }
  if (text === "🌐 Mở Hendy Store") {
    const url = String(env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL || "");
    await sendMessage(env.BOT_TOKEN, chatId, url ? "Mở <a href=\"" + escapeTelegramHtml(url) + "\">Hendy Store</a>." : "Store URL chưa được cấu hình.");
    return;
  }
  if (text === "📦 Bản phát hành") {
    const releases = await getReleases(env);
    const rows = releases.slice(0, 10).map((item) => [{ text: "⬇️ " + String(item.appName + " " + item.version + " · " + item.platform).slice(0, 60), url: item.downloadUrl }]);
    await sendMessage(env.BOT_TOKEN, chatId, rows.length ? "<b>BẢN PHÁT HÀNH MỚI</b>" : "Chưa có bản phát hành công khai.", rows.length ? { inline_keyboard: rows } : undefined);
    return;
  }
  if (text === "📲 Tải theo nền tảng") {
    const rows = [["android", "windows"], ["macos", "ios"], ["linux", "web"]].map((group) => group.map((platform) => ({ text: LABELS[platform], callback_data: "platform:" + platform })));
    await sendMessage(env.BOT_TOKEN, chatId, "<b>CHỌN NỀN TẢNG</b>", { inline_keyboard: rows });
    return;
  }
  const search = text === "🛍 Kho ứng dụng" || text === "🔎 Tìm ứng dụng" ? "" : text;
  const apps = await getApps(env, search);
  if (!apps.length) {
    await sendMessage(env.BOT_TOKEN, chatId, search ? "Không tìm thấy ứng dụng phù hợp." : "Kho ứng dụng chưa có bản phát hành công khai.");
    return;
  }
  const rows = apps.slice(0, 10).map((app) => [{ text: "📱 " + String(app.name).slice(0, 55), callback_data: "app:" + String(app.slug).slice(0, 55) }]);
  await sendMessage(env.BOT_TOKEN, chatId, "<b>KHO ỨNG DỤNG</b>\nChọn một ứng dụng để xem phiên bản và tải xuống.", { inline_keyboard: rows });
}
async function handleCallback(env, callback) {
  const chatId = callback.message?.chat?.id;
  const data = String(callback.data || "");
  if (!chatId) return;
  if (data.startsWith("platform:")) {
    const platform = data.slice(9);
    const releases = await getReleases(env, platform);
    const rows = releases.slice(0, 10).map((item) => [{ text: "⬇️ " + String(item.appName + " " + item.version).slice(0, 55), url: item.downloadUrl }]);
    await sendMessage(env.BOT_TOKEN, chatId, rows.length ? "<b>" + escapeTelegramHtml(LABELS[platform] || platform) + "</b>" : "Chưa có bản phát hành cho nền tảng này.", rows.length ? { inline_keyboard: rows } : undefined);
  } else if (data.startsWith("app:")) {
    const slug = data.slice(4);
    const row = await env.DB.prepare("SELECT app_name AS appName, version, platform, file_name AS fileName, sha256, id FROM releases WHERE app_slug = ? AND status = 'published' ORDER BY published_at DESC LIMIT 1").bind(slug).first();
    if (!row) {
      await sendMessage(env.BOT_TOKEN, chatId, "Ứng dụng không còn khả dụng.");
    } else {
      const base = String(env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");
      const url = base + "/api/download/" + encodeURIComponent(row.id);
      await sendMessage(env.BOT_TOKEN, chatId,
        "<b>" + escapeTelegramHtml(row.appName) + "</b>\nPhiên bản: " + escapeTelegramHtml(row.version) +
        "\nNền tảng: " + escapeTelegramHtml(LABELS[row.platform] || row.platform) +
        "\nTệp: <code>" + escapeTelegramHtml(row.fileName) + "</code>" +
        (row.sha256 ? "\nSHA-256: <code>" + escapeTelegramHtml(row.sha256) + "</code>" : "") +
        "\n<a href=\"" + escapeTelegramHtml(url) + "\">Tải bản phát hành</a>"
      );
    }
  }
  try { await telegramApi(env.BOT_TOKEN, "answerCallbackQuery", { callback_query_id: callback.id }); } catch {}
}

export function registerTelegramRoutes(app, express, env, jsonError) {
  app.post("/api/telegram/webhook", express.raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
    const expected = String(env.TELEGRAM_WEBHOOK_SECRET || "");
    const supplied = String(req.get("x-telegram-bot-api-secret-token") || "");
    if (!env.BOT_TOKEN || !validWebhookSecret(expected)) return jsonError(res, 503, "telegram_not_configured", "Telegram Bot chưa được cấu hình.");
    if (!supplied || !secretEqual(supplied, expected)) return jsonError(res, 401, "invalid_telegram_webhook_secret", "Webhook secret không hợp lệ.");
    try {
      const update = JSON.parse(Buffer.from(req.body || []).toString("utf8") || "{}");
      if (update.message) await handleMessage(env, update.message);
      if (update.callback_query) await handleCallback(env, update.callback_query);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Telegram webhook failed:", error instanceof Error ? error.message : "unknown error");
      return jsonError(res, 503, "telegram_update_failed", "Không thể xử lý Telegram update.");
    }
  });

  app.get("/api/admin/telegram/status", async (_req, res) => {
    if (!env.BOT_TOKEN) return jsonError(res, 503, "telegram_bot_token_missing", "Cần cấu hình BOT_TOKEN.");
    try {
      const [bot, webhook] = await Promise.all([
        telegramApi(env.BOT_TOKEN, "getMe", {}),
        telegramApi(env.BOT_TOKEN, "getWebhookInfo", {})
      ]);
      return res.set("Cache-Control", "no-store").json({
        success: true,
        bot: { id: bot.id, username: bot.username, firstName: bot.first_name },
        webhook: { url: webhook.url || "", pendingUpdateCount: webhook.pending_update_count || 0, lastErrorDate: webhook.last_error_date || null, lastErrorMessage: webhook.last_error_message || null }
      });
    } catch (error) {
      return jsonError(res, 502, "telegram_status_failed", error instanceof Error ? error.message : "Telegram API unavailable");
    }
  });

  app.post("/api/admin/telegram/set-webhook", async (_req, res) => {
    const token = String(env.BOT_TOKEN || "");
    const secret = String(env.TELEGRAM_WEBHOOK_SECRET || "");
    const base = String(env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");
    if (!token || !validWebhookSecret(secret) || !/^https:\/\//i.test(base)) {
      return jsonError(res, 503, "telegram_configuration_incomplete", "Cần BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET và HTTPS PUBLIC_BASE_URL.");
    }
    try {
      const url = base + "/api/telegram/webhook";
      const result = await telegramApi(token, "setWebhook", { url, secret_token: secret, allowed_updates: ["message", "callback_query"], drop_pending_updates: false });
      const bot = await telegramApi(token, "getMe", {});
      return res.status(200).set("Cache-Control", "no-store").json({ success: result === true, webhookUrl: url, bot: { username: bot.username } });
    } catch (error) {
      return jsonError(res, 502, "telegram_webhook_setup_failed", error instanceof Error ? error.message : "Telegram API unavailable");
    }
  });
}
