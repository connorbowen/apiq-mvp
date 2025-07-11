/**
 * TODO: UX SIMPLIFICATION - MOBILE NAVIGATION PHASE 3.1 IMPLEMENTATION - @connorbowen 2024-12-19
 * 
 * PHASE 3.1: Mobile-optimized navigation
 * - [ ] Create MobileNavigation component
 * - [ ] Implement bottom navigation bar for mobile
 * - [ ] Support 3-tab structure (Chat, Workflows, Settings)
 * - [ ] Add tests: tests/unit/components/MobileNavigation.test.tsx
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test mobile navigation
 * 
 * PHASE 2.1: 3-tab structure integration
 * - [ ] Integrate with new dashboard structure
 * - [ ] Support tab switching in mobile layout
 * - [ ] Add tests: tests/unit/components/MobileNavigation.test.tsx - test tab integration
 * 
 * PHASE 2.2: Progressive disclosure integration
 * - [ ] Show/hide navigation items based on user progress
 * - [ ] Add tests: tests/unit/components/MobileNavigation.test.tsx - test progressive disclosure
 * 
 * IMPLEMENTATION NOTES:
 * - Create bottom navigation bar for mobile screens
 * - Support tab switching with smooth transitions
 * - Ensure accessibility compliance
 * - Add haptic feedback for mobile devices
 * - Support gesture navigation
 */

'use client';

import React from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';

export type MobileTab = 'chat' | 'workflows' | 'settings';

interface MobileNavigationProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  className?: string;
}

const tabConfig = {
  chat: {
    label: 'Create',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    feature: 'chat',
  },
  workflows: {
    label: 'Workflows',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    feature: 'workflows',
  },
  settings: {
    label: 'Settings',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    feature: 'settings',
  },
};

export default function MobileNavigation({ 
  activeTab, 
  onTabChange,
  className = '' 
}: MobileNavigationProps) {
  const { isFeatureAvailable } = useOnboarding();

  const handleTabClick = (tab: MobileTab) => {
    // Add haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onTabChange(tab);
  };

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 ${className}`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around">
        {(Object.keys(tabConfig) as MobileTab[]).map((tab) => {
          const config = tabConfig[tab];
          const isActive = activeTab === tab;
          const isAvailable = isFeatureAvailable(config.feature);
          
          if (!isAvailable) {
            return null;
          }

          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-3 min-h-[44px] transition-colors ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              aria-label={`${config.label} tab`}
              aria-selected={isActive}
              role="tab"
            >
              <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                {config.icon}
              </div>
              <span className="text-xs mt-1 font-medium">
                {config.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Safe area for devices with home indicators */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
} 