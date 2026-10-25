/**
 * Public application entrypoint.
 *
 * The public bundle mounts only the data-driven storefront. The Admin workspace
 * has a separate HTML entrypoint and is protected by Cloudflare Access in Worker.
 */
import StorefrontV2 from "./interface/store/StorefrontV2.tsx";

export const PRIMARY_CLOUDFLARE_PAGES_DOMAIN = "hendy-app-store.pages.dev";

export default function App() {
  return <StorefrontV2 />;
}
