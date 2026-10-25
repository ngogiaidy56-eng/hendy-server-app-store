export async function onRequestGet(context) {
  const cf = context.request.cf || {};
  return Response.json({
    success: true,
    runtime: "cloudflare-pages-functions",
    edgeLocation: cf.colo || null,
    country: cf.country || null,
    asn: cf.asn || null,
    tlsVersion: cf.tlsVersion || null,
    timestamp: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}
