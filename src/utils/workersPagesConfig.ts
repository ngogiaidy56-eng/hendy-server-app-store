/**
 * Cloudflare deployment metadata used by Admin tooling.
 * Values describe intended configuration; they do not prove that the account is provisioned.
 */
import type { CloudflareWorkersPagesConfig, SecurityAuditReport, DomainRouteSetting } from "../types/index.ts";

export function getDefaultDeploymentConfig(): CloudflareWorkersPagesConfig {
  const workerHost = "hendy-tool-releas.ngogiaidy56.workers.dev";
  const routes: DomainRouteSetting[] = [
    {
      id: "route-admin",
      subdomain: "admin",
      domain: workerHost + "/admin",
      targetView: "studio",
      purpose: "Giao diện Admin được bảo vệ bằng Cloudflare Access; API xác thực ở Worker",
      dnsType: "CNAME",
      dnsTarget: "workers.dev",
      status: "pending",
      sslStatus: "provisioning",
      accessControl: "Internal Token Auth",
      apiManaged: true,
    },
    {
      id: "route-downloads",
      subdomain: "downloads",
      domain: workerHost + "/api/v1/published-releases",
      targetView: "downloads",
      purpose: "Danh mục chỉ trả về artifact thực đã được xuất bản trong R2",
      dnsType: "CNAME",
      dnsTarget: "workers.dev",
      status: "pending",
      sslStatus: "provisioning",
      accessControl: "Public Edge CDN",
      apiManaged: true,
    },
  ];
  return {
    accountName: "cấu hình trong Cloudflare Dashboard",
    projectName: "hendy-tool-releas",
    pagesBranch: "main",
    pagesDomain: "không sử dụng; giao diện được phục vụ bởi Worker Static Assets",
    workersRoute: "https://" + workerHost + " (giao diện và API dùng chung Worker)",
    r2Bucket: "hendy-tool-releases",
    kvNamespace: "không sử dụng; artifact metadata đọc từ R2",
    githubRepoUrl: "https://github.com/ngogiaidy56-eng/hendy-server-app-store",
    apiEndpoint: "/api/v1/domains",
    apiKeyProtected: true,
    routes,
  };
}

export function getSecurityAuditReport(): SecurityAuditReport {
  return {
    sourceCodeExposureRisk: "Cần chạy SAST và rà soát thủ công trước mỗi bản production",
    sourceEncryption: "Frontend build có thể tải xuống từ trình duyệt; không lưu bí mật trong bundle",
    interfaceIsolation: "Store và Admin có HTML entrypoint riêng; quyền Admin được xác minh bằng Cloudflare Access và Worker API",
    binaryStripping: "Không áp dụng tự động cho web bundle; native artifact cần pipeline riêng",
    apiGatewayProtection: "Signed Cloudflare Access JWT, issuer/audience/expiry/email allow-list và publisher token phía server",
    distributionStorage: "Cloudflare R2 bucket hendy-tool-releases; chỉ coi artifact sẵn sàng khi object thật tồn tại",
  };
}

function safeToml(value: string): string {
  return String(value || "").replace(/["\r\n]/g, "").slice(0, 160);
}

/** Produces a Cloudflare Worker configuration with Static Assets and R2. */
export function generateWranglerConfig(config: CloudflareWorkersPagesConfig): string {
  const workerName = safeToml(config.projectName || "hendy-tool-releas");
  const bucket = safeToml(config.r2Bucket || "hendy-tool-releases");
  return [
    "# Cloudflare Worker with Static Assets and R2",
    'name = "' + workerName + '"',
    'main = "./src/worker.ts"',
    'compatibility_date = "2026-10-26"',
    "workers_dev = true",
    "",
    "[assets]",
    'directory = "./.worker-dist"',
    'binding = "ASSETS"',
    'not_found_handling = "single-page-application"',
    "",
    "[[r2_buckets]]",
    'binding = "RELEASES_BUCKET"',
    'bucket_name = "' + bucket + '"',
    "",
  ].join("\n");
}

/** Produces a minimal Worker-only GitHub Actions workflow. */
export function generateGitHubWorkflowYaml(_config: CloudflareWorkersPagesConfig): string {
  return [
    "name: Deploy Hendy App Store to Cloudflare Worker",
    "",
    "on:",
    "  push:",
    "    branches: [main]",
    "  workflow_dispatch:",
    "",
    "permissions:",
    "  contents: read",
    "",
    "jobs:",
    "  deploy:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/setup-node@v4",
    "        with:",
    '          node-version: "22"',
    "      - run: npm install",
    "      - run: npm run lint",
    "      - run: npm test",
    "      - run: npm run build",
    "      - run: npx --yes wrangler@4 deploy --config=wrangler.toml",
    "",
  ].join("\n");
}

export interface DirectoryNode {
  name: string;
  type: "file" | "directory";
  path: string;
  size?: string;
  description?: string;
  children?: DirectoryNode[];
}

export function getWorkersPagesDirectoryTree(): DirectoryNode {
  return {
    name: "hendy-server-app-store",
    type: "directory",
    path: "/",
    children: [
      {
        name: ".github",
        type: "directory",
        path: "/.github",
        children: [{
          name: "workflows",
          type: "directory",
          path: "/.github/workflows",
          children: [
            { name: "ci-deploy.yml", type: "file", path: "/.github/workflows/ci-deploy.yml", description: "Type-check, test and build" },
            { name: "deploy-cloudflare.yml", type: "file", path: "/.github/workflows/deploy-cloudflare.yml", description: "Production Worker deploy and smoke tests" },
          ],
        }],
      },
      { name: "src/worker.ts", type: "file", path: "/src/worker.ts", description: "Worker router, API and R2 delivery" },
      { name: "src/main.tsx", type: "file", path: "/src/main.tsx", description: "Storefront React entrypoint" },
      { name: "src/admin-main.tsx", type: "file", path: "/src/admin-main.tsx", description: "Admin React entrypoint" },
      { name: "wrangler.toml", type: "file", path: "/wrangler.toml", description: "Production Worker configuration" },
      { name: "wrangler.bootstrap.toml", type: "file", path: "/wrangler.bootstrap.toml", description: "First deployment before Access secrets are available" },
      { name: "scripts", type: "directory", path: "/scripts", description: "Build, provisioning and smoke-test scripts" },
      { name: "README.md", type: "file", path: "/README.md", description: "Cloudflare deployment runbook" },
    ],
  };
}

export function generateSystemArchitectureMarkdown(config: CloudflareWorkersPagesConfig): string {
  return [
    "# Hendy Server App Store — Cloudflare Worker architecture",
    "",
    "~~~text",
    "Browser",
    "  | HTTPS",
    "  v",
    "Cloudflare Worker + Static Assets",
    "  |-- Storefront HTML/JS/CSS",
    "  |-- Admin HTML protected by Cloudflare Access",
    "  |-- API routes and token validation",
    "  |-- R2 binding RELEASES_BUCKET",
    "  +-- R2 artifacts and published release metadata",
    "~~~",
    "",
    "## Runtime configuration",
    "- Worker: " + config.projectName,
    "- Public URL: " + config.workersRoute,
    "- R2 bucket: " + config.r2Bucket,
    "- API: " + config.apiEndpoint,
    "- Source: " + config.githubRepoUrl,
    "",
    "## Production notes",
    "- This is the intended architecture, not proof of a live deployment.",
    "- Keep private values in Cloudflare Worker secrets or GitHub Actions secrets.",
    "- Do not mark a release available until the actual artifact is present in R2.",
    "",
  ].join("\n");
}
