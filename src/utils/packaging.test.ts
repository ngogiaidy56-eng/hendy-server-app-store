/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectUserPlatform,
  validateSemver,
  formatBytes,
  generateArtifactFilename,
  generatePseudoSha256,
  getRecommendedInstallerCommand,
  createExecutableInstallerScript,
  getPlatformVietnameseName
} from './packaging.ts';

test('getPlatformVietnameseName returns standard commercial Vietnamese names', () => {
  assert.match(getPlatformVietnameseName('windows'), /Windows/);
  assert.match(getPlatformVietnameseName('macos'), /macOS/);
  assert.match(getPlatformVietnameseName('linux'), /Linux/);
  assert.match(getPlatformVietnameseName('android'), /Android/);
  assert.match(getPlatformVietnameseName('web'), /WebAssembly/);
});

test('detectUserPlatform accurately identifies operating systems', () => {
  assert.equal(detectUserPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'windows');
  assert.equal(detectUserPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'macos');
  assert.equal(detectUserPlatform('Mozilla/5.0 (X11; Linux x86_64)'), 'linux');
  assert.equal(detectUserPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'android');
  assert.equal(detectUserPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'ios');
});

test('validateSemver validates semver syntax', () => {
  assert.equal(validateSemver('v1.0.0'), true);
  assert.equal(validateSemver('2.4.1'), true);
  assert.equal(validateSemver('v3.0.0-beta.1'), true);
  assert.equal(validateSemver('1.2'), false);
  assert.equal(validateSemver('invalid-version'), false);
  assert.equal(validateSemver(''), false);
});

test('formatBytes converts byte numbers to human-readable strings', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(52428800), '50 MB');
});

test('generateArtifactFilename formats proper platform names and extensions', () => {
  const win = generateArtifactFilename('HyperTerminal', 'v2.4.0', 'windows', 'x86_64', '.exe');
  assert.equal(win, 'hyperterminal-v2.4.0-x86_64-setup.exe');

  const mac = generateArtifactFilename('HyperTerminal', 'v2.4.0', 'macos', 'universal', '.dmg');
  assert.equal(mac, 'hyperterminal-v2.4.0-universal.dmg');

  const linux = generateArtifactFilename('HyperTerminal', 'v2.4.0', 'linux', 'x86_64', '.AppImage');
  assert.equal(linux, 'hyperterminal-v2.4.0-x86_64.AppImage');
});

test('generatePseudoSha256 outputs deterministic 64-character hex strings', () => {
  const hash1 = generatePseudoSha256('build-hyperterminal-v2.4.0-windows');
  const hash2 = generatePseudoSha256('build-hyperterminal-v2.4.0-windows');
  const hash3 = generatePseudoSha256('different-seed');

  assert.equal(hash1.length, 64);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
});

test('getRecommendedInstallerCommand produces CLI instructions', () => {
  const winCmd = getRecommendedInstallerCommand('windows', 'hyperterminal', 'v2.4.0');
  assert.match(winCmd.command, /winget install/);

  const macCmd = getRecommendedInstallerCommand('macos', 'hyperterminal', 'v2.4.0');
  assert.match(macCmd.command, /brew install --cask/);

  const linuxCmd = getRecommendedInstallerCommand('linux', 'hyperterminal', 'v2.4.0');
  assert.match(linuxCmd.command, /flatpak install/);
});

test('createExecutableInstallerScript generates valid executable shell or batch script', () => {
  const winScript = createExecutableInstallerScript('HyperTerminal', 'v2.4.0', 'windows', '.exe');
  assert.match(winScript, /@echo off/);
  assert.match(winScript, /HyperTerminal/);

  const unixScript = createExecutableInstallerScript('HyperTerminal', 'v2.4.0', 'linux', '.AppImage');
  assert.match(unixScript, /#!\/usr\/bin\/env bash/);
  assert.match(unixScript, /HyperTerminal/);
});
