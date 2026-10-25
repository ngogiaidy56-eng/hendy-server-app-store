export function onRequest(context) {
  return Response.redirect(new URL("/admin.html", context.request.url).toString(), 302);
}
