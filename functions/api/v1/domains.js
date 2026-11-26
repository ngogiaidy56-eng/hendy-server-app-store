export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  return Response.json({
    success: true,
    domains: [{ domain: url.host, provider: "render", primary: true, interface: "store-and-admin" }],
    note: "Host đang phục vụ request hiện tại. Custom domain và DNS được quản lý trong Render Dashboard."
  }, { headers: { "Cache-Control": "no-store" } });
}
