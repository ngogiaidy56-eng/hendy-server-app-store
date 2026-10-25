/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Server, Cpu, Package, Download, ShieldCheck, Terminal, ArrowLeft, Cloud, Lock, CheckCircle2, Globe, KeyRound } from 'lucide-react';
import { TelemetryDashboard } from './TelemetryDashboard.tsx';
import { ServicesManager, ServiceItem } from './ServicesManager.tsx';
import { HendyGatewayReleases } from './HendyGatewayReleases.tsx';
import { SourceCodePackager } from '../packaging/SourceCodePackager.tsx';
import { SecuritySastScanner } from './SecuritySastScanner.tsx';
import { CloudCliTerminal } from './CloudCliTerminal.tsx';
import { RuntimeSecretsInspector } from './RuntimeSecretsInspector.tsx';
import { AuthorizedIpRule, ProjectTemplate } from '../../types/index.ts';

interface ServerPlusConsoleProps {
  onReturnToStore: () => void;
  onOpenDriveModal?: () => void;
  onPublishApp?: (app: ProjectTemplate) => void;
  clientIp?: string;
}

export const ServerPlusConsole: React.FC<ServerPlusConsoleProps> = ({
  onReturnToStore,
  onOpenDriveModal,
  onPublishApp,
  clientIp = '103.149.28.4',
}) => {
  const [activeNav, setActiveNav] = useState<'packager' | 'gateway' | 'telemetry' | 'services' | 'sast' | 'cli' | 'runtime'>('packager');

  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'svc-workers',
      name: 'Cloudflare Pages Functions + Static Assets',
      port: 3000,
      status: 'running',
      cpu: 1.2,
      memory: '210 MB',
      description: 'Worker dùng chung để phục vụ Store/Admin, định tuyến API và phân phối artifact từ R2.',
    },
    {
      id: 'svc-gateway',
      name: 'Hendy Download Gateway Core',
      port: 8080,
      status: 'running',
      cpu: 0.8,
      memory: '145 MB',
      description: 'Phân phối các tệp cài đặt chính thức cho Windows (.exe), Android (.apk) và iOS (.ipa).',
    },
    {
      id: 'svc-packager',
      name: 'Binary Packaging Studio & Cross-Compiler',
      port: 9000,
      status: 'running',
      cpu: 4.5,
      memory: '640 MB',
      description: 'Trình biên dịch và đóng gói mã nguồn từ clipboard hoặc tệp .zip thành tệp thực thi.',
    },
    {
      id: 'svc-sast',
      name: 'SAST Security & Anti-Tamper Engine',
      port: 9443,
      status: 'running',
      cpu: 0.4,
      memory: '110 MB',
      description: 'Kiểm toán an ninh tĩnh, chống trích xuất mã và xác thực chữ ký Authenticode EV.',
    },
  ]);

  const [allowedIps] = useState<AuthorizedIpRule[]>([
    {
      id: 'ip-1',
      ip: '103.149.28.4',
      label: 'Hendy Primary Operations Center (Việt Nam)',
      role: 'super-admin',
      status: 'active',
      addedAt: '2026-01-10',
    },
    {
      id: 'ip-2',
      ip: '127.0.0.1',
      label: 'Localhost / Cloudflare Tunnel Proxy',
      role: 'cloud-internal',
      status: 'active',
      addedAt: '2026-01-12',
    },
    {
      id: 'ip-3',
      ip: '14.162.140.89',
      label: 'VNPT Enterprise Secure Gateway Node',
      role: 'ops-engineer',
      status: 'active',
      addedAt: '2026-02-05',
    },
  ]);

  const handleToggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: s.status === 'running' ? 'stopped' : 'running' } : s))
    );
  };

  const handleRestartService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'running', cpu: 0.1 } : s))
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
      {/* Admin Top Header (Top Bar Contract: Zone 1 Wordmark, Zone 2 Breadcrumbs & Tabs, Zone 3 Actions) */}
      <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Zone 1 */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
            SP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-100 tracking-tight">Server Plus Admin Console</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                IP: {clientIp}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Hợp nhất Gateway, Packaging Studio & Quản trị Hệ thống</p>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveNav('packager')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeNav === 'packager' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Đóng gói Mã Nguồn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('gateway')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeNav === 'gateway' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cổng Tải Gateway</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('telemetry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeNav === 'telemetry' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Giám sát Phần cứng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('services')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeNav === 'services' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Dịch vụ ({services.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('sast')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeNav === 'sast' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>An ninh SAST</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('cli')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeNav === 'cli' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Web CLI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('runtime')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeNav === 'runtime' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-400 hover:text-amber-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Biến & Bí Mật Edge</span>
          </button>
        </div>

        {/* Zone 3: Return to Store & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenDriveModal && (
            <button
              type="button"
              onClick={onOpenDriveModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Google Drive</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReturnToStore}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Cửa hàng Ứng dụng</span>
          </button>
        </div>
      </header>

      {/* Mobile nav bar */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto p-2 bg-slate-900 border-b border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveNav('packager')}
          className={`px-3 py-1 rounded-lg shrink-0 ${activeNav === 'packager' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Đóng gói
        </button>
        <button
          type="button"
          onClick={() => setActiveNav('gateway')}
          className={`px-3 py-1 rounded-lg shrink-0 ${activeNav === 'gateway' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Cổng Gateway
        </button>
        <button
          type="button"
          onClick={() => setActiveNav('telemetry')}
          className={`px-3 py-1 rounded-lg shrink-0 ${activeNav === 'telemetry' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Phần cứng
        </button>
        <button
          type="button"
          onClick={() => setActiveNav('services')}
          className={`px-3 py-1 rounded-lg shrink-0 ${activeNav === 'services' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Dịch vụ
        </button>
        <button
          type="button"
          onClick={() => setActiveNav('sast')}
          className={`px-3 py-1 rounded-lg shrink-0 ${activeNav === 'sast' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          SAST
        </button>
        <button
          type="button"
          onClick={() => setActiveNav('cli')}
          className={`px-3 py-1 rounded-lg shrink-0 ${activeNav === 'cli' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          CLI
        </button>
        <button
          type="button"
          onClick={() => setActiveNav('runtime')}
          className={`px-3 py-1 rounded-lg shrink-0 ${activeNav === 'runtime' ? 'bg-amber-600 text-white' : 'text-amber-400'}`}
        >
          Biến & Bí Mật
        </button>
      </div>

      {/* Main Admin Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Hardware telemetry summary ribbon */}
        <TelemetryDashboard
          cpuUsage={8.4}
          memoryMb={1420}
          maxMemoryMb={8192}
          networkKbps={412}
          uptime="99 ngày, 14 giờ"
        />

        {/* Dynamic Nav Panes */}
        {activeNav === 'packager' && (
          <SourceCodePackager onOpenDriveModal={onOpenDriveModal} onPublishApp={onPublishApp} />
        )}

        {activeNav === 'gateway' && <HendyGatewayReleases />}

        {activeNav === 'telemetry' && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold text-slate-100 text-sm mb-1">
                Chi tiết Cấu hình Máy chủ & Cụm Cloudflare Edge
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Máy chủ phân tán toàn cầu hỗ trợ phân phối tệp nhị phân tốc độ cao với bộ đệm biên.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block mb-1">Khu vực Edge Node:</span>
                  <span className="font-medium text-slate-200">SIN (Singapore) / HAN (Hà Nội)</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block mb-1">Cơ chế Caching:</span>
                  <span className="font-medium text-emerald-400">Cloudflare Pages Functions + D1/R2/KV</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block mb-1">Độ trễ trung bình:</span>
                  <span className="font-medium text-blue-400">12ms (Việt Nam & Đông Nam Á)</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block mb-1">Mã hóa Truyền dẫn:</span>
                  <span className="font-medium text-slate-200">TLS 1.3 / HTTP/3 QUIC</span>
                </div>
              </div>
            </div>
            <HendyGatewayReleases />
          </div>
        )}

        {activeNav === 'services' && (
          <ServicesManager
            services={services}
            onToggleService={handleToggleService}
            onRestartService={handleRestartService}
          />
        )}

        {activeNav === 'sast' && <SecuritySastScanner />}

        {activeNav === 'cli' && <CloudCliTerminal />}

        {activeNav === 'runtime' && <RuntimeSecretsInspector />}

        {/* IP Allowlist Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h4 className="font-semibold text-xs text-slate-200">
                Danh sách Địa chỉ IP Được Cấp quyền Quản trị (IP Allowlist)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              Đang thực thi nghiêm ngặt
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 bg-slate-950 border border-slate-800 rounded-lg">
            {allowedIps.map((rule) => (
              <div key={rule.id} className="p-3 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono text-slate-200 font-semibold">{rule.ip}</span>
                  <span className="text-slate-400 text-[11px] hidden sm:inline">({rule.label})</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                  {rule.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
