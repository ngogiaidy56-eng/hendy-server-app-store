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

test("deployment metadata targets Cloudflare Pages Functions, D1, R2 and KV", () => {
  const config = getDefaultDeploymentConfig();
  assert.equal(config.projectName, "hendy-app-store");
  assert.equal(config.r2Bucket, "hendy-tool-releases");
  assert.equal(config.kvNamespace, "hendy-app-store-rate-limits");
  assert.equal(config.routes.length, 2);
  assert.equal(config.apiEndpoint, "/api/v1/published-releases");
  assert.match(config.pagesDomain, /pages\.dev/);
  assert.match(config.workersRoute, /Pages Functions/);
});

test("generated Wrangler configuration uses the Pages build output, not a standalone Worker", () => {
  const config = getDefaultDeploymentConfig();
  const toml = generateWranglerConfig(config);
  assert.match(toml, /pages_build_output_dir = "\.\/dist"/);
  assert.match(toml, /hendy-app-store/);
  assert.match(toml, /D1|KV|R2/);
  assert.doesNotMatch(toml, /^main\s*=/m);
});

test("generated Pages workflow runs build and Wrangler Pages deploy", () => {
  const yaml = generatePagesWorkflowYaml();
  assert.match(yaml, /actions\/checkout@v4/);
  assert.match(yaml, /node-version/);
  assert.match(yaml, /wrangler@4 pages deploy/);
  assert.match(yaml, /automation\/provision-cloudflare-resources\.mjs/);
});

test("repository tree describes the split storefront/admin and serverless backend", () => {
  const tree = getWorkersPagesDirectoryTree();
  assert.equal(tree.type, "directory");
  const names = tree.children?.map((child) => child.name);
  assert.ok(names?.includes("apps/web-user"));
  assert.ok(names?.includes("apps/web-admin"));
  assert.ok(names?.includes("functions"));
  assert.ok(names?.includes("packages/db-schema/migrations"));
  assert.ok(names?.includes("wrangler.toml"));
});

test("architecture documents Pages Functions with D1, R2, KV and Access", () => {
  const markdown = generateSystemArchitectureMarkdown(getDefaultDeploymentConfig());
  assert.match(markdown, /Cloudflare Pages/);
  assert.match(markdown, /Pages Functions/);
  assert.match(markdown, /D1/);
  assert.match(markdown, /R2/);
  assert.match(markdown, /KV/);
  assert.match(markdown, /Access/);
});

test("security audit report includes key production controls", () => {
  const audit = getSecurityAuditReport();
  assert.ok(audit.sourceCodeExposureRisk);
  assert.ok(audit.sourceEncryption);
  assert.ok(audit.interfaceIsolation);
  assert.ok(audit.apiGatewayProtection);
  assert.ok(audit.distributionStorage);
});
