/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, Shield, Laptop, Smartphone, Terminal, Globe } from 'lucide-react';
import { TargetPlatform } from '../../types/index.ts';

export interface PackagingConfigState {
  appName: string;
  packageId: string;
  version: string;
  buildNumber: number;
  publisher: string;
  selectedPlatforms: TargetPlatform[];
  codeSigning: boolean;
  signerCertificate: string;
  optimizationLevel: 'speed' | 'size' | 'default';
  stripSymbols: boolean;
}

interface PlatformPackageTargetProps {
  config: PackagingConfigState;
  onChangeConfig: (newConfig: Partial<PackagingConfigState>) => void;
}

const PLATFORM_ITEMS: { id: TargetPlatform; label: string; icon: React.FC<{ className?: string }>; ext: string; desc: string }[] = [
  {
    id: 'windows',
    label: 'Windows 10 / 11',
    icon: Laptop,
    ext: '.exe (Authenticode EV)',
    desc: 'Trình cài đặt PE32+ mã nhị phân gốc kèm ký số bản quyền',
  },
  {
    id: 'android',
    label: 'Android (APK)',
    icon: Smartphone,
    ext: '.apk (Signed v2/v3)',
    desc: 'Gói cài đặt di động độc lập tương thích Android 10-15',
  },
  {
    id: 'ios',
    label: 'iOS (IPA)',
    icon: Smartphone,
    ext: '.ipa (Enterprise)',
    desc: 'Bộ cài đặt ứng dụng cho iPhone & iPad qua hồ sơ doanh nghiệp',
  },
  {
    id: 'macos',
    label: 'macOS (Universal)',
    icon: Laptop,
    ext: '.dmg (Apple Notarized)',
    desc: 'Universal binary cho Intel x86_64 & Apple Silicon ARM64',
  },
  {
    id: 'linux',
    label: 'Linux (Portable)',
    icon: Terminal,
    ext: '.AppImage',
    desc: 'Chạy trực tiếp không cần cài đặt trên Ubuntu, Fedora, Debian',
  },
  {
    id: 'web',
    label: 'WebAssembly (WASM)',
    icon: Globe,
    ext: '.wasm + Web Client',
    desc: 'Lõi nhị phân thực thi ngay trên trình duyệt với hiệu năng gốc',
  },
];

export const PlatformPackageTarget: React.FC<PlatformPackageTargetProps> = ({
  config,
  onChangeConfig,
}) => {
  const togglePlatform = (platform: TargetPlatform) => {
    const current = config.selectedPlatforms;
    if (current.includes(platform)) {
      if (current.length > 1) {
        onChangeConfig({ selectedPlatforms: current.filter((p) => p !== platform) });
      }
    } else {
      onChangeConfig({ selectedPlatforms: [...current, platform] });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5">
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <Layers className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="font-semibold text-slate-100 text-sm">Cấu hình Đích & Siêu dữ liệu Đóng gói (Package Targets)</h3>
          <p className="text-xs text-slate-400">
            Chọn các nền tảng hệ điều hành cần biên dịch chéo và thiết lập định danh gói phần mềm.
          </p>
        </div>
      </div>

      {/* Target Platforms Grid */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">
          Chọn nền tảng đóng gói mục tiêu (chọn một hoặc nhiều):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLATFORM_ITEMS.map((item) => {
            const isSelected = config.selectedPlatforms.includes(item.id);
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => togglePlatform(item.id)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all select-none ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/20 shadow-md ring-1 ring-blue-500/40'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span className="font-medium text-xs text-slate-200">{item.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-blue-900/60 text-blue-200' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.ext}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metadata Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Tên ứng dụng:</label>
          <input
            type="text"
            value={config.appName}
            onChange={(e) => onChangeConfig({ appName: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/60"
            placeholder="Hendy Tools Pro"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Định danh gói (Package ID):</label>
          <input
            type="text"
            value={config.packageId}
            onChange={(e) => onChangeConfig({ packageId: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/60 font-mono"
            placeholder="com.hendy.serverplus"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Phiên bản (SemVer):</label>
          <input
            type="text"
            value={config.version}
            onChange={(e) => onChangeConfig({ version: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/60 font-mono"
            placeholder="3.1.2"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Nhà phát hành (Publisher):</label>
          <input
            type="text"
            value={config.publisher}
            onChange={(e) => onChangeConfig({ publisher: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/60"
            placeholder="Hendy Tools Corporation"
          />
        </div>
      </div>

      {/* Security & Signing Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300">
            Ký số điện tử:{' '}
            <strong className="text-emerald-400">Authenticode EV + Apple Notarization CA</strong>
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={config.stripSymbols}
              onChange={(e) => onChangeConfig({ stripSymbols: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
            />
            <span>Loại bỏ symbol gỡ lỗi (Strip Symbols)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={config.codeSigning}
              onChange={(e) => onChangeConfig({ codeSigning: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
            />
            <span>Bật ký số bản quyền</span>
          </label>
        </div>
      </div>
    </div>
  );
};
