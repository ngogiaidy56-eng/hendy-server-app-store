/**
 * Public application entrypoint.
 *
 * The public bundle mounts the data-driven storefront. The Admin workspace
 * is served by the same Render Node.js web service and protected by HTTP Basic Auth.
 */
import StorefrontV2 from "./interface/store/StorefrontV2.tsx";

export const PRIMARY_RENDER_SERVICE_NAME = "hendy-server-app-store";

export default function App() {
  return <StorefrontV2 />;
}
