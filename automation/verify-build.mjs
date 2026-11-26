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
const downloaderMigration = read("packages/db-schema/migrations/0003_downloader.sql");

assert.notEqual(storeHtml, adminHtml, "Store and Admin must be separate HTML documents");
assert.match(storeHtml, /\/assets\/[^" ]+\.js/, "Store bundle should be compiled");
assert.match(adminHtml, /\/assets\/[^" ]+\.js/, "Admin bundle should be compiled");
assert.match(storeHtml, /Hendy App Store|Hendy Tools Platform/, "Store title should be present");
assert.match(adminHtml, /Hendy Admin Console/, "Admin title should be present");
assert.match(server, /0\.0\.0\.0/, "Render web service must bind to 0.0.0.0");
assert.match(server, /ADMIN_USERNAME/, "Admin routes must require Render credentials");
assert.match(server, /X-Content-Type-Options/, "Security headers should be configured");
assert.match(platform, /makeD1Adapter/, "Existing route handlers must have a PostgreSQL compatibility adapter");
assert.match(platform, /stored_objects/, "Release objects must be stored in configured PostgreSQL");
assert.match(server, /registerDownloaderRoutes/, "Downloader API routes must be registered");
assert.match(server, /registerTelegramRoutes/, "Telegram webhook routes must be registered");
assert.match(downloaderMigration, /download_events/, "Downloader analytics migration must be present");
assert.match(migration, /CREATE TABLE IF NOT EXISTS stored_objects/, "PostgreSQL object storage table must be migrated");
assert.match(blueprint, /runtime: node/, "Render Blueprint must use Node.js");
assert.match(blueprint, /plan: free/, "Render Web Service must use the Free plan");
assert.match(blueprint, /key: DATABASE_URL\s+sync: false/, "Render must accept an external PostgreSQL URL");
assert.doesNotMatch(blueprint, /fromDatabase:/, "Free Blueprint must not provision Render PostgreSQL");
assert.match(blueprint, /healthCheckPath: \/healthz/, "Render process health check must be configured");
assert.equal(packageJson.scripts.start, "node server/index.js", "Render must start the Express server");
assert.equal(existsSync("wrangler.toml"), false, "Cloudflare Wrangler config must not remain active");

console.log("Verified: Vite Store/Admin build, Render Free Node.js service, external PostgreSQL adapter, Downloader API, Telegram webhook and Admin auth.");
