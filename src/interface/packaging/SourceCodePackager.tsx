/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Package, Code2, Upload, Settings2, Play, Sparkles, CheckCircle, FolderTree } from 'lucide-react';
import { CodePasteInput } from './CodePasteInput.tsx';
import { FileLoadDropzone, LoadedSourceFile } from './FileLoadDropzone.tsx';
import { PlatformPackageTarget, PackagingConfigState } from './PlatformPackageTarget.tsx';
import { PackagingRunner } from './PackagingRunner.tsx';
import { PackagedArtifactsList } from './PackagedArtifactsList.tsx';
import { ProjectTemplate, BuildArtifact } from '../../types/index.ts';

interface SourceCodePackagerProps {
  onOpenDriveModal?: () => void;
  onPublishApp?: (app: ProjectTemplate) => void;
}

export const SourceCodePackager: React.FC<SourceCodePackagerProps> = ({
  onOpenDriveModal,
  onPublishApp,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'load' | 'config' | 'artifacts'>('paste');

  const [files, setFiles] = useState<LoadedSourceFile[]>([
    {
      name: 'src/main.rs',
      size: 482,
      language: 'rust',
      content: `// Hendy Tools High-Performance Native Core\nfn main() {\n    println!("Khởi chạy lõi Hendy Server Plus Native cho Windows 64-bit & 32-bit");\n}`,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      name: 'Cargo.toml',
      size: 320,
      language: 'toml',
      content: `[package]\nname = "hendy-core"\nversion = "3.1.2"\nedition = "2021"\ndescription = "Ứng dụng đóng gói nhị phân đa nền tảng"\n\n[dependencies]\ntauri = "2.0.0"\n`,
      sha256: '7d56686a9f45ba6d0b57fa4c3f5080c984ca3b567b45db59c16fc01d16a5b28e',
    },
    {
      name: 'manifest.json',
      size: 280,
      language: 'json',
      content: `{\n  "name": "Hendy Tools Pro",\n  "version": "3.1.2",\n  "architectures": ["x86_64", "x86", "arm64"],\n  "platforms": ["windows", "android", "ios"]\n}`,
      sha256: 'a12903847291a0c8381928374829102837481928374819283748192837481928',
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
      id: 'art-win-x64-init',
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
        certificateType: 'Authenticode Extended Validation (EV) 64-bit',
        timestamp: new Date().toISOString(),
        serialNumber: 'SHA256-EV-9821-4328-8761',
      },
    },
    {
      id: 'art-win-x86-init',
      platform: 'windows',
      format: '.exe',
      arch: 'x86',
      filename: 'HendyTools-v3.1.2-x86-Setup.exe',
      sizeBytes: 13920000,
      sha256: '7b2234091a18c64d88e0e9231fca6110f8455e89d12304918e7b165b4528ec11',
      downloadUrl: '/api/artifacts/download?file=HendyTools-v3.1.2-x86-Setup.exe',
      createdAt: new Date().toISOString(),
      verified: true,
      signatureInfo: {
        issuer: 'Hendy Tools Authenticode Extended Validation CA',
        certificateType: 'Authenticode Extended Validation (EV) 32-bit',
        timestamp: new Date().toISOString(),
        serialNumber: 'SHA256-EV-9821-4328-8762',
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

  const handleScaffoldFullProject = (scaffolded: { name: string; size: number; language: string; content: string; sha256?: string }[]) => {
    setFiles(scaffolded);
    // Also update appName if extracted
  };

  const handlePublishToStore = () => {
    if (!onPublishApp) return;

    const newProject: ProjectTemplate = {
      id: `proj-${config.packageId.replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      name: config.appName,
      slug: config.appName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      tagline: `Phần mềm ${config.appName} đóng gói hoàn chỉnh cho Windows 64-bit & 32-bit, Android, iOS`,
      description: `Ứng dụng ${config.appName} được biên dịch và đóng gói hoàn chỉnh từ mã nguồn. Tương thích Windows (x86_64 64-bit và x86 32-bit), Android (.apk) và iOS (.ipa), chứng thư số Authenticode EV.`,
      category: 'Ứng Dụng Đóng Gói Mới',
      framework: config.selectedPlatforms.includes('windows') ? 'Rust + Native Windows' : 'Multiplatform Binary',
      currentVersion: `v${config.version}`,
      bundleIdentifier: config.packageId,
      publisher: config.publisher,
      websiteUrl: 'https://hendy-app-store.pages.dev',
      githubRepo: `https://github.com/hendyngo-servers/${config.appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      securityLevel: 'Enterprise High',
      storeMeta: {
        rating: 5.0,
        reviewCount: 1,
        downloadsCount: 'Mới phát hành',
        badge: 'VerifiedPro',
        badgeLabel: 'Ứng Dụng Mới Đóng Gói',
        ageRating: 'Phù hợp mọi lứa tuổi',
        categoryLabel: 'Ứng Dụng Đóng Gói Mới',
        screenshots: [
          { id: 'ss-new-1', caption: 'Giao diện ứng dụng chính sau khi cài đặt thành công', mode: 'desktop' },
          { id: 'ss-new-2', caption: 'Xác thực chữ ký số Authenticode EV trên Windows 64-bit và 32-bit', mode: 'desktop' },
        ],
        dataSafety: {
          collectedData: 'Không thu thập dữ liệu cá nhân, chạy hoàn toàn cục bộ trên máy người dùng',
          securityPractice: 'Ký số Authenticode EV, đối soát mã băm SHA-256',
          encryptionStandard: 'AES-256 Hardware Enclave',
        },
        systemRequirements: {
          minOs: 'Windows 10/11 (64-bit & 32-bit), Android 9.0+, iOS 16.0+',
          recommendedRam: '2 GB RAM',
          diskSpace: '50 MB dung lượng trống',
          gpuReq: 'DirectX 11 hoặc phần cứng tương thích',
        },
        reviews: [
          {
            id: 'rev-init',
            author: 'Quản trị viên Hệ thống Hendy',
            rating: 5,
            date: 'Hôm nay',
            comment: 'Đã đóng gói hoàn chỉnh cả 2 phiên bản Windows 64-bit và 32-bit. Ứng dụng khởi chạy cực kỳ mượt mà.',
            platform: 'Windows 64-bit & 32-bit',
            verifiedInstall: true,
          },
        ],
      },
      files: files.map((f, i) => ({
        id: `file-${i}`,
        name: f.name,
        path: f.name.startsWith('/') || f.name.includes('/') ? f.name : `/src/${f.name}`,
        language: f.language,
        content: f.content,
        isEntry: i === 0,
        securityHash: f.sha256,
      })),
      platforms: [
        {
          platform: 'windows',
          displayName: 'Windows (64-bit & 32-bit)',
          iconName: 'windows',
          enabled: true,
          selectedArch: 'x86_64',
          selectedFormat: '.exe',
          signingEnabled: true,
          formats: [
            { format: '.exe', name: 'Gói Cài Đặt Windows 64-bit (.exe)', description: 'Bản phân phối x86_64 chính thức', defaultSelected: true, architectures: ['x86_64'] },
            { format: '.exe', name: 'Gói Cài Đặt Windows 32-bit (.exe)', description: 'Bản phân phối x86 (32-bit) tương thích', defaultSelected: false, architectures: ['x86'] },
          ],
        },
        ...(config.selectedPlatforms.includes('android')
          ? [
              {
                platform: 'android' as const,
                displayName: 'Android (APK)',
                iconName: 'android',
                enabled: true,
                selectedArch: 'arm64' as const,
                selectedFormat: '.apk',
                signingEnabled: true,
                formats: [
                  { format: '.apk', name: 'Gói Cài Đặt Android APK', description: 'Tương thích Android 9+', defaultSelected: true, architectures: ['arm64' as const] },
                ],
              },
            ]
          : []),
        ...(config.selectedPlatforms.includes('ios')
          ? [
              {
                platform: 'ios' as const,
                displayName: 'iOS (IPA)',
                iconName: 'apple',
                enabled: true,
                selectedArch: 'arm64' as const,
                selectedFormat: '.ipa',
                signingEnabled: true,
                formats: [
                  { format: '.ipa', name: 'Gói Cài Đặt iOS IPA', description: 'Phân phối App Store/TestFlight', defaultSelected: true, architectures: ['arm64' as const] },
                ],
              },
            ]
          : []),
        ...(config.selectedPlatforms.includes('macos')
          ? [
              {
                platform: 'macos' as const,
                displayName: 'macOS (DMG)',
                iconName: 'apple',
                enabled: true,
                selectedArch: 'universal' as const,
                selectedFormat: '.dmg',
                signingEnabled: true,
                formats: [
                  { format: '.dmg', name: 'Đĩa Ảnh macOS DMG', description: 'Apple Silicon & Intel', defaultSelected: true, architectures: ['universal' as const] },
                ],
              },
            ]
          : []),
      ],
      releases: [
        {
          version: `v${config.version}`,
          tag: `v${config.version}`,
          releaseDate: 'Hôm nay',
          channel: 'stable',
          title: `${config.appName} v${config.version} — Phát hành chính thức`,
          changelog: [
            'Đóng gói tự động từ mã nguồn hoàn chỉnh.',
            'Hỗ trợ toàn diện cho hệ điều hành Windows cả 64-bit và 32-bit.',
            'Ký số chứng thư Authenticode EV và đối soát mã băm SHA-256.',
          ],
          published: true,
          artifacts,
        },
      ],
    };

    onPublishApp(newProject);
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
          <div className="text-right hidden sm:block mr-2">
            <div className="text-xs text-slate-400">Tệp nguồn đã nạp:</div>
            <div className="text-sm font-mono font-semibold text-emerald-400">{files.length} tệp</div>
          </div>

          {onPublishApp && (
            <button
              type="button"
              onClick={handlePublishToStore}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all cursor-pointer"
              title="Xuất bản ứng dụng này lên Cửa hàng AppStoreView và chuyển sang giao diện Cửa hàng"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Xuất bản lên Cửa hàng</span>
            </button>
          )}
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
        <CodePasteInput
          onAddOrUpdateFile={handleAddOrUpdateFile}
          onScaffoldFullProject={handleScaffoldFullProject}
          existingFilesCount={files.length}
          appName={config.appName}
          version={config.version}
        />
      )}

      {activeTab === 'load' && (
        <FileLoadDropzone
          files={files}
          onFilesLoaded={handleFilesLoaded}
          onRemoveFile={handleRemoveFile}
          onClearAll={handleClearAll}
          appName={config.appName}
          version={config.version}
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
        onPublishToStore={handlePublishToStore}
      />
    </div>
  );
};
