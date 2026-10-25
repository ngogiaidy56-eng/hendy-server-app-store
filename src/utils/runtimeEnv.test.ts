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

test('resolveRuntimeConfig returns valid default production config', () => {
  const config = resolveRuntimeConfig();
  assert.equal(typeof config.appName, 'string');
  assert.equal(['production', 'development', 'preview'].includes(config.environment), true);
  assert.equal(config.cloudflarePagesDomain, 'hendy-app-store.pages.dev');
  assert.equal(config.version, '3.3.0');
  assert.equal(config.isAirGapped, false);
});

test('getRuntimeSecretsStatus accurately aggregates security bindings', () => {
  const status = getRuntimeSecretsStatus();
  assert.equal(typeof status.hasCloudflareApiToken, 'boolean');
  assert.equal(typeof status.hasFirebaseConfig, 'boolean');
  assert.equal(status.hasFirebaseConfig, false);
  assert.equal(status.hasGoogleDriveScope, false, 'Browser cannot infer Google Drive permission without runtime confirmation');
  assert.equal(status.activeBindingsCount, 0, 'Browser status must not assume server secrets are present');
  assert.equal(status.totalBindingsCount, 6);
});

test('generateWranglerVarsBlock generates TOML formatted variables section', () => {
  const toml = generateWranglerVarsBlock({
    appName: 'Custom App Test',
    environment: 'production',
  });
  assert.match(toml, /\[vars\]/);
  assert.match(toml, /APP_NAME = "Custom App Test"/);
  assert.match(toml, /ENVIRONMENT = "production"/);
  assert.match(toml, /CLOUDFLARE_PAGES_DOMAIN = "hendy-app-store[.]pages[.]dev"/);
});
