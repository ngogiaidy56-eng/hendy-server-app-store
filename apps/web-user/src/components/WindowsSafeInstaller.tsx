import React from "react";

type Props = { href: string | null; fileName: string; sha256: string | null; available: boolean };

export function WindowsSafeInstaller({ href, fileName, sha256, available }: Props) {
  if (!available || !href) return <span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-400">Chưa có bộ cài Windows</span>;
  return <div className="flex shrink-0 flex-col items-start gap-1">
    <a href={safeLink(href)} download={fileName} rel="nofollow" className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700">Tải bộ cài Windows</a>
    <span className="max-w-52 break-all text-[9px] text-slate-400" title={sha256 || "Chưa có checksum"}>SHA-256: {sha256 ? sha256.slice(0, 12) + "…" : "Chưa được cung cấp"}</span>
  </div>;
}
function safeLink(href: string): string {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin && url.protocol !== "https:") return "#";
    return url.toString();
  } catch { return "#"; }
}
