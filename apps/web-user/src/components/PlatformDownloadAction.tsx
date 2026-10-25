import React from "react";
import { AndroidDirectLink } from "./AndroidDirectLink.tsx";
import { IOSOtaDownloader } from "./IOSOtaDownloader.tsx";
import { WindowsSafeInstaller } from "./WindowsSafeInstaller.tsx";

type Props = {
  platform: string;
  href: string | null;
  fileName: string;
  sha256: string | null;
  available: boolean;
  manifestUrl?: string | null;
};

export function PlatformDownloadAction(props: Props) {
  switch (props.platform.toLowerCase()) {
    case "android":
      return <AndroidDirectLink href={props.href} fileName={props.fileName} available={props.available} />;
    case "ios":
      return <IOSOtaDownloader href={props.href} manifestUrl={props.manifestUrl} fileName={props.fileName} available={props.available} />;
    case "windows":
      return <WindowsSafeInstaller href={props.href} fileName={props.fileName} sha256={props.sha256} available={props.available} />;
    default:
      return props.available && props.href
        ? <a href={safeLink(props.href)} download={props.fileName} rel="nofollow" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700">Tải xuống</a>
        : <span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-400">Chưa có tệp</span>;
  }
}
function safeLink(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin || url.protocol === "https:" ? url.toString() : "#";
  } catch { return "#"; }
}
