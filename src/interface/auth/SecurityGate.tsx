/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin credentials are verified server-side by the Render Express application.
 * The browser's native HTTP Basic Auth prompt handles the credential challenge.
 */
import React from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";

interface SecurityGateProps {
  onCancel: () => void;
}

export const SecurityGate: React.FC<SecurityGateProps> = ({ onCancel }) => {
  const openRenderAdmin = () => window.location.assign("/admin");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <section className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <header className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-800/60 bg-emerald-950/80 text-emerald-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Hendy Admin Console</h2>
            <p className="text-xs text-slate-400">Xác thực phía máy chủ trên Render</p>
          </div>
        </header>

        <div className="rounded-xl border border-sky-800/60 bg-sky-950/30 p-4 text-sm leading-6 text-sky-100">
          Admin được bảo vệ bằng HTTP Basic Auth. Máy chủ Render xác minh thông tin đăng nhập
          bằng secrets trong Environment; mật khẩu không được lưu trong mã nguồn hoặc trình duyệt.
          Tiếp tục đến /admin để trình duyệt hiển thị hộp thoại đăng nhập bảo mật.
        </div>

        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Store
          </button>
          <button type="button" onClick={openRenderAdmin}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-500">
            <LockKeyhole className="h-3.5 w-3.5" /> Đăng nhập Admin
          </button>
        </div>
      </section>
    </div>
  );
};
