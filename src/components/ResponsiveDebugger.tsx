'use client';

import { useState, useEffect } from 'react';

/**
 * ResponsiveDebugger Component
 * 
 * Debug component to help identify responsiveness issues
 * Only shows in development mode
 */
export default function ResponsiveDebugger() {
  const [debugInfo, setDebugInfo] = useState({
    viewport: { width: 0, height: 0 },
    container: { width: 0, height: 0 },
    availableHeight: 0,
    cssVars: {} as Record<string, string>,
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const updateDebugInfo = () => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      const dashboardContainer = document.querySelector('.dashboard-container') as HTMLElement;
      const container = dashboardContainer ? {
        width: dashboardContainer.offsetWidth,
        height: dashboardContainer.offsetHeight,
      } : { width: 0, height: 0 };

      const availableHeight = window.innerHeight - 80;

      const cssVars = {
        '--vh': getComputedStyle(document.documentElement).getPropertyValue('--vh'),
        '--vw': getComputedStyle(document.documentElement).getPropertyValue('--vw'),
        '--viewport-height': getComputedStyle(document.documentElement).getPropertyValue('--viewport-height'),
        '--available-height': getComputedStyle(document.documentElement).getPropertyValue('--available-height'),
      };

      setDebugInfo({
        viewport,
        container,
        availableHeight,
        cssVars,
      });
    };

    updateDebugInfo();
    window.addEventListener('resize', updateDebugInfo);
    window.addEventListener('orientationchange', updateDebugInfo);

    return () => {
      window.removeEventListener('resize', updateDebugInfo);
      window.removeEventListener('orientationchange', updateDebugInfo);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px',
      lineHeight: '1.4',
    }}>
      <div><strong>Responsive Debug Info:</strong></div>
      <div>Viewport: {debugInfo.viewport.width} x {debugInfo.viewport.height}</div>
      <div>Container: {debugInfo.container.width} x {debugInfo.container.height}</div>
      <div>Available: {debugInfo.availableHeight}px</div>
      <div>--vh: {debugInfo.cssVars['--vh']}</div>
      <div>--vw: {debugInfo.cssVars['--vw']}</div>
      <div>--viewport-height: {debugInfo.cssVars['--viewport-height']}</div>
      <div>--available-height: {debugInfo.cssVars['--available-height']}</div>
    </div>
  );
}

