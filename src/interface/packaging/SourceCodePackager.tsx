/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Package, Code2, Upload, Settings2, Play, Sparkles } from 'lucide-react';
import { CodePasteInput } from './CodePasteInput.tsx';
import { FileLoadDropzone, LoadedSourceFile } from './FileLoadDropzone.tsx';
import { PlatformPackageTarget, PackagingConfigState } from './PlatformPackageTarget.tsx';
import { PackagingRunner } from './PackagingRunner.tsx';
import { PackagedArtifactsList } from './PackagedArtifactsList.tsx';
import { BuildArtifact } from '../../types/index.ts';

interface SourceCodePackagerProps {
  onOpenDriveModal?: () => void;
}

export const SourceCodePackager: React.FC<SourceCodePackagerProps> = ({ onOpenDriveModal }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'load' | 'config' | 'artifacts'>('paste');

  const [files, setFiles] = useState<LoadedSourceFile[]>([
    {
      name: 'main.rs',
      size: 482,
      language: 'rust',
      content: `// Hendy Tools High-Performance Native Core\nfn main() {\n    println!("Khởi chạy lõi Hendy Server Plus Native");\n}`,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      name: 'Cargo.toml',
      size: 320,
      language: 'json',
      content: `[package]\nname = "hendy-core"\nversion = "3.1.2"\nedition = "2021"`,
      sha256: '7d56686a9f45ba6d0b57fa4c3f5080c984ca3b567b45db59c16fc01d16a5b28e',
    },
  ]);

  const [config, setConfig] = useState<PackagingConfigState>({
    appName: 'Hendy Tools Pro',
    packageId: 'com.hendy.serverplus',
    version: '3.1.2',
    buildNumber: 142,
    publisher: 'Hendy Tools Corporation',
    selectedPlatforms: ['windows', 'android', 'ios'],
    codeSigning: true,
    signerCertificate: 'Hendy Tools Authenticode Extended Validation CA',
    optimizationLevel: 'speed',
    stripSymbols: true,
  });

  const [artifacts, setArtifacts] = useState<BuildArtifact[]>([
    {
      id: 'art-win-init',
      platform: 'windows',
      format: '.exe',
      arch: 'x86_64',
      filename: 'HendyTools-v3.1.2-x64-Setup.exe',
      sizeBytes: 15480000,
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      downloadUrl: '/api/artifacts/download?file=HendyTools-v3.1.2-x64-Setup.exe',
      createdAt: new Date().toISOString(),
      verified: true,
      signatureInfo: {
        issuer: 'Hendy Tools Authenticode Extended Validation CA',
        certificateType: 'Authenticode Extended Validation (EV)',
        timestamp: new Date().toISOString(),
        serialNumber: 'SHA256-EV-9821-4328-8761',
      },
    },
    {
      id: 'art-android-init',
      platform: 'android',
      format: '.apk',
      arch: 'arm64',
      filename: 'HendyTools-v3.1.2-release.apk',
      sizeBytes: 24200000,
      sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      downloadUrl: '/api/artifacts/download?file=HendyTools-v3.1.2-release.apk',
      createdAt: new Date().toISOString(),
      verified: true,
    },
    {
      id: 'art-ios-init',
      platform: 'ios',
      format: '.ipa',
      arch: 'arm64',
      filename: 'HendyTools-v3.1.2-enterprise.ipa',
      sizeBytes: 31500000,
      sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      downloadUrl: '/api/artifacts/download?file=HendyTools-v3.1.2-enterprise.ipa',
      createdAt: new Date().toISOString(),
      verified: true,
    },
  ]);

  const [isBuilding, setIsBuilding] = useState(false);

  const handleAddOrUpdateFile = (file: { name: string; language: string; content: string }) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.name === file.name);
      const newFile: LoadedSourceFile = {
        name: file.name,
        size: file.content.length,
        language: file.language,
        content: file.content,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newFile;
        return next;
      }
      return [...prev, newFile];
    });
  };

  const handleFilesLoaded = (newFiles: LoadedSourceFile[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setFiles([]);
  };

  const handlePackagingComplete = (newArtifacts: BuildArtifact[]) => {
    setArtifacts((prev) => [...newArtifacts, ...prev]);
    setActiveTab('artifacts');
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Studio Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-950/40 to-slate-900 border border-blue-800/40 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400">
              <Package className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              Xưởng Đóng gói Mã Nguồn Phần Mềm (Binary Packaging Studio)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Dán mã nguồn trực tiếp hoặc tải tệp/kho nén .zip từ máy tính để tự động biên dịch, tối ưu hóa và đóng gói thành tệp nhị phân cho <strong>Windows (.exe)</strong>, <strong>Android (.apk)</strong>, <strong>iOS (.ipa)</strong> và <strong>macOS (.dmg)</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-400">Tệp nguồn đã nạp:</div>
            <div className="text-sm font-mono font-semibold text-emerald-400">{files.length} tệp</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'paste'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>1. Dán mã nguồn (Paste Code)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('load')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'load'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>2. Tải tệp / .ZIP (Load Files) ({files.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'config'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>3. Cấu hình Đích ({config.selectedPlatforms.length} nền tảng)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('artifacts')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'artifacts'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>4. Thành phẩm Đóng gói ({artifacts.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'paste' && (
        <CodePasteInput onAddOrUpdateFile={handleAddOrUpdateFile} existingFilesCount={files.length} />
      )}

      {activeTab === 'load' && (
        <FileLoadDropzone
          files={files}
          onFilesLoaded={handleFilesLoaded}
          onRemoveFile={handleRemoveFile}
          onClearAll={handleClearAll}
        />
      )}

      {activeTab === 'config' && (
        <PlatformPackageTarget config={config} onChangeConfig={(patch) => setConfig((p) => ({ ...p, ...patch }))} />
      )}

      {/* Build Execution Pipeline always visible or on tab */}
      <PackagingRunner
        files={files}
        config={config}
        onPackagingComplete={handlePackagingComplete}
        isBuilding={isBuilding}
        setIsBuilding={setIsBuilding}
      />

      {/* Artifacts List */}
      <PackagedArtifactsList
        artifacts={artifacts}
        onOpenDriveModal={onOpenDriveModal}
        appName={config.appName}
      />
    </div>
  );
};
