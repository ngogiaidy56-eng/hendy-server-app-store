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

export async function onRequestGet(context) {
  const { DB } = context.env || {};
  if (!DB) return Response.json({ success: true, config: DEFAULT_CONFIG, source: "defaults" });
  try {
    const row = await DB.prepare("SELECT value_json AS valueJson FROM storefront_settings WHERE setting_key = ? LIMIT 1").bind("storefront").first();
    if (!row?.valueJson) return Response.json({ success: true, config: DEFAULT_CONFIG, source: "defaults" });
    const config = JSON.parse(row.valueJson);
    return Response.json({ success: true, config: { ...DEFAULT_CONFIG, ...config }, source: "d1" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("storefront settings query failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ success: true, config: DEFAULT_CONFIG, source: "defaults", warning: "settings_unavailable" });
  }
}
