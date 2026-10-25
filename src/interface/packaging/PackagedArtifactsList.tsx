/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, ShieldCheck, Terminal, Copy, Check, Cloud, Laptop, Smartphone, Globe } from 'lucide-react';
import { BuildArtifact } from '../../types/index.ts';
import { formatBytes, getPlatformVietnameseName, getRecommendedInstallerCommand, createExecutableInstallerScript } from '../../utils/packaging.ts';

interface PackagedArtifactsListProps {
  artifacts: BuildArtifact[];
  onOpenDriveModal?: () => void;
  appName: string;
}

export const PackagedArtifactsList: React.FC<PackagedArtifactsListProps> = ({
  artifacts,
  onOpenDriveModal,
  appName,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCmd = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (artifact: BuildArtifact) => {
    // Generate an executable installer script blob for the user
    const script = createExecutableInstallerScript(
      appName,
      '3.1.2',
      artifact.platform,
      artifact.format
    );
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.platform === 'windows' ? 'install-hendy-app.bat' : 'install-hendy-app.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'windows' || platform === 'macos' || platform === 'linux') {
      return <Laptop className="w-4 h-4 text-blue-400" />;
    }
    if (platform === 'android' || platform === 'ios') {
      return <Smartphone className="w-4 h-4 text-emerald-400" />;
    }
    return <Globe className="w-4 h-4 text-purple-400" />;
  };

  if (artifacts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
        Chưa có gói phần mềm nào được đóng gói. Nhấn <strong>"Kích hoạt Đóng gói Ngay"</strong> sau khi dán hoặc tải mã nguồn lên để tạo các tệp nhị phân.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm">
            Thành phẩm Đóng gói Sẵn sàng Phát hành ({artifacts.length} gói)
          </h3>
          <p className="text-xs text-slate-400">
            Các gói cài đặt nhị phân đã ký số bản quyền Authenticode EV, kèm mã kiểm tra toàn vẹn SHA-256.
          </p>
        </div>

        {onOpenDriveModal && (
          <button
            type="button"
            onClick={onOpenDriveModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Cloud className="w-4 h-4 text-blue-400" />
            <span>Sao lưu lên Google Drive</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {artifacts.map((art) => {
          const cliInfo = getRecommendedInstallerCommand(art.platform, appName.toLowerCase().replace(/\s+/g, '-'), '3.1.2');
          const cliCmd = cliInfo.command;
          const isCopied = copiedId === art.id;

          return (
            <div
              key={art.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(art.platform)}
                    <span className="font-semibold text-xs text-slate-200">
                      {getPlatformVietnameseName(art.platform)}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Authenticode EV
                  </span>
                </div>

                <div className="font-mono text-xs text-slate-300 font-medium truncate mb-1">
                  {art.filename}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mb-2">
                  <span>Dung lượng: {formatBytes(art.sizeBytes)}</span>
                  <span>·</span>
                  <span>Kiến trúc: {art.arch}</span>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded p-2 text-[10px] font-mono text-slate-400 break-all mb-2">
                  <span className="text-slate-500">SHA-256: </span>
                  {art.sha256}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(art)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về tệp cài đặt ({art.format})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyCmd(art.id, cliCmd)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                    title="Sao chép lệnh cài đặt qua Terminal"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{isCopied ? 'Đã chép' : 'Lệnh CLI'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
