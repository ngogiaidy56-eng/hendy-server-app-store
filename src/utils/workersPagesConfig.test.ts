/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultDeploymentConfig,
  generateWranglerConfig,
  generatePagesFunctionsRoute,
  generateGitHubWorkflowYaml,
  getWorkersPagesDirectoryTree,
  generateSystemArchitectureMarkdown,
  getSecurityAuditReport
} from './workersPagesConfig.ts';

test('getDefaultDeploymentConfig returns isolated routes for studio and downloads with API config', () => {
  const config = getDefaultDeploymentConfig();
  assert.equal(config.routes.length, 2);
  assert.equal(config.routes[0].targetView, 'studio');
  assert.equal(config.routes[1].targetView, 'downloads');
  assert.notEqual(config.routes[0].subdomain, config.routes[1].subdomain);
  assert.equal(config.apiEndpoint, '/api/v1/domains');
});

test('generateWranglerConfig includes required Pages configuration', () => {
  const config = getDefaultDeploymentConfig();
  const toml = generateWranglerConfig(config);
  assert.match(toml, /hendy-server-app-downloader/);
  assert.match(toml, /compatibility_date/);
  assert.match(toml, /pages_build_output_dir/);
});

test('generatePagesFunctionsRoute includes gateway proxy and header forwarding', () => {
  const code = generatePagesFunctionsRoute();
  assert.match(code, /BACKEND_ORIGIN/);
  assert.match(code, /onRequest/);
  assert.match(code, /Cache-Control/);
  assert.match(code, /nosniff/);
});

test('generateGitHubWorkflowYaml specifies automated build and Pages deployment', () => {
  const config = getDefaultDeploymentConfig();
  const yaml = generateGitHubWorkflowYaml(config);
  assert.match(yaml, /actions\/checkout@v4/);
  assert.match(yaml, /actions\/setup-node@v4/);
  assert.match(yaml, /cloudflare\/wrangler-action@v3/);
  assert.match(yaml, /pages deploy/);
});

test('getWorkersPagesDirectoryTree provides full required structure', () => {
  const tree = getWorkersPagesDirectoryTree();
  assert.equal(tree.type, 'directory');
  const fileNames = tree.children?.map(c => c.name);
  assert.ok(fileNames?.includes('wrangler.toml'));
  assert.ok(fileNames?.includes('functions'));
  assert.ok(fileNames?.includes('.github'));
});

test('generateSystemArchitectureMarkdown includes ASCII architecture diagram', () => {
  const config = getDefaultDeploymentConfig();
  const md = generateSystemArchitectureMarkdown(config);
  assert.match(md, /Cloudflare Pages/);
  assert.match(md, /Render Free/);
  assert.match(md, /PostgreSQL/);
  assert.match(md, /Cloudflare R2/);
});

test('getSecurityAuditReport provides production audit structure', () => {
  const audit = getSecurityAuditReport();
  assert.ok(audit.sourceCodeExposureRisk);
  assert.ok(audit.sourceEncryption);
  assert.ok(audit.interfaceIsolation);
  assert.ok(audit.apiGatewayProtection);
});
