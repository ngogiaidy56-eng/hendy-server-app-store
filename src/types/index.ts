/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TargetPlatform = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web';

export type ArchType = 'x86_64' | 'arm64' | 'universal' | 'wasm' | 'any';

export type ReleaseChannel = 'stable' | 'beta' | 'nightly';

export interface SourceFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  isEntry?: boolean;
  encrypted?: boolean;
  securityHash?: string;
}

export interface PackagingOption {
  format: string; // .exe, .msi, .dmg, .pkg, .AppImage, .deb, .apk, .wasm
  name: string;
  description: string;
  defaultSelected: boolean;
  architectures: ArchType[];
}

export interface PlatformConfig {
  platform: TargetPlatform;
  displayName: string;
  iconName: string;
  formats: PackagingOption[];
  enabled: boolean;
  selectedArch: ArchType;
  selectedFormat: string;
  signingEnabled: boolean;
  entitlements?: string[];
  installerCustomization?: {
    licenseAcceptedPrompt: boolean;
    customInstallDir?: string;
    desktopShortcut: boolean;
    startMenuShortcut: boolean;
  };
}

export interface BuildArtifact {
  id: string;
  platform: TargetPlatform;
  format: string;
  arch: ArchType;
  filename: string;
  sizeBytes: number;
  sha256: string;
  downloadUrl: string;
  createdAt: string;
  verified: boolean;
  signatureInfo?: {
    issuer: string;
    certificateType: string;
    timestamp: string;
    serialNumber: string;
  };
}

export interface ReleaseVersion {
  version: string;
  tag: string;
  releaseDate: string;
  channel: ReleaseChannel;
  title: string;
  changelog: string[];
  artifacts: BuildArtifact[];
  published: boolean;
}

export interface AppStoreReview {
  id: string;
  author: string;
  rating: number; // 1-5
  date: string;
  comment: string;
  platform: string;
  verifiedInstall: boolean;
}

export interface AppStoreMetadata {
  rating: number; // 4.9
  reviewCount: number; // 1420
  downloadsCount: string; // "100K+"
  badge: 'EditorChoice' | 'TopFree' | 'VerifiedPro' | 'Trending';
  badgeLabel: string;
  ageRating: string; // "3+"
  categoryLabel: string;
  screenshots: {
    id: string;
    caption: string;
    mode: 'desktop' | 'mobile' | 'canvas';
  }[];
  dataSafety: {
    collectedData: string;
    securityPractice: string;
    encryptionStandard: string;
  };
  systemRequirements: {
    minOs: string;
    recommendedRam: string;
    diskSpace: string;
    gpuReq: string;
  };
  reviews: AppStoreReview[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  framework: 'Rust + Tauri' | 'C++ / Wasm' | 'Go / Wails' | 'Electron' | 'Flutter' | 'React Native';
  currentVersion: string;
  bundleIdentifier: string;
  publisher: string;
  websiteUrl: string;
  githubRepo: string;
  files: SourceFile[];
  platforms: PlatformConfig[];
  releases: ReleaseVersion[];
  securityLevel?: 'Enterprise High' | 'Military Grade' | 'Commercial Standard';
  storeMeta: AppStoreMetadata;
}

export interface DomainRouteSetting {
  id: string;
  subdomain: string;
  domain: string;
  targetView: 'studio' | 'downloads';
  purpose: string;
  dnsType: 'CNAME' | 'A';
  dnsTarget: string;
  status: 'active' | 'pending' | 'provisioning';
  sslStatus: 'active' | 'provisioning';
  accessControl: 'Internal Token Auth' | 'Public Edge CDN';
  apiManaged: boolean;
}

export interface CloudflareWorkersPagesConfig {
  accountName: string;
  projectName: string;
  pagesBranch: string;
  pagesDomain: string;
  workersRoute: string;
  r2Bucket: string;
  kvNamespace: string;
  githubRepoUrl: string;
  routes: DomainRouteSetting[];
  apiEndpoint: string;
  apiKeyProtected: boolean;
}

export interface SecurityAuditReport {
  sourceCodeExposureRisk: string;
  sourceEncryption: string;
  interfaceIsolation: string;
  binaryStripping: string;
  apiGatewayProtection: string;
  distributionStorage: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  durationMs: number;
  logs: string[];
}

export interface SecurityScanFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  file: string;
  line: number;
  description: string;
  remediation: string;
}

export interface AuthorizedIpRule {
  id: string;
  ip: string;
  label: string;
  role: 'super-admin' | 'ops-engineer' | 'ci-runner' | 'cloud-internal';
  status: 'active' | 'suspended';
  addedAt: string;
  lastAccessAt?: string;
}

export interface DomainSecurityPolicy {
  domain: string;
  targetInterface: 'store' | 'admin-plus';
  ipRestrictionEnabled: boolean;
  allowedIps: string[];
  sslStatus: 'active' | 'provisioning' | 'strict-hsts';
  edgeProtection: 'Cloudflare WAF' | 'Standard CDN';
}
