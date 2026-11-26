/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRuntimeConfig,
  getRuntimeSecretsStatus,
  generateWranglerVarsBlock,
  DEFAULT_RUNTIME_CONFIG,
} from './runtimeEnv.ts';

test('resolveRuntimeConfig returns a valid Render runtime config', () => {
  const config = resolveRuntimeConfig();
  assert.equal(typeof config.appName, 'string');
  assert.equal(['production', 'development', 'preview'].includes(config.environment), true);
  assert.equal(config.deploymentProvider, 'Render');
  assert.equal(config.databaseProvider, 'Render PostgreSQL');
  assert.equal(config.renderServiceDomain, 'localhost:10000');
  assert.equal(config.version, '3.3.0');
  assert.equal(config.isAirGapped, false);
  assert.equal(DEFAULT_RUNTIME_CONFIG.objectStorageName, 'Render PostgreSQL object store');
});

test('browser-side secret inspector never assumes server secrets are present', () => {
  const status = getRuntimeSecretsStatus();
  assert.equal(status.hasCloudflareApiToken, false);
  assert.equal(status.hasCloudflareAccountId, false);
  assert.equal(status.hasRenderAdminConfig, false);
  assert.equal(status.hasDatabaseUrl, false);
  assert.equal(status.hasCertificateEncryptionKey, false);
  assert.equal(status.hasFirebaseConfig, false);
  assert.equal(status.hasGoogleDriveScope, false);
  assert.equal(status.activeBindingsCount, 0);
  assert.equal(status.totalBindingsCount, 9);
});

test('environment guide lists Render variables but never contains actual secret values', () => {
  const guide = generateWranglerVarsBlock({
    appName: 'Custom App Test',
    environment: 'production',
    appUrl: 'https://store.example.com',
  });
  assert.match(guide, /Render Dashboard/);
  assert.match(guide, /APP_NAME=Custom App Test/);
  assert.match(guide, /ENVIRONMENT=production/);
  assert.match(guide, /PUBLIC_BASE_URL=https:\/\/store[.]example[.]com/);
  assert.match(guide, /ADMIN_PASSWORD/);
  assert.doesNotMatch(guide, /\[vars\]/);
});
