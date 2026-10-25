/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Maximize2, Minimize2, Monitor, Smartphone, Tablet, Sliders } from 'lucide-react';
import { ScreenFitMode, Breakpoint } from './useScreenFit.ts';

interface ScreenFitBarProps {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  fitMode: ScreenFitMode;
  setFitMode: (mode: ScreenFitMode) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export const ScreenFitBar: React.FC<ScreenFitBarProps> = ({
  width,
  height,
  breakpoint,
  fitMode,
  setFitMode,
  isFullscreen,
  toggleFullscreen,
}) => {
  const getBreakpointBadge = () => {
    switch (breakpoint) {
      case 'mobile':
        return 'Điện thoại (<640px)';
      case 'tablet':
        return 'Máy tính bảng (640-1024px)';
      case 'desktop':
        return 'Màn hình máy tính (1024-1600px)';
      case 'ultrawide':
        return 'Màn hình siêu rộng (>1600px)';
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between gap-4 select-none shrink-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium text-slate-200">Tự động vừa màn hình:</span>
        </div>
        <span className="font-mono text-slate-400 tabular-nums">
          {width} × {height} px
        </span>
        <span className="text-slate-600 hidden sm:inline">·</span>
        <span className="text-slate-400 hidden sm:inline">{getBreakpointBadge()}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700/60">
          <button
            type="button"
            onClick={() => setFitMode('auto')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              fitMode === 'auto' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="Tự động tương thích 100% kích cỡ cửa sổ hiện tại"
          >
            Tự động
          </button>
          <button
            type="button"
            onClick={() => setFitMode('desktop-1440')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
              fitMode === 'desktop-1440' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="Khung chuẩn Desktop 1440px"
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden md:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setFitMode('tablet-768')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
              fitMode === 'tablet-768' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="Khung Tablet 768px"
          >
            <Tablet className="w-3 h-3" />
            <span className="hidden md:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setFitMode('mobile-390')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
              fitMode === 'mobile-390' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="Khung Mobile 390px"
          >
            <Smartphone className="w-3 h-3" />
            <span className="hidden md:inline">Mobile</span>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Bật toàn màn hình'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
