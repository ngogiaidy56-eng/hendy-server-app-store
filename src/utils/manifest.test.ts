/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBufferSha256,
  getContentTypeForArtifact,
  inferPlatformFromFilename,
  createManifestArtifactEntry,
  buildAppManifest,
  isValidManifestEntry
} from './manifest.ts';

test('calculateBufferSha256 produces exact 64-char hex SHA-256 hash', () => {
  const sample = Buffer.from('ForgeOS Release Binary Content 2026');
  const hash = calculateBufferSha256(sample);
  assert.equal(hash.length, 64);
  assert.match(hash, /^[a-f0-9]{64}$/);

  // Consistency check
  const secondHash = calculateBufferSha256(sample);
  assert.equal(hash, secondHash);
});

test('getContentTypeForArtifact maps package extensions accurately', () => {
  assert.equal(getContentTypeForArtifact('app.exe'), 'application/vnd.microsoft.portable-executable');
  assert.equal(getContentTypeForArtifact('installer.msi'), 'application/x-msi');
  assert.equal(getContentTypeForArtifact('bundle.dmg'), 'application/x-apple-diskimage');
  assert.equal(getContentTypeForArtifact('app.AppImage'), 'application/x-iso9660-image');
  assert.equal(getContentTypeForArtifact('package.apk'), 'application/vnd.android.package-archive');
  assert.equal(getContentTypeForArtifact('binary.wasm'), 'application/wasm');
});

test('inferPlatformFromFilename identifies correct OS target', () => {
  assert.equal(inferPlatformFromFilename('hyperterminal-win-x64.exe'), 'windows');
  assert.equal(inferPlatformFromFilename('omnicavnas-setup.msi'), 'windows');
  assert.equal(inferPlatformFromFilename('hyperterminal-mac.dmg'), 'macos');
  assert.equal(inferPlatformFromFilename('hyperterminal-linux.AppImage'), 'linux');
  assert.equal(inferPlatformFromFilename('hyperterminal-mobile.apk'), 'android');
});

test('createManifestArtifactEntry produces valid manifest structure with actual URL', () => {
  const hash = 'a'.repeat(64);
  const entry = createManifestArtifactEntry({
    filename: 'hyperterminal-v2.4.0-win-x64.exe',
    version: '2.4.0',
    platform: 'windows',
    format: '.exe',
    arch: 'x86_64',
    sizeBytes: 44920192,
    sha256: hash,
    baseUrl: 'https://tai-ve.forgeos.vn'
  });

  assert.equal(entry.filename, 'hyperterminal-v2.4.0-win-x64.exe');
  assert.equal(entry.version, '2.4.0');
  assert.equal(entry.platform, 'windows');
  assert.equal(entry.sizeBytes, 44920192);
  assert.equal(entry.url, 'https://tai-ve.forgeos.vn/api/v1/downloads/artifacts/hyperterminal-v2.4.0-win-x64.exe');
  assert.equal(entry.sha256, hash);
  assert.equal(isValidManifestEntry(entry), true);
});

test('buildAppManifest combines app metadata with artifacts', () => {
  const hash = 'b'.repeat(64);
  const entry = createManifestArtifactEntry({
    filename: 'app.apk',
    version: '1.0.0',
    platform: 'android',
    format: '.apk',
    sizeBytes: 15000000,
    sha256: hash
  });

  const manifest = buildAppManifest(
    {
      id: 'app-1',
      name: 'Test App',
      slug: 'test-app',
      latestVersion: '1.0.0',
      publisher: 'ForgeOS'
    },
    [entry]
  );

  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.equal(manifest.artifacts.length, 1);
  assert.equal(manifest.app.name, 'Test App');
});
