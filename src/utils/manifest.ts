/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { TargetPlatform, ArchType } from '../types/index.ts';

export interface ManifestArtifactEntry {
  id: string;
  filename: string;
  version: string;
  platform: TargetPlatform;
  format: string; // .exe, .msi, .dmg, .AppImage, .apk, etc.
  arch: ArchType;
  sizeBytes: number;
  url: string; // Actual downloadable URL: /api/v1/downloads/artifacts/<filename>
  sha256: string; // Exact SHA-256 hash calculated from file bytes
  uploadedAt: string;
  contentType: string;
  verified: boolean;
}

export interface AppReleaseManifest {
  schemaVersion: '1.0.0';
  generatedAt: string;
  repository: string;
  app: {
    id: string;
    name: string;
    slug: string;
    latestVersion: string;
    publisher: string;
  };
  artifacts: ManifestArtifactEntry[];
}

export interface GlobalRepositoryManifest {
  schemaVersion: '1.0.0';
  generatedAt: string;
  repositoryId: string;
  repositoryName: string;
  totalArtifacts: number;
  totalSizeBytes: number;
  apps: Record<string, AppReleaseManifest>;
}

/**
 * Calculates SHA-256 hash from a Node.js Buffer
 */
export function calculateBufferSha256(buffer: Buffer | Uint8Array): string {
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

/**
 * Maps file extension to standard MIME Content-Type
 */
export function getContentTypeForArtifact(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'exe':
      return 'application/vnd.microsoft.portable-executable';
    case 'msi':
      return 'application/x-msi';
    case 'dmg':
      return 'application/x-apple-diskimage';
    case 'pkg':
      return 'application/x-newton-compatible-pkg';
    case 'appimage':
      return 'application/x-iso9660-image';
    case 'deb':
      return 'application/vnd.debian.binary-package';
    case 'apk':
      return 'application/vnd.android.package-archive';
    case 'ipa':
      return 'application/octet-stream';
    case 'wasm':
      return 'application/wasm';
    case 'zip':
      return 'application/zip';
    case 'tar':
    case 'gz':
      return 'application/gzip';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Detects target platform from filename or user input
 */
export function inferPlatformFromFilename(filename: string): TargetPlatform {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.exe') || lower.endsWith('.msi') || lower.includes('win')) return 'windows';
  if (lower.endsWith('.dmg') || lower.endsWith('.pkg') || lower.includes('mac') || lower.includes('darwin')) return 'macos';
  if (lower.endsWith('.appimage') || lower.endsWith('.deb') || lower.includes('linux')) return 'linux';
  if (lower.endsWith('.apk') || lower.includes('android')) return 'android';
  if (lower.endsWith('.ipa') || lower.includes('ios')) return 'ios';
  if (lower.endsWith('.wasm')) return 'web';
  return 'linux';
}

/**
 * Generates a valid Manifest Artifact Entry
 */
export function createManifestArtifactEntry(params: {
  filename: string;
  version: string;
  platform: TargetPlatform;
  format: string;
  arch?: ArchType;
  sizeBytes: number;
  sha256: string;
  baseUrl?: string;
}): ManifestArtifactEntry {
  const baseUrl = params.baseUrl || '';
  const cleanFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const url = `${baseUrl}/api/v1/downloads/artifacts/${cleanFilename}`;
  
  return {
    id: `art-${cleanFilename}-${Date.now()}`,
    filename: cleanFilename,
    version: params.version,
    platform: params.platform,
    format: params.format.startsWith('.') ? params.format : `.${params.format}`,
    arch: params.arch || 'x86_64',
    sizeBytes: params.sizeBytes,
    url,
    sha256: params.sha256.toLowerCase(),
    uploadedAt: new Date().toISOString(),
    contentType: getContentTypeForArtifact(cleanFilename),
    verified: true
  };
}

/**
 * Builds a complete application release manifest
 */
export function buildAppManifest(
  app: { id: string; name: string; slug: string; latestVersion: string; publisher: string },
  artifacts: ManifestArtifactEntry[]
): AppReleaseManifest {
  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    repository: 'ForgeOS Commercial Release Store (Dedicated Cloudflare R2)',
    app,
    artifacts
  };
}

/**
 * Validates manifest entry structure
 */
export function isValidManifestEntry(entry: any): entry is ManifestArtifactEntry {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.filename === 'string' &&
    typeof entry.version === 'string' &&
    typeof entry.platform === 'string' &&
    typeof entry.sizeBytes === 'number' &&
    entry.sizeBytes >= 0 &&
    typeof entry.url === 'string' &&
    entry.url.includes('/api/v1/downloads/artifacts/') &&
    typeof entry.sha256 === 'string' &&
    /^[a-f0-9]{64}$/i.test(entry.sha256)
  );
}
