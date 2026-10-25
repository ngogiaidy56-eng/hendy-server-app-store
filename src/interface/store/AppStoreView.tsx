/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ShieldCheck, Download, Star, Sparkles, Filter, Cloud, ExternalLink, Laptop, Smartphone, User, LogIn, LogOut, ChevronDown, CheckCircle } from 'lucide-react';
import { ProjectTemplate, BuildArtifact } from '../../types/index.ts';
import { AppCard } from './AppCard.tsx';
import { AppDetailModal } from './AppDetailModal.tsx';
import { WebAssemblyRunner } from './WebAssemblyRunner.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { UserAuthModal } from '../auth/UserAuthModal.tsx';

interface AppStoreViewProps {
  apps: ProjectTemplate[];
  onOpenDriveModal?: () => void;
  onRequestAdminAccess?: () => void;
}

export const AppStoreView: React.FC<AppStoreViewProps> = ({
  apps,
  onOpenDriveModal,
  onRequestAdminAccess,
}) => {
  const { user, signOutUser } = useAuth();
  const [selectedApp, setSelectedApp] = useState<ProjectTemplate | null>(null);
  const [sandboxApp, setSandboxApp] = useState<ProjectTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const categories = [
    { id: 'all', name: 'Tất cả ứng dụng' },
    { id: 'Developer Tools', name: 'Công cụ Lập trình' },
    { id: 'Security & Terminal', name: 'Bảo mật & Terminal' },
    { id: 'Creative & Design', name: 'Thiết kế Sáng tạo' },
    { id: 'Cloud & Storage', name: 'Lưu trữ & Mạng' },
  ];

  const featuredApp = apps.find((a) => a.id === 'hendy-tools-pro') || apps[0];

  const filteredApps = apps.filter((app) => {
    const matchQuery =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const matchPlatform =
      selectedPlatform === 'all' ||
      app.platforms.some((p) => p.platform === selectedPlatform && p.enabled);
    return matchQuery && matchCategory && matchPlatform;
  });

  const handleQuickDownload = (app: ProjectTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedApp(app);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
      {/* Consumer App Store Top Bar (Zone 1: Wordmark, Zone 2: Search & Categories, Zone 3: Google Drive & Admin Access) */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            H
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 tracking-tight leading-none">
              Hendy App Store
            </h1>
            <p className="text-[11px] text-slate-400">Kho ứng dụng & Bộ cài đặt chính thức</p>
          </div>
        </div>

        {/* Zone 2: Search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ứng dụng, công cụ, tiện ích..."
              className="bg-transparent text-slate-200 outline-none w-full placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Zone 3: Actions & User Navigation */}
        <div className="flex items-center gap-2.5 shrink-0 relative">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">hendy-tool-releas.ngogiaidy56.workers.dev</span>
          </div>

          {/* User Registration & Login with Gmail */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors shadow-xs"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="max-w-[110px] truncate font-medium">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 flex flex-col gap-1 text-xs">
                  <div className="p-2 border-b border-slate-800/80">
                    <p className="font-semibold text-slate-200 truncate">{user.displayName || 'Người dùng Gmail'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Thông tin tài khoản
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      signOutUser();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-900 shadow-md transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
              <span>Đăng nhập Gmail</span>
            </button>
          )}

          {onRequestAdminAccess && (
            <button
              type="button"
              onClick={onRequestAdminAccess}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all shadow-xs"
              title="Truy cập Bảng điều khiển Quản trị viên Server Plus"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Quản trị viên</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col gap-8">
        {/* Mobile Search */}
        <div className="sm:hidden">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ứng dụng..."
              className="bg-transparent text-slate-200 outline-none w-full"
            />
          </div>
        </div>

        {/* Featured Hero Banner */}
        {featuredApp && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/40 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>TIÊU ĐIỂM HÔM NAY · BỘ CÔNG CỤ ĐA NỀN TẢNG</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                {featuredApp.name} {featuredApp.currentVersion.startsWith('v') ? featuredApp.currentVersion : `v${featuredApp.currentVersion}`}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                {featuredApp.description}
              </p>

              {/* Clean metadata without pill boxes */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-6">
                <div className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{featuredApp.storeMeta.rating}</span>
                </div>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{featuredApp.storeMeta.downloadsCount} lượt cài đặt</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Chứng thư số Authenticode EV
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedApp(featuredApp)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải về ngay ({featuredApp.releases[0]?.artifacts[0]?.format || '.exe'})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSandboxApp(featuredApp)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <span>Chạy thử WebAssembly Sandbox</span>
                </button>
              </div>
            </div>

            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-4xl shadow-xl shrink-0">
              {featuredApp.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>Hệ điều hành:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none text-xs"
            >
              <option value="all">Tất cả hệ điều hành</option>
              <option value="windows">Windows (.exe)</option>
              <option value="android">Android (.apk)</option>
              <option value="ios">iOS (.ipa)</option>
              <option value="macos">macOS (.dmg)</option>
            </select>
          </div>
        </div>

        {/* App Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onSelect={(a) => setSelectedApp(a)}
              onQuickDownload={(a, e) => handleQuickDownload(a, e)}
            />
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            Không tìm thấy ứng dụng nào khớp với tiêu chí tìm kiếm của bạn.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 sm:px-8 mt-auto text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <span>© 2026 Hendy Tools Platform. Bản quyền được bảo lưu.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% An toàn & Không mã độc
          </span>
          <span>·</span>
          <span>Xác thực bởi Authenticode EV</span>
        </div>
      </footer>

      {/* Modals */}
      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onOpenSandbox={() => {
            setSandboxApp(selectedApp);
          }}
        />
      )}

      {sandboxApp && (
        <WebAssemblyRunner app={sandboxApp} onClose={() => setSandboxApp(null)} />
      )}

      {/* Homepage User Registration & Login Modal */}
      <UserAuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
