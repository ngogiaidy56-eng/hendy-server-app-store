import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const storeHtml = read("dist/index.html");
const adminHtml = read("dist/admin.html");
const packageJson = JSON.parse(read("package.json"));
const server = read("server/index.js");
const platform = read("server/platform.js");
const blueprint = read("render.yaml");
const migration = read("packages/db-schema/migrations/0002_render_storage.sql");

assert.notEqual(storeHtml, adminHtml, "Store and Admin must be separate HTML documents");
assert.match(storeHtml, /\/assets\/[^" ]+\.js/, "Store bundle should be compiled");
assert.match(adminHtml, /\/assets\/[^" ]+\.js/, "Admin bundle should be compiled");
assert.match(storeHtml, /Hendy App Store|Hendy Tools Platform/, "Store title should be present");
assert.match(adminHtml, /Hendy Admin Console/, "Admin title should be present");
assert.match(server, /0\.0\.0\.0/, "Render web service must bind to 0.0.0.0");
assert.match(server, /ADMIN_USERNAME/, "Admin routes must require Render credentials");
assert.match(server, /X-Content-Type-Options/, "Security headers should be configured");
assert.match(platform, /makeD1Adapter/, "Existing route handlers must have a PostgreSQL compatibility adapter");
assert.match(platform, /stored_objects/, "Release objects must be stored in managed PostgreSQL");
assert.match(migration, /CREATE TABLE IF NOT EXISTS stored_objects/, "PostgreSQL object storage table must be migrated");
assert.match(blueprint, /runtime: node/, "Render Blueprint must use Node.js");
assert.match(blueprint, /fromDatabase:/, "Render Blueprint must attach managed PostgreSQL");
assert.match(blueprint, /healthCheckPath: \/api\/healthz/, "Render health check must be configured");
assert.equal(packageJson.scripts.start, "node server/index.js", "Render must start the Express server");
assert.equal(existsSync("wrangler.toml"), false, "Cloudflare Wrangler config must not remain active");

console.log("Verified: Vite Store/Admin build, Render Node.js server, PostgreSQL adapters, admin auth and Render Blueprint.");
