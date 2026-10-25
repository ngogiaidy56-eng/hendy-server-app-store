/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'ultrawide';
export type ScreenFitMode = 'auto' | 'responsive' | 'desktop-1440' | 'tablet-768' | 'mobile-390';

export interface ScreenDimensions {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  aspectRatio: number;
  scaleFactor: number;
}

export function useScreenFit() {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const height = typeof window !== 'undefined' ? window.innerHeight : 900;
    const breakpoint: Breakpoint =
      width < 640 ? 'mobile' : width < 1024 ? 'tablet' : width < 1600 ? 'desktop' : 'ultrawide';
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    return {
      width,
      height,
      breakpoint,
      isTouch,
      orientation: width >= height ? 'landscape' : 'portrait',
      aspectRatio: width / (height || 1),
      scaleFactor: 1,
    };
  });

  const [fitMode, setFitMode] = useState<ScreenFitMode>('auto');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint: Breakpoint =
      width < 640 ? 'mobile' : width < 1024 ? 'tablet' : width < 1600 ? 'desktop' : 'ultrawide';
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const orientation = width >= height ? 'landscape' : 'portrait';

    let scale = 1;
    if (fitMode === 'desktop-1440' && width < 1440) {
      scale = width / 1440;
    } else if (fitMode === 'tablet-768' && width < 768) {
      scale = width / 768;
    }

    setDimensions({
      width,
      height,
      breakpoint,
      isTouch,
      orientation,
      aspectRatio: width / (height || 1),
      scaleFactor: scale,
    });
  }, [fitMode]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return {
    ...dimensions,
    fitMode,
    setFitMode,
    isFullscreen,
    toggleFullscreen,
  };
}
