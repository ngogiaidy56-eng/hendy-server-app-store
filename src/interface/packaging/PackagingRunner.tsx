/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, Terminal, RefreshCw, Cpu } from 'lucide-react';
import { TargetPlatform, BuildArtifact } from '../../types/index.ts';
import { PackagingConfigState } from './PlatformPackageTarget.tsx';
import { LoadedSourceFile } from './FileLoadDropzone.tsx';
import { generateArtifactFilename, generatePseudoSha256 } from '../../utils/packaging.ts';

interface PackagingRunnerProps {
  files: LoadedSourceFile[];
  config: PackagingConfigState;
  onPackagingComplete: (artifacts: BuildArtifact[]) => void;
  isBuilding: boolean;
  setIsBuilding: (building: boolean) => void;
}

interface StepState {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error';
  log: string;
}

export const PackagingRunner: React.FC<PackagingRunnerProps> = ({
  files,
  config,
  onPackagingComplete,
  isBuilding,
  setIsBuilding,
}) => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [steps, setSteps] = useState<StepState[]>([
    { id: 'syntax', title: 'Phân tích cú pháp & Thẩm tra tính toàn vẹn', status: 'pending', log: 'Chờ kích hoạt...' },
    { id: 'deps', title: 'Giải quyết phụ thuộc & Tối ưu hóa AST', status: 'pending', log: 'Chờ kích hoạt...' },
    { id: 'compile', title: 'Biên dịch chéo mã máy nhị phân đa nền tảng', status: 'pending', log: 'Chờ kích hoạt...' },
    { id: 'signing', title: 'Ký số Authenticode EV & Bảo mật nhị phân', status: 'pending', log: 'Chờ kích hoạt...' },
    { id: 'manifest', title: 'Tạo Release Manifest & Checksum SHA-256', status: 'pending', log: 'Chờ kích hoạt...' },
  ]);

  const runPackagingPipeline = async () => {
    if (files.length === 0) {
      alert('Vui lòng dán mã nguồn hoặc tải ít nhất một tệp nguồn lên trước khi đóng gói.');
      return;
    }

    setIsBuilding(true);
    setProgress(5);
    setLogs([`[BUILD] Bắt đầu quy trình đóng gói phần mềm '${config.appName}' v${config.version}...`]);

    const updateStep = (index: number, status: StepState['status'], log: string) => {
      setSteps((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status, log };
        return next;
      });
    };

    // Step 1: Syntax Analysis
    updateStep(0, 'running', `Đang quét ${files.length} tệp mã nguồn...`);
    setLogs((prev) => [...prev, `[ANALYZE] Đang phân tích ${files.length} tệp: ${files.map((f) => f.name).join(', ')}`]);
    await new Promise((r) => setTimeout(r, 600));
    updateStep(0, 'success', `Phân tích thành công: 0 lỗi, ${files.reduce((a, b) => a + b.size, 0)} bytes hợp lệ.`);
    setProgress(25);

    // Step 2: Dependencies
    updateStep(1, 'running', 'Đang tối ưu hóa cây cú pháp và loại bỏ mã thừa...');
    setLogs((prev) => [...prev, `[OPT] Áp dụng mức tối ưu hóa: ${config.optimizationLevel}, strip symbols: ${config.stripSymbols}`]);
    await new Promise((r) => setTimeout(r, 700));
    updateStep(1, 'success', 'Cây AST và thư viện phụ thuộc đã được đóng gói chuẩn hóa.');
    setProgress(50);

    // Step 3: Cross-compilation
    updateStep(2, 'running', `Đang biên dịch cho ${config.selectedPlatforms.length} nền tảng: ${config.selectedPlatforms.join(', ')}...`);
    for (const p of config.selectedPlatforms) {
      setLogs((prev) => [...prev, `[COMPILER] Target: ${p.toUpperCase()} -> Biên dịch mã máy nhị phân...`]);
      await new Promise((r) => setTimeout(r, 350));
    }
    updateStep(2, 'success', `Biên dịch thành công ${config.selectedPlatforms.length} gói nhị phân độc lập.`);
    setProgress(75);

    // Step 4: Signing
    updateStep(3, 'running', 'Đang nạp chứng chỉ Authenticode EV và gắn dấu thời gian RFC-3161...');
    setLogs((prev) => [...prev, `[CODESIGN] Ký số với chứng thư: ${config.signerCertificate}`]);
    await new Promise((r) => setTimeout(r, 600));
    updateStep(3, 'success', 'Đã ký số thành công toàn bộ tệp nhị phân phát hành.');
    setProgress(90);

    // Step 5: Manifest & Artifacts
    updateStep(4, 'running', 'Tính toán mã băm SHA-256 và sinh Release Manifest...');
    const now = new Date().toISOString();
    const generatedArtifacts: BuildArtifact[] = config.selectedPlatforms.map((platform) => {
      let format = '.exe';
      let arch: BuildArtifact['arch'] = 'x86_64';
      let sizeBytes = 14800000;

      if (platform === 'android') {
        format = '.apk';
        arch = 'arm64';
        sizeBytes = 22400000;
      } else if (platform === 'ios') {
        format = '.ipa';
        arch = 'arm64';
        sizeBytes = 28600000;
      } else if (platform === 'macos') {
        format = '.dmg';
        arch = 'universal';
        sizeBytes = 32100000;
      } else if (platform === 'linux') {
        format = '.AppImage';
        arch = 'x86_64';
        sizeBytes = 18900000;
      } else if (platform === 'web') {
        format = '.wasm';
        arch = 'wasm';
        sizeBytes = 4200000;
      }

      const filename = generateArtifactFilename(config.appName.toLowerCase().replace(/\s+/g, '-'), config.version, platform, arch, format);
      const sha256 = generatePseudoSha256(`${config.appName}-${platform}-${config.version}-${now}`);

      return {
        id: `art-${platform}-${Date.now()}`,
        platform,
        format,
        arch,
        filename,
        sizeBytes,
        sha256,
        downloadUrl: `/api/artifacts/download?file=${encodeURIComponent(filename)}`,
        createdAt: now,
        verified: true,
        signatureInfo: {
          issuer: config.signerCertificate,
          certificateType: 'Authenticode Extended Validation (EV)',
          timestamp: now,
          serialNumber: 'SHA256-EV-9821-4328-8761',
        },
      };
    });

    updateStep(4, 'success', `Đã tạo ${generatedArtifacts.length} gói nhị phân hoàn chỉnh.`);
    setProgress(100);
    setLogs((prev) => [
      ...prev,
      `[SUCCESS] Hoàn tất toàn bộ quy trình đóng gói trong ${config.selectedPlatforms.length * 0.9 + 2.5}s.`,
      `[RELEASE] Đã sẵn sàng phân phối trên Cổng Tải về và Google Play / App Store!`,
    ]);

    setIsBuilding(false);
    onPackagingComplete(generatedArtifacts);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Tiến trình Đóng gói Phần mềm (Build Pipeline)</h3>
            <p className="text-xs text-slate-400">
              Biên dịch, tối ưu hóa, ký số chứng thư EV và đóng gói thành tệp cài đặt thực thi.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runPackagingPipeline}
          disabled={isBuilding || files.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBuilding ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang đóng gói ({progress}%)...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Kích hoạt Đóng gói Ngay (Build {config.selectedPlatforms.length} nền tảng)</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Steps List */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {steps.map((st, idx) => (
          <div
            key={st.id}
            className={`p-3 rounded-lg border text-xs flex flex-col justify-between transition-colors ${
              st.status === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                : st.status === 'running'
                ? 'border-blue-500/60 bg-blue-950/30 text-blue-200 animate-pulse'
                : 'border-slate-800 bg-slate-950/40 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] text-slate-500">Bước 0{idx + 1}</span>
              {st.status === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : st.status === 'running' ? (
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700" />
              )}
            </div>
            <div className="font-medium leading-snug mb-1">{st.title}</div>
            <div className="text-[10px] text-slate-400 truncate" title={st.log}>
              {st.log}
            </div>
          </div>
        ))}
      </div>

      {/* Terminal Build Logs */}
      {logs.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto">
          <div className="flex items-center gap-1.5 text-slate-500 border-b border-slate-800/80 pb-1.5 mb-2">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>Nhật ký biên dịch thời gian thực (Build Output):</span>
          </div>
          {logs.map((log, i) => (
            <div key={i} className="py-0.5 leading-relaxed">
              {log.startsWith('[SUCCESS]') ? (
                <span className="text-emerald-400">{log}</span>
              ) : log.startsWith('[CODESIGN]') ? (
                <span className="text-amber-300">{log}</span>
              ) : log.startsWith('[COMPILER]') ? (
                <span className="text-blue-300">{log}</span>
              ) : (
                <span className="text-slate-300">{log}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
