/**
 * Production deployment helpers. These values describe the checked-in architecture,
 * not proof that a Cloudflare account, custom domain, code signature, or security audit is configured.
 */
import type { CloudflareWorkersPagesConfig, SecurityAuditReport, DomainRouteSetting } from "../types/index.ts";

export function getDefaultDeploymentConfig(): CloudflareWorkersPagesConfig {
  const routes: DomainRouteSetting[] = [
    {
      id: "route-admin", subdomain: "admin", domain: "configure-after-deploy",
      targetView: "studio", purpose: "Giao diện Studio; mọi thao tác nhạy cảm được kiểm soát tại API backend",
      dnsType: "CNAME", dnsTarget: "chưa cấu hình", status: "pending",
      sslStatus: "provisioning", accessControl: "Internal Token Auth", apiManaged: false
    },
    {
      id: "route-downloads", subdomain: "downloads", domain: "configure-after-deploy",
      targetView: "downloads", purpose: "Cổng tải chỉ hiển thị artifact thuộc release đã xuất bản",
      dnsType: "CNAME", dnsTarget: "chưa cấu hình", status: "pending",
      sslStatus: "provisioning", accessControl: "Public Edge CDN", apiManaged: false
    }
  ];
  return {
    accountName: "cấu hình trong Cloudflare Dashboard",
    projectName: "hendy-server-app-downloader",
    pagesBranch: "main",
    pagesDomain: "sẽ có sau khi tạo Pages project",
    workersRoute: "chưa cấu hình — Pages Functions proxy /api/*",
    r2Bucket: "hendy-server-app-artifacts",
    kvNamespace: "không dùng — metadata lưu trong PostgreSQL",
    githubRepoUrl: "https://github.com/hendyngo-servers/hendy-server-app-downloader",
    apiEndpoint: "/api/v1/domains",
    apiKeyProtected: true,
    routes
  };
}

export function getSecurityAuditReport(): SecurityAuditReport {
  return {
    sourceCodeExposureRisk: "Chưa được đo bằng kiểm thử bảo mật độc lập",
    sourceEncryption: "Không tuyên bố mã hóa source trong ứng dụng; bí mật phải lưu tại secret store",
    interfaceIsolation: "UI Studio và trang tải dùng chế độ hiển thị riêng; quyền thực thi được kiểm tra ở API",
    binaryStripping: "Chưa thực hiện trong web build; chỉ áp dụng nếu quy trình native build hỗ trợ",
    apiGatewayProtection: "Bearer session, token hash trong DB, hết hạn phiên và giới hạn tốc độ đăng nhập",
    distributionStorage: "Cloudflare R2 private bucket + PostgreSQL (cần cấu hình đúng trên tài khoản)"
  };
}

function safeToml(value: string): string {
  return String(value || "").replace(/["\r\n]/g, "").slice(0, 120);
}

/** wrangler.toml configures Pages output and deliberately includes no fake resource IDs. */
export function generateWranglerConfig(config: CloudflareWorkersPagesConfig): string {
  return [
    "# Cloudflare Pages + Pages Functions. API metadata and binaries remain on Render/PostgreSQL/R2.",
    'name = "' + safeToml(config.projectName || "hendy-server-app-downloader") + '"',
    'compatibility_date = "2026-10-23"',
    'pages_build_output_dir = "./dist"',
    ""
  ].join("\n");
}

/** Emits the same gateway pattern as functions/api/[[path]].ts. API authorization stays at origin. */
export function generatePagesFunctionsRoute(): string {
  return [
    "/** Pages Functions gateway; set BACKEND_ORIGIN in Pages environment variables. */",
    "interface Env { BACKEND_ORIGIN?: string; }",
    "interface Context { request: Request; env: Env; }",
    "export async function onRequest(context: Context): Promise<Response> {",
    "  const origin = context.env.BACKEND_ORIGIN;",
    "  if (!origin) return Response.json({ error: 'BACKEND_ORIGIN is not configured' }, { status: 503 });",
    "  let backend: URL;",
    "  try {",
    "    backend = new URL(origin);",
    "    if (backend.protocol !== 'https:' && backend.hostname !== 'localhost' && backend.hostname !== '127.0.0.1') throw new Error('HTTPS required');",
    "  } catch { return Response.json({ error: 'Invalid BACKEND_ORIGIN' }, { status: 500 }); }",
    "  const incoming = new URL(context.request.url);",
    "  const target = new URL(backend.toString());",
    "  target.pathname = incoming.pathname;",
    "  target.search = incoming.search;",
    "  try {",
    "    const response = await fetch(new Request(target.toString(), context.request));",
    "    const headers = new Headers(response.headers);",
    "    headers.set('Cache-Control', 'no-store');",
    "    headers.set('X-Content-Type-Options', 'nosniff');",
    "    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });",
    "  } catch { return Response.json({ error: 'Backend unavailable' }, { status: 502 }); }",
    "}",
    ""
  ].join("\n");
}

export function generateGitHubWorkflowYaml(config: CloudflareWorkersPagesConfig): string {
  const project = safeToml(config.projectName || "hendy-server-app-downloader");
  const branch = safeToml(config.pagesBranch || "main");
  return [
    "name: Validate and deploy Hendy Server App Downloader",
    "",
    "on:",
    "  pull_request:",
    "    branches: [main]",
    "  push:",
    "    branches: [main]",
    "  workflow_dispatch:",
    "",
    "permissions:",
    "  contents: read",
    "",
    "jobs:",
    "  build-and-check:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/setup-node@v4",
    "        with:",
    "          node-version: 22",
    "      - run: npm install",
    "      - run: npm run lint",
    "      - run: npm run build",
    "",
    "  deploy-cloudflare-pages:",
    "    if: github.event_name == 'push' && github.ref == 'refs/heads/" + branch + "'",
    "    needs: build-and-check",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/setup-node@v4",
    "        with:",
    "          node-version: 22",
    "      - run: npm install",
    "      - run: npm run build",
    "      - uses: cloudflare/wrangler-action@v3",
    "        with:",
    "          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}",
    "          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}",
    "          command: pages deploy dist --project-name=" + project + " --branch=" + branch,
    "",
    "# Configure Render Auto-Deploy separately. Keep DATABASE_URL, ADMIN_PASSWORD and R2 keys in Render secrets.",
    ""
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
    name: "hendy-server-app-downloader",
    type: "directory",
    path: "/",
    children: [
      {
        name: ".github", type: "directory", path: "/.github", children: [
          {
            name: "workflows", type: "directory", path: "/.github/workflows", children: [
              { name: "ci-deploy.yml", type: "file", path: "/.github/workflows/ci-deploy.yml", description: "Type-check, build và deploy Pages sau push main" }
            ]
          }
        ]
      },
      {
        name: "functions", type: "directory", path: "/functions", children: [
          {
            name: "api", type: "directory", path: "/functions/api", children: [
              { name: "[[path]].ts", type: "file", path: "/functions/api/[[path]].ts", description: "Proxy /api/* đến backend Render qua BACKEND_ORIGIN" }
            ]
          }
        ]
      },
      { name: "migrations", type: "directory", path: "/migrations", children: [
        { name: "0001_init.sql", type: "file", path: "/migrations/0001_init.sql", description: "Schema PostgreSQL cho metadata, phiên đăng nhập và audit" }
      ] },
      { name: "server.ts", type: "file", path: "/server.ts", description: "Express API chạy trên Render Node runtime" },
      { name: "render.yaml", type: "file", path: "/render.yaml", description: "Render Web Service Blueprint, bí mật nhập qua Dashboard" },
      { name: "wrangler.toml", type: "file", path: "/wrangler.toml", description: "Cấu hình Cloudflare Pages; không chứa resource ID giả hoặc secret" },
      { name: "src/App.tsx", type: "file", path: "/src/App.tsx", description: "Giao diện Studio và cổng tải phần mềm" },
      { name: "README.md", type: "file", path: "/README.md", description: "Tài liệu thiết lập môi trường và triển khai" }
    ]
  };
}

export function generateSystemArchitectureMarkdown(config: CloudflareWorkersPagesConfig): string {
  return [
    "# Hendy Server App Downloader — kiến trúc triển khai",
    "",
    "~~~text",
    "Người dùng / Quản trị viên",
    "          | HTTPS",
    "          v",
    "Cloudflare Pages (React/Vite static UI)",
    "          | Pages Functions proxy /api/*",
    "          v",
    "Render Free — Express API / Node.js",
    "        |                    |",
    "        v                    v",
    "PostgreSQL metadata      Cloudflare R2 private bucket",
    "        |                    |",
    "        +---- artifact metadata / signed downloads ----+",
    "~~~",
    "",
    "## Cấu hình hiện tại",
    "- Repository: " + config.githubRepoUrl,
    "- Pages project: " + config.projectName + " (branch " + config.pagesBranch + ")",
    "- Metadata: PostgreSQL; binaries: private R2 bucket " + config.r2Bucket,
    "- API: " + config.apiEndpoint + "; Pages gateway requires BACKEND_ORIGIN",
    "",
    "## Bảo mật và giới hạn",
    "- API admin kiểm tra phiên Bearer ở backend; ẩn tab frontend không phải biện pháp bảo vệ.",
    "- Artifact chỉ được công khai khi release đã xuất bản và có tệp thật lưu trong kho.",
    "- SHA-256 xác minh tính toàn vẹn byte; không chứng minh nhà phát hành đã ký mã nhị phân.",
    "- Domain/TLS, R2 CORS, database backup và secrets phải được xác thực trong tài khoản thực; tài liệu này không khẳng định chúng đã được tạo.",
    ""
  ].join("\n");
}
