import { appendFileSync, chmodSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
const emails = String(process.env.CF_ACCESS_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
const projectName = String(process.env.PAGES_PROJECT_NAME || "hendy-app-store").trim();
const publisherToken = String(process.env.RELEASE_PUBLISH_TOKEN || "").trim();
const certificateKey = String(process.env.CERTIFICATE_ENCRYPTION_KEY || "").trim();
const hosts = [...new Set([
  String(process.env.APP_PUBLIC_HOST || projectName + ".pages.dev").trim(),
  ...String(process.env.ADDITIONAL_PUBLIC_HOSTS || "").split(",").map((v) => v.trim()).filter(Boolean)
].map((host) => host.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase()))];
const protectedPaths = [
  { label: "Admin console", path: "/admin*" },
  { label: "Admin HTML", path: "/admin.html" },
  { label: "Studio console", path: "/studio*" },
  { label: "Admin identity API", path: "/api/auth" },
  { label: "Admin runtime config", path: "/api/v1/runtime-config" },
  { label: "Admin sync logs", path: "/api/sync-logs*" },
  { label: "Admin API", path: "/api/v1/admin/*" }
];

if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error("CLOUDFLARE_ACCOUNT_ID must be a 32-character account ID.");
if (!apiToken) throw new Error("CLOUDFLARE_API_TOKEN is required.");
if (!emails.length || emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Set CF_ACCESS_ADMIN_EMAILS to valid admin emails separated by commas.");
if (!publisherToken || publisherToken.length < 32) throw new Error("RELEASE_PUBLISH_TOKEN must be a stable random token with at least 32 characters.");
let keyBytes;
try { keyBytes = Buffer.from(certificateKey, "base64"); } catch { keyBytes = Buffer.alloc(0); }
if (keyBytes.length !== 32) throw new Error("CERTIFICATE_ENCRYPTION_KEY must be the Base64 output of a 32-byte random key.");
for (const host of hosts) {
  if (!/^[a-z0-9.-]+$/.test(host)) throw new Error("Invalid APP_PUBLIC_HOST/ADDITIONAL_PUBLIC_HOSTS hostname.");
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch("https://api.cloudflare.com/client/v4" + path, {
    method,
    headers: { Authorization: "Bearer " + apiToken, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error("Cloudflare API returned non-JSON for " + path + "."); }
  if (!response.ok || payload.success !== true) {
    const detail = Array.isArray(payload.errors) ? payload.errors.map((e) => e.message || e.code).filter(Boolean).join("; ") : "";
    throw new Error("Cloudflare Access API failed for " + path + " (HTTP " + response.status + ")" + (detail ? ": " + detail : "") + ".");
  }
  return payload.result;
}
function arr(value, key) {
  if (Array.isArray(value)) return value;
  if (key && Array.isArray(value?.[key])) return value[key];
  if (Array.isArray(value?.result)) return value.result;
  return [];
}
async function ensureOrganization() {
  let result = await api("/accounts/" + accountId + "/access/organizations");
  if (Array.isArray(result)) result = result[0] || null;
  if (!result?.auth_domain) {
    result = await api("/accounts/" + accountId + "/access/organizations", {
      method: "POST",
      body: { name: "Hendy App Store Zero Trust", session_duration: "24h", auto_redirect_to_identity: false }
    });
  }
  const domain = String(result?.auth_domain || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!domain.endsWith(".cloudflareaccess.com")) throw new Error("Complete Cloudflare Zero Trust onboarding, then retry.");
  return "https://" + domain;
}
async function ensureOtpProvider() {
  const providers = arr(await api("/accounts/" + accountId + "/access/identity_providers?per_page=100"), "identity_providers");
  const current = providers.find((provider) => provider.type === "onetimepin");
  if (current?.id) return current.id;
  const created = await api("/accounts/" + accountId + "/access/identity_providers", {
    method: "POST", body: { name: "Hendy App Store Email OTP", type: "onetimepin", config: {} }
  });
  if (!created?.id) throw new Error("Cloudflare Access did not return an identity provider ID.");
  return created.id;
}
async function ensureApplications(identityDomain, otpId) {
  const existing = arr(await api("/accounts/" + accountId + "/access/apps?per_page=1000"), "apps");
  const audiences = [];
  for (const host of hosts) {
    for (const item of protectedPaths) {
      const domain = host + item.path;
      const appName = "Hendy App Store " + host + " — " + item.label;
      const appBody = {
        name: appName,
        type: "self_hosted",
        domain,
        session_duration: "24h",
        app_launcher_visible: false,
        auto_redirect_to_identity: false,
        allowed_idps: [otpId],
        policies: [{
          name: "Hendy App Store admin allow-list",
          decision: "allow",
          include: emails.map((email) => ({ email: { email } })),
          exclude: [],
          require: [],
          precedence: 1
        }]
      };
      const found = existing.find((app) => app.domain === domain || app.name === appName);
      const saved = found?.id
        ? await api("/accounts/" + accountId + "/access/apps/" + found.id, { method: "PUT", body: { ...appBody, aud: found.aud } })
        : await api("/accounts/" + accountId + "/access/apps", { method: "POST", body: appBody });
      if (!saved?.aud) throw new Error("Cloudflare Access app did not return an audience tag for " + domain + ".");
      audiences.push(saved.aud);
    }
  }
  return [...new Set(audiences)];
}

const identityDomain = await ensureOrganization();
const otpId = await ensureOtpProvider();
const audiences = await ensureApplications(identityDomain, otpId);
const secretValues = {
  CF_ACCESS_TEAM_DOMAIN: identityDomain,
  CF_ACCESS_AUD: audiences.join(","),
  CF_ACCESS_ADMIN_EMAILS: [...new Set(emails)].join(","),
  RELEASE_PUBLISH_TOKEN: publisherToken,
  CERTIFICATE_ENCRYPTION_KEY: certificateKey
};

const secretDirectory = resolve(".runtime");
const secretFile = resolve(secretDirectory, "pages-secrets.json");
mkdirSync(secretDirectory, { recursive: true });
writeFileSync(secretFile, JSON.stringify(secretValues) + "\n", { mode: 0o600 });
try { chmodSync(secretFile, 0o600); } catch {}
try {
  const args = ["--yes", "wrangler@4", "pages", "secret", "bulk", secretFile, "--project-name", projectName];
  const result = spawnSync("npx", args, { encoding: "utf8", env: process.env, timeout: 120000 });
  if (result.status !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join("\n").slice(-3500);
    throw new Error("Could not upload Pages secrets with Wrangler. " + message);
  }
  console.log("Uploaded Pages secrets; secret values were not printed.");
} finally {
  rmSync(secretFile, { force: true });
}
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    "### Cloudflare Access",
    "",
    "- Email One-time PIN identity provider: configured",
    "- Path-scoped Access applications: " + (hosts.length * protectedPaths.length),
    "- Allow-listed Admin emails: " + [...new Set(emails)].length + " (values hidden)",
    "- Pages secrets: uploaded securely via Wrangler; values not logged",
    ""
  ].join("\n"));
}
