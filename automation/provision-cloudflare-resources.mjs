import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
const pageProject = String(process.env.PAGES_PROJECT_NAME || "hendy-app-store").trim();
const d1Name = String(process.env.D1_DATABASE_NAME || "hendy-app-store-db").trim();
const r2Name = String(process.env.R2_BUCKET_NAME || "hendy-tool-releases").trim();
const kvTitle = String(process.env.KV_NAMESPACE_TITLE || "hendy-app-store-rate-limits").trim();
const publicHost = String(process.env.APP_PUBLIC_HOST || pageProject + ".pages.dev").trim();

if (!/^[a-f0-9]{32}$/i.test(accountId)) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID.");
}
if (!apiToken) throw new Error("CLOUDFLARE_API_TOKEN is required to provision Cloudflare resources.");
if (!/^[a-z0-9-]{3,63}$/.test(pageProject)) throw new Error("PAGES_PROJECT_NAME must use lowercase letters, digits, and hyphens.");

const apiBase = "https://api.cloudflare.com/client/v4";
async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(apiBase + path, {
    method,
    headers: { Authorization: "Bearer " + apiToken, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error("Cloudflare API returned non-JSON for " + path + " (HTTP " + response.status + ")."); }
  if (!response.ok || payload.success !== true) {
    const details = Array.isArray(payload.errors) ? payload.errors.map((item) => item.message || item.code).filter(Boolean).join("; ") : "";
    throw new Error("Cloudflare API failed for " + path + " (HTTP " + response.status + ")" + (details ? ": " + details : "") + ".");
  }
  return payload.result;
}
function listFrom(result, key) {
  if (Array.isArray(result)) return result;
  if (key && Array.isArray(result?.[key])) return result[key];
  if (Array.isArray(result?.result)) return result.result;
  return [];
}

async function ensureR2() {
  const result = await api("/accounts/" + accountId + "/r2/buckets?per_page=1000");
  const buckets = listFrom(result, "buckets");
  if (buckets.some((item) => item.name === r2Name)) {
    console.log("R2 bucket exists: " + r2Name);
    return;
  }
  await api("/accounts/" + accountId + "/r2/buckets", { method: "POST", body: { name: r2Name } });
  console.log("Created R2 bucket: " + r2Name);
}

async function ensureD1() {
  const result = await api("/accounts/" + accountId + "/d1/database?per_page=1000");
  const databases = listFrom(result, "databases");
  let database = databases.find((item) => item.name === d1Name);
  if (!database) {
    database = await api("/accounts/" + accountId + "/d1/database", { method: "POST", body: { name: d1Name } });
    console.log("Created D1 database: " + d1Name);
  } else {
    console.log("D1 database exists: " + d1Name);
  }
  if (!database?.uuid) throw new Error("Cloudflare D1 did not return a database UUID for " + d1Name + ".");
  return database.uuid;
}

async function ensureKV() {
  const result = await api("/accounts/" + accountId + "/storage/kv/namespaces?per_page=1000");
  const namespaces = listFrom(result, "namespaces");
  let namespace = namespaces.find((item) => item.title === kvTitle);
  if (!namespace) {
    namespace = await api("/accounts/" + accountId + "/storage/kv/namespaces", { method: "POST", body: { title: kvTitle } });
    console.log("Created KV namespace: " + kvTitle);
  } else {
    console.log("KV namespace exists: " + kvTitle);
  }
  if (!namespace?.id) throw new Error("Cloudflare KV did not return a namespace ID for " + kvTitle + ".");
  return namespace.id;
}

async function ensurePagesProject() {
  const result = await api("/accounts/" + accountId + "/pages/projects?per_page=1000");
  const projects = listFrom(result, "projects");
  if (projects.some((item) => item.name === pageProject)) {
    console.log("Pages project exists: " + pageProject);
    return;
  }
  await api("/accounts/" + accountId + "/pages/projects", {
    method: "POST",
    body: {
      name: pageProject,
      production_branch: "main",
      build_config: {
        build_command: "npm run build",
        destination_dir: "dist",
        root_dir: "/"
      }
    }
  });
  console.log("Created Pages project: " + pageProject);
}

await ensurePagesProject();
const [d1Id, kvId] = await Promise.all([ensureD1(), ensureKV()]);
await ensureR2();

const config = {
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": pageProject,
  "pages_build_output_dir": "./dist",
  "compatibility_date": "2026-10-26",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [{
    "binding": "DB",
    "database_name": d1Name,
    "database_id": d1Id,
    "migrations_dir": "packages/db-schema/migrations"
  }],
  "r2_buckets": [{ "binding": "RELEASES", "bucket_name": r2Name }],
  "kv_namespaces": [{ "binding": "RATE_LIMITS", "id": kvId }],
  "vars": {
    "APP_NAME": "Hendy App Store",
    "ENVIRONMENT": "production",
    "PUBLIC_BASE_URL": "https://" + publicHost,
    "RELEASE_CHANNEL": "stable",
    "R2_BUCKET_NAME": r2Name,
    "D1_DATABASE_NAME": d1Name
  }
};
const generatedPath = resolve("wrangler.generated.jsonc");
writeFileSync(generatedPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
console.log("Generated Wrangler Pages config with D1/R2/KV resource IDs.");

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    "### Cloudflare resources",
    "",
    "- Pages project: `" + pageProject + "`",
    "- D1 database: `" + d1Name + "`",
    "- R2 bucket: `" + r2Name + "`",
    "- KV namespace: `" + kvTitle + "`",
    "- Generated deployment config: `wrangler.generated.jsonc` (ignored by Git)",
    ""
  ].join("\n"));
}
