import React from "react";

type Props = { href: string | null; manifestUrl?: string | null; fileName: string; available: boolean };

export function IOSOtaDownloader({ href, manifestUrl, fileName, available }: Props) {
  if (!available || !href) return <span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-400">Chưa có gói iOS</span>;
  const safeManifest = manifestUrl ? secureHttps(manifestUrl) : null;
  if (safeManifest) {
    const installUrl = "itms-services://?action=download-manifest&url=" + encodeURIComponent(safeManifest);
    return <a href={installUrl} className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white">Cài qua OTA</a>;
  }
  return <div className="flex shrink-0 flex-col gap-1">
    <a href={secureHref(href)} download={fileName} rel="nofollow" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white">Tải tệp IPA</a>
    <span className="max-w-52 text-[9px] leading-4 text-amber-700">Tải IPA không tự cài đặt. OTA cần manifest.plist HTTPS và ứng dụng được ký hợp lệ.</span>
  </div>;
}
function secureHttps(value: string): string | null {
  try { const url = new URL(value, window.location.origin); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}
function secureHref(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin || url.protocol === "https:" ? url.toString() : "#";
  } catch { return "#"; }
}
