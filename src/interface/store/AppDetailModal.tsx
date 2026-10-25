/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Star, Download, ShieldCheck, Play, Laptop, Smartphone, Terminal, ExternalLink, Calendar, CheckCircle } from 'lucide-react';
import { ProjectTemplate, BuildArtifact } from '../../types/index.ts';
import { formatBytes, getPlatformVietnameseName, createExecutableInstallerScript } from '../../utils/packaging.ts';

interface AppDetailModalProps {
  app: ProjectTemplate;
  onClose: () => void;
  onOpenSandbox: () => void;
  onDownload?: (artifact?: BuildArtifact) => void;
}

export const AppDetailModal: React.FC<AppDetailModalProps> = ({
  app,
  onClose,
  onOpenSandbox,
  onDownload,
}) => {
  const latestRelease = app.releases[0];
  const artifacts = latestRelease?.artifacts || [];

  const handleDownloadArtifact = (art: BuildArtifact) => {
    if (onDownload) {
      onDownload(art);
      return;
    }
    const script = createExecutableInstallerScript(
      app.name,
      app.currentVersion,
      art.platform,
      art.format
    );
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = art.platform === 'windows' ? 'install.bat' : 'install.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0">
              {app.name.substring(0, 2).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-slate-100">{app.name}</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-300">
                  {app.currentVersion.startsWith('v') ? app.currentVersion : `v${app.currentVersion}`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">{app.publisher}</p>

              {/* Clean Metadata without pill capsules */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{app.storeMeta.rating}</span>
                  <span className="text-slate-500 font-normal">({app.storeMeta.reviewCount} đánh giá)</span>
                </div>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{app.storeMeta.downloadsCount} lượt tải</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đã xác minh Authenticode EV
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenSandbox}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Chạy thử ngay trên trình duyệt (WebAssembly)</span>
            </button>

            <span className="text-xs text-slate-400">hoặc tải gói cài đặt chính thức dưới đây:</span>
          </div>

          {/* Available Packages */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Tệp Cài đặt Đã Ký số (Official Installers)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {artifacts.map((art) => (
                <div
                  key={art.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-xs text-slate-200">
                        {getPlatformVietnameseName(art.platform)}
                      </span>
                      <span className="font-mono text-[10px] text-blue-400 px-1.5 py-0.5 rounded bg-blue-950/60">
                        {art.format}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 truncate mb-1">
                      {art.filename}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Dung lượng: {formatBytes(art.sizeBytes)} · {art.arch}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadArtifact(art)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Description & Overview */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Giới thiệu & Tính năng Nổi bật
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-3">
              {app.description}
            </p>
          </div>

          {/* System Requirements */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">Yêu cầu hệ thống tối thiểu:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Hệ điều hành:</span>
                <span className="text-slate-300 font-medium">{app.storeMeta.systemRequirements.minOs}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Bộ nhớ RAM:</span>
                <span className="text-slate-300 font-medium">{app.storeMeta.systemRequirements.recommendedRam}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Dung lượng trống:</span>
                <span className="text-slate-300 font-medium">{app.storeMeta.systemRequirements.diskSpace}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Bảo mật & Ký số:</span>
                <span className="text-slate-300 font-medium">Authenticode EV</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <span>ID Gói: {app.bundleIdentifier}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
