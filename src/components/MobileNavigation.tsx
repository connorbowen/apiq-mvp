/**
 * MobileNavigation Component
 * 
 * Provides bottom navigation for mobile devices with touch-friendly interface.
 * Features:
 * - Bottom navigation bar with icons and labels
 * - Active state indicators
 * - Badge support for notifications
 * - Accessibility support
 * - Smooth transitions and animations
 * - Safe area support for modern devices
 * - Responsive design (hidden on desktop)
 * 
 * Usage:
 * <MobileNavigation
 *   activeTab="chat"
 *   onTabChange={(tab) => setActiveTab(tab)}
 * />
 */

'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface MobileNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

/**
 * MobileNavigation Component
 * 
 * Provides bottom navigation for mobile devices with touch-friendly interface.
 * Features:
 * - Bottom navigation bar with icons and labels
 * - Active state indicators
 * - Badge support for notifications
 * - Accessibility support
 * - Smooth transitions and animations
 * - Safe area support for modern devices
 * - Responsive design (hidden on desktop)
 * 
 * Usage:
 * <MobileNavigation
 *   activeTab="chat"
 *   onTabChange={(tab) => setActiveTab(tab)}
 * />
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab = 'chat',
  onTabChange,
  className = '',
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Navigation items for the 3-tab structure (matching desktop)
  const navigationItems: NavigationItem[] = [
    {
      id: 'chat',
      label: 'Chat',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      href: '/dashboard?tab=chat',
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      href: '/dashboard?tab=workflows',
    },
    {
      id: 'connections',
      label: 'Connections',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      href: '/dashboard?tab=connections',
    },
  ];

  const handleTabClick = (item: NavigationItem) => {
    if (onTabChange) {
      onTabChange(item.id);
    }
    
    // Update URL with tab parameter without triggering navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', item.id);
    window.history.replaceState({}, '', url.toString());
  };

  const isActive = (itemId: string) => {
    return activeTab === itemId || (pathname && pathname.includes(`tab=${itemId}`));
  };

  return (
    <nav
      data-testid="mobile-navigation"
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden ${className}`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item)}
            className={`flex flex-col items-center justify-center w-full py-2 px-3 rounded-lg transition-all duration-200 ${
              isActive(item.id)
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            aria-label={`Navigate to ${item.label}`}
            aria-current={isActive(item.id) ? 'page' : undefined}
            data-testid={`mobile-tab-${item.id}`}
          >
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                  aria-label={`${item.badge} notifications`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </div>
      
      {/* Safe area for devices with home indicators */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
};

export default MobileNavigation; 