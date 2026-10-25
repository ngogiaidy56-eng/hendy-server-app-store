/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Cloud, Upload, Trash2, Check, RefreshCw, FileText, AlertTriangle, ExternalLink, ShieldCheck, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { googleSignIn, emailSignIn, emailSignUp, logout, auth } from '../../google-drive/firebaseAuth.ts';
import { uploadFileToDrive, listAppDriveFiles, deleteDriveFile, GoogleDriveFile } from '../../google-drive/driveService.ts';

interface GoogleDriveModalProps {
  onClose: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ onClose }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);

  // Auth form states (Registration / Login)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        if (accessToken) {
          loadFiles(accessToken);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, [accessToken]);

  const loadFiles = async (token: string) => {
    setIsLoading(true);
    try {
      const res = await listAppDriveFiles(token);
      setFiles(res);
    } catch (err: any) {
      setStatusMessage(`Lỗi tải danh sách Drive: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    setAuthError(null);
    try {
      const res = await googleSignIn(true);
      if (res?.user) {
        setCurrentUser(res.user);
        if (res.accessToken) {
          setAccessToken(res.accessToken);
          setStatusMessage('Đăng nhập Google Workspace thành công.');
          await loadFiles(res.accessToken);
        } else {
          setStatusMessage('Đăng nhập thành công.');
        }
      }
    } catch (err: any) {
      const errorCode = err?.code || '';
      if (errorCode === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        setStatusMessage('Cửa sổ xác thực Google Drive đã được đóng. Hãy nhấn lại nút khi bạn sẵn sàng cấp quyền.');
      } else if (errorCode === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        setAuthError('Trình duyệt đã chặn cửa sổ xác thực. Vui lòng mở quyền Pop-up cho trang này để kết nối Google Drive.');
      } else {
        setAuthError(`Không thể đăng nhập Google: ${err.message || 'Lỗi kết nối'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'register') {
        const user = await emailSignUp(email.trim(), password, displayName.trim());
        setCurrentUser(user);
        setStatusMessage('Đăng ký tài khoản thành công! Để kết nối Google Drive, hãy nhấn "Đăng nhập bằng Google".');
      } else {
        const user = await emailSignIn(email.trim(), password);
        setCurrentUser(user);
        setStatusMessage('Đăng nhập tài khoản thành công.');
      }
    } catch (err: any) {
      setAuthError(`Lỗi xác thực: ${err.message || 'Email hoặc mật khẩu không hợp lệ'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    setFiles([]);
    setStatusMessage('Đã đăng xuất tài khoản.');
  };

  const handleBackupSnapshot = async () => {
    if (!accessToken) {
      setStatusMessage('Cần quyền truy cập Google Drive Token. Vui lòng nhấn "Đăng nhập bằng Google" để cấp quyền Drive.');
      return;
    }
    setIsLoading(true);
    setStatusMessage('Đang đóng gói và sao lưu snapshot lên Google Drive...');
    try {
      const snapshot = {
        name: 'Hendy Tools Platform Snapshot',
        version: '3.1.2',
        timestamp: new Date().toISOString(),
        manifest: {
          appId: 'hendy-tools-pro',
          environment: 'production',
          domain: 'hendytools.pages.dev',
          storage: 'Google Drive API (drive.file scope)',
        },
      };

      const fileName = `hendy-tools-snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });

      const result = await uploadFileToDrive(
        accessToken,
        fileName,
        'application/json',
        blob,
        'Bản sao lưu cấu hình Hendy Tools Platform trên Cloudflare Pages'
      );

      setStatusMessage(`Đã sao lưu thành công tệp lên Google Drive (ID: ${result.id.substring(0, 10)}...).`);
      await loadFiles(accessToken);
    } catch (err: any) {
      setStatusMessage(`Lỗi sao lưu Drive: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteFile = async () => {
    if (!accessToken || !fileToDelete) return;
    setIsLoading(true);
    try {
      await deleteDriveFile(accessToken, fileToDelete.id);
      setStatusMessage(`Đã xóa tệp "${fileToDelete.name}" khỏi Google Drive.`);
      setFileToDelete(null);
      await loadFiles(accessToken);
    } catch (err: any) {
      setStatusMessage(`Lỗi xóa tệp: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                Google Drive Workspace Hub & Xác Thực Quản Trị
              </h3>
              <p className="text-xs text-slate-400">
                Lưu trữ đám mây nội bộ Server Plus (Phạm vi an toàn: <code className="text-blue-300">drive.file</code>)
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

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {!currentUser ? (
            <div className="flex flex-col gap-4">
              {/* Tabs: Đăng nhập vs Đăng ký */}
              <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    authMode === 'login' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    authMode === 'register' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Đăng ký tài khoản</span>
                </button>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên:</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500"
                    />
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
                      placeholder="admin@hendytools.com"
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

                {authError && (
                  <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-900/60 text-rose-300 text-xs">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md disabled:opacity-50 mt-1"
                >
                  {isLoading
                    ? 'Đang xử lý...'
                    : authMode === 'register'
                    ? 'Tạo tài khoản Quản trị'
                    : 'Đăng nhập vào Server Plus'}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 border-t border-slate-800" />
                <span className="text-[10px] uppercase font-mono text-slate-500">
                  HOẶC KẾT NỐI VỚI GOOGLE DRIVE
                </span>
                <div className="flex-1 border-t border-slate-800" />
              </div>

              {/* Official Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs shadow-md transition-colors border border-slate-300 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>{isLoading ? 'Đang kết nối Google...' : 'Đăng nhập bằng Google Workspace (Drive Auth)'}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* User Session Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-9 h-9 rounded-full border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">
                      {currentUser.displayName || 'Tài khoản Quản trị'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {accessToken ? (
                    <button
                      type="button"
                      onClick={handleBackupSnapshot}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Sao lưu Snapshot</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      title="Cấp quyền Google Drive"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Cấp quyền Drive</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>

              {/* Files on Google Drive */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Tệp ứng dụng trên Google Drive ({files.length}):</span>
                  {accessToken && (
                    <button
                      type="button"
                      onClick={() => loadFiles(accessToken)}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Làm mới</span>
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950">
                  {files.length > 0 ? (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-medium text-slate-200 block truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {file.size ? `${(Number(file.size) / 1024).toFixed(1)} KB` : 'Tệp văn bản'} · Cập nhật:{' '}
                              {file.createdTime ? new Date(file.createdTime).toLocaleDateString('vi-VN') : 'Gần đây'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-blue-400 rounded transition-colors"
                              title="Mở trên Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setFileToDelete(file)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                            title="Xóa tệp khỏi Google Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Chưa có tệp sao lưu nào trên Google Drive. Nhấn <strong>"Sao lưu Snapshot"</strong> để tạo bản sao lưu đầu tiên.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="text-xs p-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        {fileToDelete && (
          <div className="p-4 bg-rose-950/40 border-t border-rose-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                Bạn có chắc chắn muốn xóa tệp <strong>"{fileToDelete.name}"</strong> vĩnh viễn khỏi Google Drive?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-500"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
