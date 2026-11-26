export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  return Response.json({
    success: true,
    runtime: "render-node-express",
    provider: "render",
    host: url.host,
    protocol: url.protocol.replace(":", ""),
    userAgent: (context.request.headers.get("user-agent") || "").slice(0, 180),
    timestamp: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}
