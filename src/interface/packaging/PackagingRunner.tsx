/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Browser-side packaging is not a native compiler or code-signing service.
 * This component deliberately refuses to fabricate EXE/APK/IPA artifacts,
 * checksum values, signing records or successful build logs.
 */
import React from "react";
import { AlertTriangle, ExternalLink, ShieldAlert } from "lucide-react";
import type { BuildArtifact } from "../../types/index.ts";
import type { PackagingConfigState } from "./PlatformPackageTarget.tsx";
import type { LoadedSourceFile } from "./FileLoadDropzone.tsx";

interface PackagingRunnerProps {
  files: LoadedSourceFile[];
  config: PackagingConfigState;
  onPackagingComplete: (artifacts: BuildArtifact[]) => void;
  isBuilding: boolean;
  setIsBuilding: (building: boolean) => void;
}

export const PackagingRunner: React.FC<PackagingRunnerProps> = ({ files, config }) => {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-amber-800/50 bg-slate-900 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950 text-amber-300">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Native build runner chưa được tích hợp</h3>
          <p className="text-xs text-slate-400">Không tạo artifact giả hoặc ghi nhận chữ ký khi chưa chạy toolchain thật.</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-4 text-xs leading-6 text-amber-100">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Chưa thể biên dịch hoặc ký số từ trình duyệt
        </div>
        <p className="mt-2">
          Dự án <strong>{config.appName}</strong> có {files.length} tệp nguồn và mục tiêu:
          {" "}{config.selectedPlatforms.join(", ") || "chưa chọn nền tảng"}.
          Trình duyệt hiện chỉ hỗ trợ đóng gói ZIP nguồn; nó không chạy Windows SDK,
          Android SDK, Xcode, cross-compiler hoặc dịch vụ Authenticode.
        </p>
        <p className="mt-2">
          Chưa có runner native đã cấu hình và kiểm thử nên mọi EXE/APK/IPA/DMG tạo từ màn hình
          này đều không được phép đánh dấu verified, signed hoặc published.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <span className="text-[11px] text-slate-500">Tải ZIP nguồn trong trình duyệt hoặc chọn artifact đã build thật để xuất bản qua Studio.</span>
        <a href="https://github.com/ngogiaidy56-eng/hendy-server-app-store/actions"
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
          <ExternalLink className="h-3.5 w-3.5" /> GitHub Actions
        </a>
      </div>
    </section>
  );
};
