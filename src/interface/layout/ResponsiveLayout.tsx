/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode } from 'react';
import { ScreenFitMode, Breakpoint } from '../responsive/useScreenFit.ts';

interface ResponsiveLayoutProps {
  children: ReactNode;
  fitMode: ScreenFitMode;
  breakpoint: Breakpoint;
  scaleFactor?: number;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  fitMode,
  breakpoint,
  scaleFactor = 1,
}) => {
  let containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  };

  let innerClass = 'w-full flex-1 flex flex-col';

  if (fitMode === 'desktop-1440') {
    innerClass += ' max-w-[1440px] mx-auto border-x border-slate-800 shadow-2xl';
  } else if (fitMode === 'tablet-768') {
    innerClass += ' max-w-[768px] mx-auto border-x border-slate-800 shadow-2xl';
  } else if (fitMode === 'mobile-390') {
    innerClass += ' max-w-[390px] mx-auto border-x border-slate-800 shadow-2xl';
  } else {
    // 'auto' mode: full fluid responsive adaptation
    innerClass += ' w-full max-w-full';
  }

  return (
    <div
      style={containerStyle}
      className={`bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white transition-all duration-200 ${
        breakpoint === 'mobile' ? 'text-sm' : ''
      }`}
    >
      <div className={innerClass}>{children}</div>
    </div>
  );
};
