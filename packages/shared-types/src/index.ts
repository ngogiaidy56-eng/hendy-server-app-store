export type ReleasePlatform = "web" | "windows" | "android" | "ios" | "macos" | "linux";
export type ReleaseStatus = "draft" | "published" | "withdrawn";
export type SyncStatus = "started" | "success" | "failed" | "warning";

export interface PublishedRelease {
  id: string;
  appSlug: string;
  appName: string;
  version: string;
  platform: ReleasePlatform;
  fileName: string;
  r2Key: string;
  sizeBytes: number;
  sha256: string;
  releaseNotes: string;
  status: ReleaseStatus;
  publishedAt: string;
}
export interface SyncLog {
  id: string;
  status: SyncStatus;
  message: string;
  actorEmail: string;
  createdAt: string;
}
export interface AdminIdentity {
  email: string;
  authenticated: true;
}
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
export interface StorefrontSettings {
  brandName: string;
  announcement: string;
  heroEyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  supportUrl: string;
  repositoryUrl: string;
}
export interface RuntimeBindingStatus {
  d1: boolean;
  r2: boolean;
  kv: boolean;
  access: boolean;
  publisher: boolean;
  certificateEncryption: boolean;
}
