/**
 * Deployment metadata used by Admin tooling.
 * This reports the intended Render architecture, not live deployment state.
 *
 * Legacy function/type names are preserved for compatibility with older UI modules.
 */
import type { CloudflareWorkersPagesConfig, SecurityAuditReport, DomainRouteSetting } from "../types/index.ts";

export function getDefaultDeploymentConfig(): CloudflareWorkersPagesConfig {
  const host = "hendy-server-app-store.onrender.com";
  const routes: DomainRouteSetting[] = [
    {
      id: "route-admin", subdomain: "admin", domain: host + "/admin",
      targetView: "studio", purpose: "Admin UI protected by Render HTTP Basic Auth",
      dnsType: "CNAME", dnsTarget: "onrender.com", status: "pending",
      sslStatus: "provisioning", accessControl: "Internal Token Auth", apiManaged: true
    },
    {
      id: "route-downloads", subdomain: "downloads", domain: host + "/api/v1/published-releases",
      targetView: "downloads", purpose: "Public release catalog backed by Render PostgreSQL",
      dnsType: "CNAME", dnsTarget: "onrender.com", status: "pending",
      sslStatus: "provisioning", accessControl: "Public Edge CDN", apiManaged: true
    }
  ];
  return {
    accountName: "Render workspace",
    projectName: "hendy-server-app-store",
    pagesBranch: "main",
    pagesDomain: host,
    workersRoute: "Render Node.js + Express web service",
    r2Bucket: "Render PostgreSQL object store",
    kvNamespace: "PostgreSQL kv_store adapter",
    githubRepoUrl: "https://github.com/ngogiaidy56-eng/hendy-server-app-store",
    apiEndpoint: "/api/v1/published-releases",
    apiKeyProtected: true,
    routes
  };
}

export function getSecurityAuditReport(): SecurityAuditReport {
  return {
    sourceCodeExposureRisk: "Production source maps should remain disabled unless operationally required",
    sourceEncryption: "Admin credentials, publisher token and certificate encryption key are configured as Render environment secrets",
    interfaceIsolation: "Store and Admin use separate HTML entrypoints; Express requires HTTP Basic Auth on Admin pages and protected APIs",
    binaryStripping: "Web bundles are not native binaries; native signing/building requires its own protected CI runner",
    apiGatewayProtection: "Render HTTPS, HTTP Basic Auth for Admin, Bearer token for CI publishing, same-origin mutation checks and PostgreSQL-backed rate limits",
    distributionStorage: "PostgreSQL stores release metadata, artifact BYTEA objects and encrypted certificate blobs"
  };
}

function safe(value: string): string {
  return String(value || "").replace(/["\r\n]/g, "").slice(0, 160);
}

/**
 * Backward-compatible export name. Returns an Environment guide rather than
 * a Wrangler configuration; secret values are never interpolated.
 */
export function generateWranglerConfig(config: CloudflareWorkersPagesConfig): string {
  return [
    "# Configure these values in Render Dashboard > Web Service > Environment",
    "NODE_ENV=production",
    'APP_NAME="Hendy App Store"',
    'ENVIRONMENT="production"',
    'RELEASE_CHANNEL="stable"',
    'PUBLIC_BASE_URL="https://' + safe(config.pagesDomain || "hendy-server-app-store.onrender.com") + '"',
    "PORT=10000",
    "",
    "# Configure secrets separately in Render Environment:",
    "# ADMIN_USERNAME",
    "# ADMIN_PASSWORD",
    "# ADMIN_EMAIL",
    "# RELEASE_PUBLISH_TOKEN",
    "# CERTIFICATE_ENCRYPTION_KEY (Base64 of 32 random bytes)",
    "# DATABASE_URL is connected from the Render PostgreSQL resource",
    ""
  ].join("\n");
}

/**
 * Backward-compatible export name. It now returns CI validation steps only;
 * Render deploys from the approved Blueprint and linked main branch.
 */
export function generatePagesWorkflowYaml(): string {
  return [
    "name: CI - Hendy App Store (Render)",
    "on:",
    "  pull_request:",
    "    branches: [main]",
    "  push:",
    "    branches: [main]",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  verify:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/setup-node@v4",
    '        with:',
    '          node-version: "22"',
    "      - run: npm install --no-audit --no-fund",
    "      - run: npm run lint",
    "      - run: npm test",
    "      - run: npm run build",
    ""
  ].join("\n");
}

export interface DirectoryNode {
  name: string;
  type: "file" | "directory";
  path: string;
  description?: string;
  children?: DirectoryNode[];
}

export function getWorkersPagesDirectoryTree(): DirectoryNode {
  return {
    name: "HendyAppStore",
    type: "directory",
    path: "/",
    children: [
      { name: ".github/workflows/ci.yml", type: "file", path: "/.github/workflows/ci.yml", description: "Type-check, tests and Render build validation" },
      { name: "apps/web-user", type: "directory", path: "/apps/web-user", description: "Storefront and adaptive download components" },
      { name: "apps/web-admin", type: "directory", path: "/apps/web-admin", description: "Admin and certificate management components" },
      { name: "server", type: "directory", path: "/server", description: "Render Express server and PostgreSQL adapters" },
      { name: "functions/api", type: "directory", path: "/functions/api", description: "Existing API business handlers routed by Express" },
      { name: "packages/db-schema/migrations", type: "directory", path: "/packages/db-schema/migrations", description: "Render PostgreSQL migrations" },
      { name: "automation", type: "directory", path: "/automation", description: "Build verification and Render smoke tests" },
      { name: "render.yaml", type: "file", path: "/render.yaml", description: "Render Web Service and PostgreSQL Blueprint" },
      { name: "README.md", type: "file", path: "/README.md", description: "Render deployment guide" }
    ]
  };
}

export function generateSystemArchitectureMarkdown(config: CloudflareWorkersPagesConfig): string {
  return [
    "# Hendy App Store — Render",
    "",
    "```text",
    "Browser",
    "  | HTTPS",
    "  v",
    "Render Web Service — Node.js + Express",
    "  |-- Store HTML / Admin HTML (HTTP Basic Auth)",
    "  |-- API dispatcher -> existing functions/api handlers",
    "  |-- security headers, same-origin checks, rate limiter",
    "  +-- Render PostgreSQL",
    "       |-- releases, app metadata, storefront settings, sync logs",
    "       |-- stored_objects BYTEA: release files + encrypted certificates",
    "       +-- kv_store: runtime status + atomic rate-limit counters",
    "```",
    "",
    "- Render service: " + config.projectName,
    "- Public host: " + config.pagesDomain,
    "- Database: Render PostgreSQL",
    "- Object store adapter: " + config.r2Bucket,
    "- API: " + config.apiEndpoint,
    "- Admin: HTTP Basic Auth",
    "- Repository: " + config.githubRepoUrl,
    "",
    "The Blueprint must be reviewed and explicitly applied before resources are created.",
    ""
  ].join("\n");
}
