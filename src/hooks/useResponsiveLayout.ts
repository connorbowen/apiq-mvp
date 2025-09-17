import { useState, useEffect } from 'react';

interface ViewportSize {
  width: number;
  height: number;
}

interface ResponsiveLayoutState {
  viewport: ViewportSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

/**
 * Custom hook for responsive layout management
 * Handles viewport changes and provides responsive state
 */
export function useResponsiveLayout(): ResponsiveLayoutState {
  const [viewport, setViewport] = useState<ViewportSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial viewport
    handleResize();

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isMobile = viewport.width < 640;
  const isTablet = viewport.width >= 640 && viewport.width < 1024;
  const isDesktop = viewport.width >= 1024;
  const orientation = viewport.height > viewport.width ? 'portrait' : 'landscape';

  return {
    viewport,
    isMobile,
    isTablet,
    isDesktop,
    orientation,
  };
}

