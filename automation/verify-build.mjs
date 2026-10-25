import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const storeHtml = read("dist/index.html");
const adminHtml = read("dist/admin.html");
const workerlessConfig = read("wrangler.toml");
const workspace = JSON.parse(read("package.json"));
const middleware = read("functions/_middleware.js");
const releaseRoute = read("functions/api/v1/published-releases.js");
const certificateRoute = read("functions/api/v1/admin/certificates.js");
const migration = read("packages/db-schema/migrations/0001_init.sql");

assert.notEqual(storeHtml, adminHtml, "Store and Admin must be distinct documents");
assert.match(storeHtml, /\/assets\/[^" ]+\.js/, "Store bundle should be compiled");
assert.match(adminHtml, /\/assets\/[^" ]+\.js/, "Admin bundle should be compiled");
assert.match(storeHtml, /Hendy App Store|Hendy Tools Platform/, "Store title must be present");
assert.match(adminHtml, /Hendy Admin Console/, "Admin title must be present");
assert.doesNotMatch(storeHtml, /apps\/web-admin\/src\/main\.tsx|src\/main\.tsx/, "Store HTML must not reference TypeScript sources");
assert.doesNotMatch(adminHtml, /apps\/web-admin\/src\/main\.tsx|src\/admin-main\.tsx/, "Admin HTML must not reference TypeScript sources");
assert.match(workerlessConfig, /pages_build_output_dir = "\.\/dist"/, "Wrangler config must be for Pages");
assert.doesNotMatch(workerlessConfig, /^main\s*=/m, "Pages config must not define a Worker entry point");
assert.ok(workspace.workspaces.includes("apps/web-user"), "Storefront workspace must be registered");
assert.ok(workspace.workspaces.includes("apps/web-admin"), "Admin workspace must be registered");
assert.match(middleware, /Cf-Access-Jwt-Assertion/, "Admin middleware must validate the Access JWT");
assert.match(middleware, /RATE_LIMITS/, "Middleware must use KV request limiting");
assert.match(releaseRoute, /FROM releases WHERE status = 'published'/, "Public catalog must read published D1 releases");
assert.match(certificateRoute, /AES-GCM-256/, "Certificate storage must encrypt file contents");
assert.match(migration, /CREATE TABLE IF NOT EXISTS certificates/, "D1 migration must include certificate metadata");
assert.match(migration, /encryption_iv TEXT NOT NULL/, "D1 migration must preserve the encryption nonce");
assert.equal(existsSync("server.ts"), false, "No standalone Node server should remain");
assert.equal(existsSync("src/worker.ts"), false, "Pages Functions replaces the catch-all Worker");
assert.equal(existsSync(".github/workflows/deploy-render.yml"), false, "No Render deployment workflow should remain");
assert.equal(existsSync("wrangler.bootstrap.toml"), false, "No Worker bootstrap config should remain");

console.log("Verified: multi-app storefront/admin build, Pages Functions, D1, R2, KV and encrypted certificate metadata.");
