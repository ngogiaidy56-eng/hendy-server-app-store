import { publishArtifact } from "../../../../packages/shared-types/src/release-utils.js";

export async function onRequestPost(context) {
  return publishArtifact(context, "ci");
}
