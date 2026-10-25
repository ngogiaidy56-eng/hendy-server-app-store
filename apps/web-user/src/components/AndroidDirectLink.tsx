import React from "react";

type Props = { href: string | null; fileName: string; available: boolean };

export function AndroidDirectLink({ href, fileName, available }: Props) {
  if (!available || !href) {
    return <span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-400">Android package chưa được phát hành</span>;
  }
  return <a href={safeLink(href)} download={fileName} rel="nofollow" className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700">Tải APK trực tiếp</a>;
}

function safeLink(href: string): string {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin && url.protocol !== "https:") return "#";
    return url.toString();
  } catch { return "#"; }
}
