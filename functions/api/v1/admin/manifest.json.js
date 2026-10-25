import { onRequestGet as publicManifest } from "../public/manifest.json.js";

export async function onRequestGet(context) {
  if (!context.data?.adminIdentity?.email) {
    return Response.json({ success: false, error: "authentication_required" }, { status: 401 });
  }
  return publicManifest(context);
}
