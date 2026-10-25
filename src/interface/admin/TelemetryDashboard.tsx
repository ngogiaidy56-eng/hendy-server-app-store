/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, HardDrive, Activity, Wifi, Server, Zap } from 'lucide-react';

interface TelemetryDashboardProps {
  cpuUsage: number;
  memoryMb: number;
  maxMemoryMb: number;
  networkKbps: number;
  uptime: string;
}

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({
  cpuUsage,
  memoryMb,
  maxMemoryMb,
  networkKbps,
  uptime,
}) => {
  const ramPercent = Math.min(100, Math.round((memoryMb / maxMemoryMb) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* CPU */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Bộ vi xử lý (CPU)</span>
          <Cpu className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums mb-1">
          {cpuUsage}%
        </div>
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              cpuUsage > 80 ? 'bg-rose-500' : cpuUsage > 50 ? 'bg-amber-400' : 'bg-blue-500'
            }`}
            style={{ width: `${cpuUsage}%` }}
          />
        </div>
      </div>

      {/* RAM */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Bộ nhớ RAM</span>
          <HardDrive className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums mb-1">
          {memoryMb} <span className="text-xs font-normal text-slate-400">/ {maxMemoryMb} MB</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${ramPercent}%` }}
          />
        </div>
      </div>

      {/* Network */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Lưu lượng Mạng</span>
          <Wifi className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums mb-1">
          {networkKbps} <span className="text-xs font-normal text-slate-400">KB/s</span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Cloudflare CDN Edge Caching: 99.4%
        </div>
      </div>

      {/* Uptime */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Thời gian hoạt động (Uptime)</span>
          <Activity className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums mb-1">
          {uptime}
        </div>
        <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Hệ thống danh nghĩa 100%</span>
        </div>
      </div>
    </div>
  );
};
