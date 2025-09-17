'use client';

import { useEffect } from 'react';

/**
 * ResponsiveLayoutHandler Component
 * 
 * Handles dynamic viewport changes and updates CSS custom properties
 * to ensure the dashboard layout responds properly to screen size changes.
 */
export default function ResponsiveLayoutHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      const vw = window.innerWidth * 0.01;
      
      // Update CSS custom properties for dynamic height calculation
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--vw', `${vw}px`);
      document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      document.documentElement.style.setProperty('--viewport-width', `${window.innerWidth}px`);
      
      // Update dashboard container height
      const dashboardContainer = document.querySelector('.dashboard-container') as HTMLElement;
      if (dashboardContainer) {
        const headerHeight = 80; // Should match --header-height in CSS
        const availableHeight = window.innerHeight - headerHeight;
        dashboardContainer.style.setProperty('--available-height', `${availableHeight}px`);
        
        // Debug logging
        console.log('🔄 ResponsiveLayoutHandler: Viewport updated', {
          width: window.innerWidth,
          height: window.innerHeight,
          availableHeight,
          vh: `${vh}px`,
          vw: `${vw}px`
        });
      } else {
        console.warn('⚠️ ResponsiveLayoutHandler: Dashboard container not found');
      }
    };

    // Set initial values
    updateViewportHeight();

    // Add event listeners
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', () => {
      // Delay to ensure the orientation change is complete
      setTimeout(updateViewportHeight, 100);
    });

    // Handle mobile browser address bar changes
    window.addEventListener('scroll', updateViewportHeight);
    window.addEventListener('touchstart', updateViewportHeight, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      window.removeEventListener('scroll', updateViewportHeight);
      window.removeEventListener('touchstart', updateViewportHeight);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
