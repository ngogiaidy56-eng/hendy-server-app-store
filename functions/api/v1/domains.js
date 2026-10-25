export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  return Response.json({
    success: true,
    domains: [{ domain: url.host, provider: "cloudflare-pages", primary: true, interface: "store-and-admin" }],
    note: "Danh sách host thể hiện request hiện tại; trạng thái DNS/custom domain được xác nhận trong Cloudflare Dashboard."
  }, { headers: { "Cache-Control": "no-store" } });
}
