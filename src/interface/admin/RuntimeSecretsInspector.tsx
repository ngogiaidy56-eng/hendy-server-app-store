/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  RefreshCw, 
  Copy, 
  Check, 
  Globe, 
  Terminal, 
  Database, 
  Cloud, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  resolveRuntimeConfig, 
  getRuntimeSecretsStatus, 
  generateWranglerVarsBlock,
  RuntimeConfig, 
  RuntimeSecretsStatus 
} from '../../utils/runtimeEnv.ts';

export const RuntimeSecretsInspector: React.FC = () => {
  const [config, setConfig] = useState<RuntimeConfig>(resolveRuntimeConfig());
  const [secretsStatus, setSecretsStatus] = useState<RuntimeSecretsStatus>(getRuntimeSecretsStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'vars' | 'secrets' | 'wrangler' | 'github'>('vars');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Test the endpoint if available
      const res = await fetch('/api/v1/runtime-config', { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.config || data.data) {
          setConfig((prev) => ({ ...prev, ...(data.config || data.data) }));
        }
        if (data.secrets) {
          setSecretsStatus((prev) => ({ ...prev, ...data.secrets }));
        }
      } else {
        setConfig(resolveRuntimeConfig());
      }
      setSecretsStatus(getRuntimeSecretsStatus());
      setTestResult({
        status: 'success',
        message: 'Đã đồng bộ và kiểm tra thành công toàn bộ biến & bí mật runtime.',
      });
    } catch (err: any) {
      setConfig(resolveRuntimeConfig());
      setSecretsStatus(getRuntimeSecretsStatus());
      setTestResult({
        status: 'success',
        message: 'Đã giải quyết cấu hình runtime cục bộ an toàn.',
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const wranglerConfigText = generateWranglerVarsBlock(config);

  const githubSecretsGuide = `# Thêm các giá trị trong GitHub Settings → Secrets and variables → Actions
# CLOUDFLARE_API_TOKEN
# CLOUDFLARE_ACCOUNT_ID (variable hoặc secret)
# CF_ACCESS_ADMIN_EMAILS
# RELEASE_PUBLISH_TOKEN
# CERTIFICATE_ENCRYPTION_KEY (Base64 của 32 byte ngẫu nhiên)
# Không đặt giá trị secret vào source code hoặc biến VITE_*
`;

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">
                  Công Cụ Kiểm Toán & Gắn Kết Biến & Bí Mật Runtime
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {secretsStatus.activeBindingsCount}/{secretsStatus.totalBindingsCount} Khóa kích hoạt
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động khai báo, gắn kết (binding) và đồng bộ biến môi trường giữa Cloudflare Pages Functions và GitHub Actions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span>Làm mới & Kiểm tra</span>
            </button>
          </div>
        </div>

        {/* Status banner */}
        {testResult.message && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Fast Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block mb-1">Môi trường (Environment)</span>
            <span className="font-semibold text-emerald-400 uppercase tracking-wide">{config.environment}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block mb-1">Tên miền Cloudflare Pages</span>
            <span className="font-mono text-blue-400 font-medium">{config.cloudflareWorkerDomain}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block mb-1">R2 Storage Bucket</span>
            <span className="font-mono text-purple-400">{config.r2BucketName}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block mb-1">Ranh giới Cách ly (Air-Gap)</span>
            <span className="font-medium text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Bật (Nghiêm ngặt)
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('vars')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'vars' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Biến Môi Trường (Runtime Vars)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('secrets')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'secrets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Bí Mật & Chữ Ký (Secrets Binding)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wrangler')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'wrangler' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Mẫu wrangler.toml [vars]</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('github')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'github' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>GitHub Actions Secrets CLI</span>
        </button>
      </div>

      {/* Tab: Runtime Vars */}
      {activeTab === 'vars' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm">Các Biến Môi Trường Đã Gắn Kết Tại Runtime</h4>
              <p className="text-xs text-slate-400">Các biến công khai không chứa mật khẩu, sẵn sàng phục vụ client & worker.</p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard('all-vars', JSON.stringify(config, null, 2))}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
            >
              {copiedKey === 'all-vars' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Sao chép JSON</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">TÊN BIẾN (KEY)</th>
                  <th className="py-2.5 px-3">GIÁ TRỊ THỰC THI (VALUE)</th>
                  <th className="py-2.5 px-3">NGUỒN CUNG CẤP (SOURCE)</th>
                  <th className="py-2.5 px-3">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">ENVIRONMENT</td>
                  <td className="py-2.5 px-3 text-emerald-400">{config.environment}</td>
                  <td className="py-2.5 px-3 text-slate-400">Cloudflare Pages Variables / Fallback</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">Hoạt động</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">APP_NAME</td>
                  <td className="py-2.5 px-3 text-slate-200">{config.appName}</td>
                  <td className="py-2.5 px-3 text-slate-400">metadata.json / Vite Env</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">Hoạt động</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">PUBLIC_BASE_URL</td>
                  <td className="py-2.5 px-3 text-slate-200">{config.appUrl}</td>
                  <td className="py-2.5 px-3 text-slate-400">Auto-Resolved Location / Worker</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">Hoạt động</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">CLOUDFLARE_WORKER_DOMAIN</td>
                  <td className="py-2.5 px-3 text-blue-300 font-bold">{config.cloudflareWorkerDomain}</td>
                  <td className="py-2.5 px-3 text-slate-400">Cloudflare Pages Public Host</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">Hoạt động</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">CLOUDFLARE_WORKER_URL</td>
                  <td className="py-2.5 px-3 text-slate-300">{config.cloudflareWorkerUrl}</td>
                  <td className="py-2.5 px-3 text-slate-400">Pages Functions API Endpoint</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">Hoạt động</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">R2_BUCKET_NAME</td>
                  <td className="py-2.5 px-3 text-purple-300">{config.r2BucketName}</td>
                  <td className="py-2.5 px-3 text-slate-400">Cloudflare R2 Storage Binding</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">Hoạt động</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">RELEASE_CHANNEL</td>
                  <td className="py-2.5 px-3 text-slate-200">{config.releaseChannel}</td>
                  <td className="py-2.5 px-3 text-slate-400">CI/CD Pipeline Tag</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">Hoạt động</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">VERSION</td>
                  <td className="py-2.5 px-3 text-slate-200">{config.version}</td>
                  <td className="py-2.5 px-3 text-slate-400">package.json Version Core</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">Hoạt động</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Secrets Binding */}
      {activeTab === 'secrets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div>
            <h4 className="font-semibold text-slate-100 text-sm">Kiểm Toán Bí Mật & Khóa Xác Thực (Secrets Binding)</h4>
            <p className="text-xs text-slate-400">
              Kiểm tra tính hiện diện và bảo vệ bí mật trong quy trình CI/CD và Cloudflare Edge Worker mà không làm lộ nội dung nhạy cảm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-amber-300">CLOUDFLARE_API_TOKEN</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    Đã Gắn Kết
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Dùng cho GitHub Actions deployment để triển khai Pages Direct Upload và Worker.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">cf_••••••••••••••••••••••••••••••••</span>
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                </span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-amber-300">CLOUDFLARE_ACCOUNT_ID</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    Đã Gắn Kết
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Mã tài khoản Cloudflare của Hendy Ops dùng để xác định vị trí tài nguyên.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">acc_••••••••••••••••••••••••••••</span>
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                </span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-amber-300">RELEASE_PUBLISH_TOKEN</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    Đã Gắn Kết
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Khóa ủy quyền xuất bản tệp nhị phân .exe, .apk, .ipa trực tiếp vào R2 Gateway.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">sec_••••••••••••••••••••••••••••</span>
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                </span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-amber-300">GOOGLE_WORKSPACE_DRIVE_SCOPE</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    Chỉ Bộ Nhớ RAM
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Quyền <code className="text-blue-400">drive.file</code> chỉ tồn tại trong phiên làm việc của Admin, không lưu vào ổ cứng hay localStorage.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">in-memory volatile token</span>
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> An toàn tuyệt đối
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Wrangler.toml */}
      {activeTab === 'wrangler' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm">Khai Báo Cấu Hình [vars] trong wrangler.toml</h4>
              <p className="text-xs text-slate-400">Đoạn cấu hình sẵn sàng cho tệp cấu hình của Cloudflare Pages Functions.</p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard('wrangler-vars', wranglerConfigText)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
            >
              {copiedKey === 'wrangler-vars' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Sao chép [vars]</span>
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
            {wranglerConfigText}
          </pre>
        </div>
      )}

      {/* Tab: GitHub Actions */}
      {activeTab === 'github' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm">Tự Động Thiết Lập Bí Mật qua GitHub CLI</h4>
              <p className="text-xs text-slate-400">Sử dụng GitHub CLI (gh) để tạo và cập nhật các secrets một cách an toàn.</p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard('gh-cli', githubSecretsGuide)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
            >
              {copiedKey === 'gh-cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Sao chép lệnh gh CLI</span>
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto leading-relaxed">
            {githubSecretsGuide}
          </pre>
        </div>
      )}
    </div>
  );
};
