/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Server, Play, Square, RotateCcw, ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface ServiceItem {
  id: string;
  name: string;
  port: number | null;
  status: 'running' | 'stopped';
  cpu: number;
  memory: string;
  description: string;
}

interface ServicesManagerProps {
  services: ServiceItem[];
  onToggleService: (id: string) => void;
  onRestartService: (id: string) => void;
}

export const ServicesManager: React.FC<ServicesManagerProps> = ({
  services,
  onToggleService,
  onRestartService,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Quản lý Dịch vụ Hệ thống (System Services)</h3>
            <p className="text-xs text-slate-400">
              Kiểm soát trạng thái, bộ nhớ và tiến trình của các cổng dịch vụ Server Plus.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
          {services.filter((s) => s.status === 'running').length} / {services.length} Đang chạy
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-medium text-xs text-slate-200">{svc.name}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                    svc.status === 'running'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      svc.status === 'running' ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  />
                  {svc.status === 'running' ? 'ĐANG CHẠY' : 'ĐÃ DỪNG'}
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-2 leading-relaxed">{svc.description}</p>

              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                {svc.port && <span>Cổng: :{svc.port}</span>}
                <span>CPU: {svc.cpu}%</span>
                <span>RAM: {svc.memory}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => onToggleService(svc.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  svc.status === 'running'
                    ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40'
                    : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/40'
                }`}
              >
                {svc.status === 'running' ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{svc.status === 'running' ? 'Dừng dịch vụ' : 'Khởi động'}</span>
              </button>

              <button
                type="button"
                onClick={() => onRestartService(svc.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                title="Khởi động lại tiến trình"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Khởi động lại</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
