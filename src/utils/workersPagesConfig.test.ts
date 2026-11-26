/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultDeploymentConfig,
  generateWranglerConfig,
  generatePagesWorkflowYaml,
  getWorkersPagesDirectoryTree,
  generateSystemArchitectureMarkdown,
  getSecurityAuditReport,
} from "./workersPagesConfig.ts";

test("deployment metadata targets the Render web service and PostgreSQL", () => {
  const config = getDefaultDeploymentConfig();
  assert.equal(config.projectName, "hendy-server-app-store");
  assert.equal(config.r2Bucket, "Render PostgreSQL object store");
  assert.equal(config.kvNamespace, "PostgreSQL kv_store adapter");
  assert.equal(config.routes.length, 2);
  assert.equal(config.apiEndpoint, "/api/v1/published-releases");
  assert.match(config.pagesDomain, /onrender\.com/);
  assert.match(config.workersRoute, /Node\.js \+ Express/);
});

test("generated environment guide contains Render settings, never Wrangler bindings", () => {
  const config = getDefaultDeploymentConfig();
  const env = generateWranglerConfig(config);
  assert.match(env, /Render Dashboard/);
  assert.match(env, /DATABASE_URL/);
  assert.match(env, /ADMIN_PASSWORD/);
  assert.doesNotMatch(env, /pages_build_output_dir|\[vars\]/);
});

test("generated CI workflow builds and tests the Render service without Cloudflare deploy", () => {
  const yaml = generatePagesWorkflowYaml();
  assert.match(yaml, /actions\/checkout@v4/);
  assert.match(yaml, /node-version/);
  assert.match(yaml, /npm run build/);
  assert.match(yaml, /npm test/);
  assert.doesNotMatch(yaml, /wrangler@4|Cloudflare Pages/);
});

test("repository tree describes the Render server, Store, Admin and PostgreSQL", () => {
  const tree = getWorkersPagesDirectoryTree();
  assert.equal(tree.type, "directory");
  const names = tree.children?.map((child) => child.name);
  assert.ok(names?.includes("apps/web-user"));
  assert.ok(names?.includes("apps/web-admin"));
  assert.ok(names?.includes("server"));
  assert.ok(names?.includes("render.yaml"));
  assert.ok(names?.includes("packages/db-schema/migrations"));
  assert.ok(!names?.includes("wrangler.toml"));
});

test("architecture and security audit describe Render services and Admin Basic Auth", () => {
  const config = getDefaultDeploymentConfig();
  const markdown = generateSystemArchitectureMarkdown(config);
  const audit = getSecurityAuditReport();
  assert.match(markdown, /Render Web Service/);
  assert.match(markdown, /Render PostgreSQL/);
  assert.match(markdown, /HTTP Basic Auth/);
  assert.match(audit.apiGatewayProtection, /Basic Auth/);
  assert.match(audit.distributionStorage, /PostgreSQL/);
});
