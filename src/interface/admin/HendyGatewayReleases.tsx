/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, ShieldCheck, Laptop, Smartphone, Terminal, Copy, Check, FileCheck, ExternalLink } from 'lucide-react';
import { formatBytes } from '../../utils/packaging.ts';

export const HendyGatewayReleases: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const releases = [
    {
      id: 'gw-win',
      platform: 'Windows 10 / 11 (x64)',
      filename: 'HendyTools-v3.1.2-x64-Setup.exe',
      format: '.exe',
      version: '3.1.2-stable',
      size: '15.4 MB',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      cert: 'Authenticode EV (CN=Hendy Tools Corp, SHA256)',
      icon: Laptop,
      cmd: `irm https://download.hendy.vn/win | iex`,
    },
    {
      id: 'gw-android',
      platform: 'Android Mobile (ARM64)',
      filename: 'HendyTools-v3.1.2-release.apk',
      format: '.apk',
      version: '3.1.2-stable',
      size: '24.2 MB',
      sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      cert: 'Android V3 Signature Scheme Signed',
      icon: Smartphone,
      cmd: `curl -sSL https://download.hendy.vn/apk -o hendy.apk && adb install hendy.apk`,
    },
    {
      id: 'gw-ios',
      platform: 'iOS / iPadOS (Enterprise)',
      filename: 'HendyTools-v3.1.2-enterprise.ipa',
      format: '.ipa',
      version: '3.1.2-stable',
      size: '31.5 MB',
      sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      cert: 'Apple Enterprise Distribution Certificate',
      icon: Smartphone,
      cmd: `open itms-services://?action=download-manifest&url=https://download.hendy.vn/ios/manifest.plist`,
    },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">
              Cổng Tải về Hendy Tools Gateway (Windows / Android / iOS)
            </h3>
            <p className="text-xs text-slate-400">
              Kênh phân phối tệp nhị phân chính thức đã hợp nhất trong bảng điều khiển Server Plus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/40">
            <ShieldCheck className="w-3.5 h-3.5" />
            EV Signed & Notarized
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {releases.map((rel) => {
          const Icon = rel.icon;
          const isCopied = copiedKey === rel.id;
          return (
            <div
              key={rel.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-xs text-slate-200">{rel.platform}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300">
                    {rel.format}
                  </span>
                </div>

                <div className="font-mono text-xs text-slate-300 font-medium truncate mb-1">
                  {rel.filename}
                </div>

                <div className="text-[11px] text-slate-400 font-mono mb-2">
                  Dung lượng: {rel.size} · Bản: {rel.version}
                </div>

                <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 rounded p-1.5 font-mono mb-2">
                  {rel.cert}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded p-1.5 text-[10px] font-mono text-slate-400 break-all mb-2">
                  <span className="text-slate-500">SHA-256: </span>
                  {rel.sha256}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => handleCopy(rel.id, rel.cmd)}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                >
                  <span className="truncate max-w-[200px] text-[10px]">{rel.cmd}</span>
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
