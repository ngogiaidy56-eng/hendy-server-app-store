/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mail, Lock, User, CheckCircle2, AlertCircle, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.ts';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { signInWithGmail, signInWithEmail, signUpWithEmail, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGmailAuth = async () => {
    clearError();
    setSuccessMsg(null);
    try {
      const user = await signInWithGmail();
      if (user) {
        setSuccessMsg(`Chào mừng ${user.displayName || user.email}! Đăng nhập Gmail thành công.`);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch {
      // error handled in useAuth
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) return;

    try {
      if (mode === 'register') {
        const user = await signUpWithEmail(email.trim(), password, displayName.trim());
        setSuccessMsg(`Đăng ký tài khoản thành công! Chào mừng ${user.displayName || user.email}.`);
      } else {
        const user = await signInWithEmail(email.trim(), password);
        setSuccessMsg(`Đăng nhập thành công! Chào mừng ${user.displayName || user.email}.`);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      // error handled in useAuth
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 flex flex-col gap-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded bg-blue-600/20 text-blue-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-slate-100">
                {mode === 'login' ? 'Đăng nhập Hendy Store' : 'Tạo tài khoản Hendy Store'}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Đăng ký hoặc đăng nhập để quản lý ứng dụng, đồng bộ dữ liệu và nhận bản cập nhật.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Gmail Registration / Login Button */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleGmailAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs shadow-md transition-colors border border-slate-300 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold text-slate-800">
              {mode === 'register' ? 'Đăng ký nhanh bằng Gmail' : 'Đăng nhập nhanh bằng Gmail'}
            </span>
          </button>
          <p className="text-[11px] text-center text-slate-500">
            Xác thực an toàn một chạm với tài khoản Google Workspace / Gmail
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-slate-800" />
          <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
            HOẶC BẰNG EMAIL
          </span>
          <div className="flex-1 border-t border-slate-800" />
        </div>

        {/* Toggle Mode Tabs */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              clearError();
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'login' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              clearError();
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'register' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng ký mới</span>
          </button>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên của bạn:</label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="bg-transparent text-slate-200 outline-none w-full"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Địa chỉ Email:</label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenban@gmail.com"
                required
                className="bg-transparent text-slate-200 outline-none w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Mật khẩu:</label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={6}
                className="bg-transparent text-slate-200 outline-none w-full"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-900/60 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-900/60 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md disabled:opacity-50 mt-1"
          >
            {loading ? 'Đang xử lý...' : mode === 'register' ? 'Đăng ký tài khoản' : 'Đăng nhập ngay'}
          </button>
        </form>
      </div>
    </div>
  );
};
