/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, Download, ShieldCheck, Laptop, Smartphone, Sparkles } from 'lucide-react';
import { ProjectTemplate } from '../../types/index.ts';

interface AppCardProps {
  app: ProjectTemplate;
  onSelect: (app: ProjectTemplate) => void;
  onQuickDownload: (app: ProjectTemplate, e: React.MouseEvent) => void;
}

export const AppCard: React.FC<AppCardProps> = ({ app, onSelect, onQuickDownload }) => {
  const latestRelease = app.releases[0];
  const winArtifact = latestRelease?.artifacts.find((a) => a.platform === 'windows');
  const sizeMb = winArtifact ? (winArtifact.sizeBytes / (1024 * 1024)).toFixed(1) : '15.4';

  const hasWin64 =
    app.platforms.some(
      (p) => p.platform === 'windows' && (p.selectedArch === 'x86_64' || p.formats.some((f) => f.architectures.includes('x86_64')))
    ) || latestRelease?.artifacts.some((a) => a.platform === 'windows' && a.arch === 'x86_64');

  const hasWin32 =
    app.platforms.some(
      (p) => p.platform === 'windows' && (p.selectedArch === 'x86' || p.formats.some((f) => f.architectures.includes('x86')))
    ) || latestRelease?.artifacts.some((a) => a.platform === 'windows' && a.arch === 'x86');

  const hasAndroid =
    app.platforms.some((p) => p.platform === 'android') ||
    latestRelease?.artifacts.some((a) => a.platform === 'android');

  const hasIos =
    app.platforms.some((p) => p.platform === 'ios') ||
    latestRelease?.artifacts.some((a) => a.platform === 'ios');

  return (
    <div
      onClick={() => onSelect(app)}
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer group shadow-xs hover:shadow-xl"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform shrink-0">
            {app.name.substring(0, 2).toUpperCase()}
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[11px] font-medium text-slate-400">{app.category}</span>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="tabular-nums">{app.storeMeta.rating}</span>
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-slate-100 text-base group-hover:text-blue-400 transition-colors line-clamp-1 mb-1">
          {app.name}
        </h3>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {app.tagline}
        </p>

        {/* Platform support badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {hasWin64 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-800/40 text-blue-300">
              Win 64-bit
            </span>
          )}
          {hasWin32 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/40 text-cyan-300">
              Win 32-bit
            </span>
          )}
          {hasAndroid && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/40 text-emerald-300">
              Android
            </span>
          )}
          {hasIos && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-800/40 text-purple-300">
              iOS
            </span>
          )}
        </div>

        {/* Clean metadata without pill capsules */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-4">
          <span>{app.currentVersion.startsWith('v') ? app.currentVersion : `v${app.currentVersion}`}</span>
          <span aria-hidden="true">·</span>
          <span>{sizeMb} MB</span>
          <span aria-hidden="true">·</span>
          <span>{app.storeMeta.downloadsCount} lượt tải</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Đã xác minh EV</span>
        </div>

        <button
          type="button"
          onClick={(e) => onQuickDownload(app, e)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/90 hover:bg-blue-600 text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Cài đặt</span>
        </button>
      </div>
    </div>
  );
};
