export type Platform = 'windows' | 'android' | 'ios';
export type Channel = 'stable' | 'beta';

export interface Artifact {
  key: string;
  fileName: string;
  sha256: string;
  size: number;
  contentType: string;
  signerThumbprint?: string;
  architecture?: 'x64' | 'arm64' | 'universal';
}

export interface ReleaseManifest {
  schemaVersion: number;
  appId: string;
  platform: Platform;
  channel: Channel;
  version: string;
  build: number;
  publishedAt: string;
  mandatory: boolean;
  minSupportedVersion: string;
  releaseNotes: string[];
  storeUrl?: string | null;
  artifact?: Artifact | null;
  downloadUrl?: string | null;
}

export interface UpdateCheckResult {
  appId: string;
  platform: Platform;
  channel: Channel;
  version: string;
  build: number;
  publishedAt: string;
  updateAvailable: boolean;
  mandatory: boolean;
  minSupportedVersion: string;
  releaseNotes: string[];
  storeUrl: string | null;
  artifact: {
    fileName: string;
    sha256: string;
    size: number;
    contentType: string;
    signerThumbprint: string | null;
  } | null;
  downloadUrl: string | null;
}

export interface SystemService {
  id: string;
  name: string;
  displayName: string;
  category: 'core' | 'web' | 'storage' | 'security';
  port: number | null;
  status: 'running' | 'stopped' | 'restarting';
  uptime: string;
  cpu: number;
  memory: string;
  description: string;
}

export interface ProcessMetric {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memoryMb: number;
  status: 'running' | 'sleeping' | 'idle';
  command: string;
}

export interface NetworkPort {
  port: number;
  protocol: 'TCP' | 'UDP';
  service: string;
  binding: string;
  state: 'LISTEN' | 'ESTABLISHED';
  policy: 'ALLOWED' | 'PROTECTED' | 'INTERNAL';
}

export interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  status: 'success' | 'error' | 'running';
}

export type PlatformProvider = 'cloudflare-pages' | 'cloudflare-workers' | 'render' | 'github-pages' | 'custom';
export type TargetInterface = 'admin' | 'portal' | 'api-gateway';

export interface DomainMapping {
  id: string;
  domain: string;
  provider: PlatformProvider;
  targetInterface: TargetInterface;
  isPrimary: boolean;
  sslStatus: 'active' | 'provisioning' | 'pending-dns';
  defaultTab?: string;
  notes?: string;
  createdAt: string;
}

export interface SoftwareComponent {
  id: string;
  name: string;
  category: 'networking' | 'security' | 'automation' | 'analytics' | 'storage';
  version: string;
  status: 'active' | 'disabled';
  description: string;
  author: string;
  icon: string;
  lastRun?: string;
  metrics?: { label: string; value: string }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  status: 'success' | 'warn' | 'error';
  ipAddress: string;
  details?: string;
}

export interface EdgeTrafficMetric {
  location: string;
  code: string;
  requests24h: number;
  bandwidthMb: number;
  cacheHitRatio: number;
  avgLatencyMs: number;
}

