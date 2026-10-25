/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, Lock, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

interface SecurityGateProps {
  clientIp: string;
  onGrantAccess: () => void;
  onCancel: () => void;
  isAuthorizedIp: boolean;
  onSimulateIpChange: (newIp: string) => void;
}

export const SecurityGate: React.FC<SecurityGateProps> = ({
  clientIp,
  onGrantAccess,
  onCancel,
  isAuthorizedIp,
  onSimulateIpChange,
}) => {
  const [passkey, setPasskey] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthorizedIp || passkey.trim() === 'hendy2026') {
      onGrantAccess();
    } else {
      setErrorMsg('Mã khóa bảo mật quản trị viên không chính xác. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              Cổng Kiểm soát An ninh Server Plus
            </h3>
            <p className="text-xs text-slate-400">
              Khu vực giới hạn đặc quyền cho Quản trị viên
            </p>
          </div>
        </div>

        {/* IP Status Box */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1 ${
            isAuthorizedIp
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">Địa chỉ IP của bạn:</span>
            <span className="font-mono font-bold">{clientIp}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isAuthorizedIp ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>IP nằm trong danh sách được cấp phép (Allowlist).</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>IP chưa được ủy quyền tự động. Cần nhập mã khóa bảo mật.</span>
              </>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isAuthorizedIp && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nhập mã khóa xác thực quản trị (Passkey):
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => {
                    setPasskey(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Nhập 'hendy2026' để mở khóa..."
                  className="bg-transparent text-slate-100 outline-none w-full"
                  autoFocus
                />
              </div>
              {errorMsg && <p className="text-rose-400 text-xs mt-1.5">{errorMsg}</p>}
            </div>
          )}

          {/* Quick test IP switcher for development */}
          <div className="text-[11px] text-slate-500 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 font-medium mb-1">Kiểm thử nhanh địa chỉ IP:</div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSimulateIpChange('103.149.28.4')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
              >
                103.149.28.4 (Hợp lệ)
              </button>
              <button
                type="button"
                onClick={() => onSimulateIpChange('127.0.0.1')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
              >
                127.0.0.1 (Local)
              </button>
              <button
                type="button"
                onClick={() => onSimulateIpChange('203.0.113.195')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
              >
                Khách lạ bên ngoài
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại App Store</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Xác thực & Truy cập</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
