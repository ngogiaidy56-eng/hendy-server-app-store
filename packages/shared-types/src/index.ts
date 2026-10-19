export type AppPlatform = "windows" | "android" | "ios";
export type ReleaseChannel = "stable" | "beta" | "preview";
export type ReleaseStatus = "draft" | "published" | "archived";
export interface AppRelease {
  id: string;
  name: string;
  version: string;
  build: number;
  platform: AppPlatform;
  channel: ReleaseChannel;
  status: ReleaseStatus;
  downloadUrl: string | null;
  sha256: string | null;
  fileSize: number;
  releaseNotes: string;
  mandatory: boolean;
}
export interface StudioAsset {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sourceUrl?: string;
}
export interface TimelineClip {
  id: string;
  assetId: string;
  track: "video" | "audio" | "subtitle";
  start: number;
  duration: number;
  subtitle?: string;
}
