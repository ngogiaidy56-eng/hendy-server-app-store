import { randomBytes } from "node:crypto";
import { appendFileSync, chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
const emails = (process.env.CF_ACCESS_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const workerName = process.env.CLOUDFLARE_WORKER_NAME || "hendy-tool-releas";
const workerHost = process.env.WORKER_HOST || "hendy-tool-releas.ngogiaidy56.workers.dev";
const outputArg = process.argv.find((item) => item.startsWith("--output="))?.slice("--output=".length);
const outputIndex = process.argv.indexOf("--output");
const outputPath = resolve(outputArg || (outputIndex >= 0 ? process.argv[outputIndex + 1] : "") || resolve(tmpdir(), "hendy-tool-releas-worker-secrets.json"));

if (!/^[a-f0-9]{32}$/i.test(accountId)) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID must be a 32-character Cloudflare account ID.");
}
if (!apiToken) {
  throw new Error("CLOUDFLARE_API_TOKEN is required. Add a scoped token as a GitHub Actions secret.");
}
if (!emails.length || emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
  throw new Error("Set CF_ACCESS_ADMIN_EMAILS to one or more real administrator email addresses, separated by commas, using a GitHub Actions variable or secret.");
}

const apiBase = "https://api.cloudflare.com/client/v4";
async function api(path, { method = "GET", body, allowNotFound = false } = {}) {
  const response = await fetch(apiBase + path, {
    method,
    headers: {
      Authorization: "Bearer " + apiToken,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error("Cloudflare API returned a non-JSON response for " + path + " (HTTP " + response.status + ")."); }
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok || payload.success !== true) {
    const details = Array.isArray(payload.errors)
      ? payload.errors.map((item) => item.message || item.code).filter(Boolean).join("; ")
      : "";
    throw new Error("Cloudflare API request failed for " + path + " (HTTP " + response.status + ")" + (details ? ": " + details : "") + ".");
  }
  return payload.result;
}

function resultArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.apps)) return value.apps;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

async function ensureAccessOrganization() {
  let organization = await api("/accounts/" + accountId + "/access/organizations", { allowNotFound: true });
  if (Array.isArray(organization)) organization = organization[0] || null;
  if (!organization?.auth_domain) {
    organization = await api("/accounts/" + accountId + "/access/organizations", {
      method: "POST",
      body: {
        name: "Hendy Tools Zero Trust",
        session_duration: "24h",
        auto_redirect_to_identity: false,
      },
    });
  }
  const authDomain = String(organization?.auth_domain || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!authDomain.endsWith(".cloudflareaccess.com")) {
    throw new Error("Cloudflare Access organization did not return a valid auth_domain. Finish Zero Trust onboarding in Cloudflare and re-run deployment.");
  }
  return "https://" + authDomain;
}

async function ensureOneTimePinIdentityProvider() {
  const providers = resultArray(await api("/accounts/" + accountId + "/access/identity_providers?per_page=100"));
  const otp = providers.find((provider) => provider.type === "onetimepin");
  if (otp?.id) {
    console.log("Cloudflare Access email one-time-PIN identity provider is ready.");
    return otp.id;
  }
  const created = await api("/accounts/" + accountId + "/access/identity_providers", {
    method: "POST",
    body: { name: "Hendy Admin Email OTP", type: "onetimepin", config: {} },
  });
  if (!created?.id) {
    throw new Error("Cloudflare Access did not return an ID for the One-time PIN identity provider.");
  }
  console.log("Created Cloudflare Access email one-time-PIN identity provider.");
  return created.id;
}

async function ensureAdminApplications(teamDomain, identityProviderId) {
  const existing = resultArray(await api("/accounts/" + accountId + "/access/apps?per_page=100"));
  const protectedPaths = [
    { name: "Hendy Admin Console", path: "/admin*" },
    { name: "Hendy Studio Console", path: "/studio*" },
    { name: "Hendy Admin HTML", path: "/admin.html" },
    { name: "Hendy Admin API", path: "/api/v1/admin/*" },
  ];
  const audiences = [];
  for (const entry of protectedPaths) {
    const domain = workerHost + entry.path;
    const appBody = {
      name: entry.name,
      type: "self_hosted",
      domain,
      session_duration: "24h",
      app_launcher_visible: false,
      auto_redirect_to_identity: false,
      allowed_idps: [identityProviderId],
      policies: [{
        name: "Hendy Admin allow-listed emails",
        decision: "allow",
        include: emails.map((email) => ({ email: { email } })),
        exclude: [],
        require: [],
        precedence: 1,
      }],
    };
    const current = existing.find((app) =>
      app.name === entry.name || app.domain === domain ||
      (Array.isArray(app.destinations) && app.destinations.some((destination) => destination.uri === domain))
    );
    let app;
    if (current?.id) {
      app = await api("/accounts/" + accountId + "/access/apps/" + current.id, {
        method: "PUT",
        body: { ...appBody, aud: current.aud },
      });
      console.log("Updated Access application for protected Admin route.");
    } else {
      app = await api("/accounts/" + accountId + "/access/apps", {
        method: "POST",
        body: appBody,
      });
      console.log("Created Access application for protected Admin route.");
    }
    if (!app?.aud || typeof app.aud !== "string") {
      throw new Error("Access application " + entry.name + " did not return an audience tag; cannot safely link Worker authentication.");
    }
    audiences.push(app.aud);
  }
  return [...new Set(audiences)];
}

const teamDomain = await ensureAccessOrganization();
const identityProviderId = await ensureOneTimePinIdentityProvider();
const audiences = await ensureAdminApplications(teamDomain, identityProviderId);
const publishToken = (process.env.RELEASE_PUBLISH_TOKEN || "").trim() || randomBytes(32).toString("base64url");
const secrets = {
  RELEASE_PUBLISH_TOKEN: publishToken,
  CF_ACCESS_TEAM_DOMAIN: teamDomain,
  CF_ACCESS_AUD: audiences.join(","),
  CF_ACCESS_ADMIN_EMAILS: [...new Set(emails)].join(","),
};

// Wrangler accepts either a flat JSON object or dotenv syntax for --secrets-file.
// Keep the file outside the repository and restrict its permissions.
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(secrets, null, 2) + "\n", { mode: 0o600 });
try { chmodSync(outputPath, 0o600); } catch { /* Windows runners may not support POSIX mode bits. */ }

for (const secret of Object.values(secrets)) {
  if (process.env.GITHUB_ACTIONS === "true") appendFileSync(process.env.GITHUB_ENV, ""); // Ensure GITHUB_ENV exists before masking; values are not logged.
  if (process.env.GITHUB_ACTIONS === "true") process.stdout.write("::add-mask::" + secret + "\n");
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, "secrets_file=" + outputPath + "\n");
  appendFileSync(process.env.GITHUB_OUTPUT, "team_domain_configured=true\n");
  appendFileSync(process.env.GITHUB_OUTPUT, "admin_apps_configured=4\n");
}
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    "### Runtime identity provisioning",
    "",
    "- Cloudflare Access organization: ready",
    "- Protected Admin path applications: 4 configured",
    "- Admin allow-list: configured (values intentionally omitted)",
    "- Email one-time-PIN identity provider: configured",
    "- Worker secrets file: generated outside the repository",
    "- Secret values: masked; not printed or committed",
    "",
  ].join("\n"));
}
console.log("Cloudflare Access applications and Worker secret bindings prepared; secret values were not printed.");
