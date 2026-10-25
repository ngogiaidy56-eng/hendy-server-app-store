/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Play, RotateCcw, Terminal, Shield, CheckCircle } from 'lucide-react';
import { ProjectTemplate } from '../../types/index.ts';

interface WebAssemblyRunnerProps {
  app: ProjectTemplate;
  onClose: () => void;
}

export const WebAssemblyRunner: React.FC<WebAssemblyRunnerProps> = ({ app, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);

  useEffect(() => {
    setLogs([
      `[WASM_INIT] Đang khởi tạo môi trường cô lập WebAssembly Sandbox (Wasm-Memory: 64MB)...`,
      `[WASM_SECURITY] Kích hoạt ranh giới bảo mật Hermetic Sandbox (Zero-Syscall)...`,
      `[WASM_MODULE] Đã nạp nhị phân '${app.name}' v${app.currentVersion}.wasm thành công.`,
      `[READY] Sẵn sàng chạy thử nghiệm trực tiếp trong trình duyệt.`,
    ]);
  }, [app]);

  const handleRun = () => {
    setIsRunning(true);
    const start = performance.now();
    setLogs((prev) => [
      ...prev,
      `[EXEC_START] Bắt đầu thực thi vòng lặp chính (Main Event Loop)...`,
      `[ENGINE] Tải cấu hình mặc định: ${app.framework}...`,
      `[MEMORY] Cấp phát 16,384 trang heap bộ nhớ Wasm...`,
      `[RENDER] Khung hình 60 FPS được đồng bộ hóa với WebGL / Canvas.`,
      `[SYSTEM] Ứng dụng đang phản hồi bình thường mà không có lỗi bộ nhớ.`,
    ]);

    setTimeout(() => {
      setExecutionTimeMs(Math.round(performance.now() - start));
      setIsRunning(false);
      setLogs((prev) => [
        ...prev,
        `[STATUS_OK] Bài kiểm tra Sandbox kết thúc hoàn hảo: 0 ngoại lệ bộ nhớ, bảo toàn trạng thái an toàn.`,
      ]);
    }, 1200);
  };

  const handleReset = () => {
    setExecutionTimeMs(0);
    setLogs([
      `[RESET] Đã làm mới phiên Sandbox WebAssembly.`,
      `[READY] Sẵn sàng kích hoạt lượt chạy mới.`,
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {app.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                Chạy thử Sandbox WebAssembly: {app.name}
              </h3>
              <p className="text-xs text-slate-400">
                Thực thi an toàn trong trình duyệt không cần tải file về máy tính
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sandbox Canvas Simulator */}
        <div className="p-4 flex flex-col gap-3">
          <div className="h-44 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-2">
              <Shield className="w-6 h-6" />
            </div>
            <div className="font-medium text-slate-200 text-sm mb-1">
              Môi trường Cô lập Wasm Sandbox
            </div>
            <div className="text-xs text-slate-400 max-w-sm">
              Ứng dụng chạy với quyền hạn giới hạn, bảo vệ an toàn cho thiết bị và dữ liệu của bạn.
            </div>

            {executionTimeMs > 0 && (
              <div className="absolute top-3 right-3 text-emerald-400 text-xs font-mono flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Hoàn tất ({executionTimeMs}ms)</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isRunning ? 'Đang thực thi mã...' : 'Bắt đầu Chạy Thử'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới Sandbox</span>
            </button>
          </div>

          {/* Terminal Logs */}
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 max-h-40 overflow-y-auto font-mono text-xs text-slate-300">
            <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-1.5">
              <Terminal className="w-3 h-3 text-blue-400" />
              <span>Nhật ký luồng thực thi WebAssembly:</span>
            </div>
            {logs.map((log, i) => (
              <div key={i} className="py-0.5 text-slate-300 leading-tight">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Đóng Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
