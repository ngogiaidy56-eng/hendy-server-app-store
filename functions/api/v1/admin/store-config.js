const DEFAULT_CONFIG = {
  brandName: "Hendy Store",
  announcement: "",
  heroEyebrow: "ỨNG DỤNG · CÔNG CỤ · BẢN PHÁT HÀNH",
  heroTitle: "Tất cả ứng dụng",
  heroAccent: "trong một nơi.",
  heroDescription: "Khám phá ứng dụng và tải xuống các bản phát hành thật, với thông tin phiên bản và mã kiểm tra tệp rõ ràng.",
  supportUrl: "",
  repositoryUrl: "https://github.com/ngogiaidy56-eng/hendy-server-app-store"
};

function sanitizeConfig(candidate) {
  const item = candidate && typeof candidate === "object" ? candidate : {};
  const text = (key, fallback, max) => typeof item[key] === "string" ? item[key].trim().slice(0, max) : fallback;
  const httpsUrl = (value) => {
    if (!value) return "";
    try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; }
    catch { return ""; }
  };
  return {
    brandName: text("brandName", DEFAULT_CONFIG.brandName, 70) || DEFAULT_CONFIG.brandName,
    announcement: text("announcement", "", 240),
    heroEyebrow: text("heroEyebrow", DEFAULT_CONFIG.heroEyebrow, 100),
    heroTitle: text("heroTitle", DEFAULT_CONFIG.heroTitle, 100),
    heroAccent: text("heroAccent", DEFAULT_CONFIG.heroAccent, 100),
    heroDescription: text("heroDescription", DEFAULT_CONFIG.heroDescription, 500),
    supportUrl: httpsUrl(text("supportUrl", "", 500)),
    repositoryUrl: httpsUrl(text("repositoryUrl", DEFAULT_CONFIG.repositoryUrl, 500)) || DEFAULT_CONFIG.repositoryUrl
  };
}

export async function onRequestPost(context) {
  const identity = context.data?.adminIdentity;
  const { DB } = context.env || {};
  if (!identity?.email) return Response.json({ success: false, error: "authentication_required" }, { status: 401 });
  if (!DB) return Response.json({ success: false, error: "d1_not_configured" }, { status: 503 });
  let body;
  try {
    if (Number(context.request.headers.get("content-length") || 0) > 32768) return Response.json({ success: false, error: "payload_too_large" }, { status: 413 });
    body = await context.request.json();
  } catch { return Response.json({ success: false, error: "invalid_json" }, { status: 400 }); }
  const config = sanitizeConfig(body?.config);
  const updatedAt = new Date().toISOString();
  try {
    await DB.prepare("INSERT INTO storefront_settings (setting_key, value_json, updated_by, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at")
      .bind("storefront", JSON.stringify(config), identity.email, updatedAt).run();
    return Response.json({ success: true, message: "Đã lưu cấu hình Storefront vào D1.", config, updatedAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("storefront settings save failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ success: false, error: "settings_save_failed" }, { status: 503 });
  }
}
