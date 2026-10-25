import { useEffect, useState } from "react";

export type DevicePlatform = "ios" | "android" | "windows" | "macos" | "linux" | "unknown";

function detectPlatform(): DevicePlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (platform.includes("mac") && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/win/.test(platform) || /windows/.test(ua)) return "windows";
  if (/mac/.test(platform) || /macintosh/.test(ua)) return "macos";
  if (/linux/.test(platform) || /linux/.test(ua)) return "linux";
  return "unknown";
}

export function useDeviceDetect(): { platform: DevicePlatform; isMobile: boolean } {
  const [platform, setPlatform] = useState<DevicePlatform>("unknown");
  useEffect(() => setPlatform(detectPlatform()), []);
  return { platform, isMobile: platform === "ios" || platform === "android" };
}
