/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultDeploymentConfig,
  generateWranglerConfig,
  generateGitHubWorkflowYaml,
  getWorkersPagesDirectoryTree,
  generateSystemArchitectureMarkdown,
  getSecurityAuditReport,
} from "./workersPagesConfig.ts";

test("deployment config points to the production Worker and R2 bucket", () => {
  const config = getDefaultDeploymentConfig();
  assert.equal(config.projectName, "hendy-tool-releas");
  assert.equal(config.r2Bucket, "hendy-tool-releases");
  assert.equal(config.routes.length, 2);
  assert.equal(config.apiEndpoint, "/api/v1/domains");
  assert.match(config.workersRoute, /workers\.dev/);
});

test("generated Wrangler config contains Worker Static Assets and R2 bindings", () => {
  const toml = generateWranglerConfig(getDefaultDeploymentConfig());
  assert.match(toml, /main = "\.\/src\/worker\.ts"/);
  assert.match(toml, /directory = "\.\/\.worker-dist"/);
  assert.match(toml, /RELEASES_BUCKET/);
  assert.match(toml, /hendy-tool-releases/);
});

test("generated GitHub Actions outline deploys a Worker", () => {
  const yaml = generateGitHubWorkflowYaml(getDefaultDeploymentConfig());
  assert.match(yaml, /actions\/checkout@v4/);
  assert.match(yaml, /node-version/);
  assert.match(yaml, /wrangler@4 deploy/);
});

test("repository tree describes the Worker-only production target", () => {
  const tree = getWorkersPagesDirectoryTree();
  assert.equal(tree.type, "directory");
  const fileNames = tree.children?.map((child) => child.name);
  assert.ok(fileNames?.includes("wrangler.toml"));
  assert.ok(fileNames?.includes("src/worker.ts"));
  assert.ok(fileNames?.includes(".github"));
});

test("architecture documentation describes Cloudflare Worker, Static Assets and R2", () => {
  const markdown = generateSystemArchitectureMarkdown(getDefaultDeploymentConfig());
  assert.match(markdown, /Cloudflare Worker/);
  assert.match(markdown, /Static Assets/);
  assert.match(markdown, /R2/);
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
