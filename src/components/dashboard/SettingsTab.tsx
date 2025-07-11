/**
 * TODO: UX SIMPLIFICATION - SETTINGS TAB PHASE 2.1 IMPLEMENTATION - @connorbowen 2024-12-19
 * 
 * PHASE 2.1: Redesign dashboard layout with 3-tab structure
 * - [ ] Create SettingsTab component
 * - [ ] Integrate ConnectionsTab as a section
 * - [ ] Integrate SecretsTab as a section
 * - [ ] Add user account settings
 * - [ ] Add tests: tests/unit/components/dashboard/SettingsTab.test.tsx
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test settings tab
 * 
 * PHASE 2.2: Progressive disclosure integration
 * - [ ] Show settings sections based on user onboarding stage
 * - [ ] Progressive reveal of advanced settings
 * - [ ] Add tests: tests/unit/components/ProgressiveDisclosure.test.tsx
 * 
 * PHASE 2.4: Guided tour integration
 * - [ ] Add tour steps for settings management
 * - [ ] Add tests: tests/unit/components/GuidedTour.test.tsx
 * 
 * PHASE 3.1: Mobile optimization
 * - [ ] Optimize settings for mobile screens
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test mobile settings
 * 
 * IMPLEMENTATION NOTES:
 * - Create tabbed interface within settings
 * - Integrate existing ConnectionsTab and SecretsTab
 * - Add user account management
 * - Support progressive disclosure of features
 * - Ensure accessibility compliance
 */

'use client';

import React, { useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import ProgressiveDisclosure from '../ProgressiveDisclosure';

type SettingsSection = 'connections' | 'secrets' | 'account' | 'preferences';

interface SettingsTabProps {
  connections: any[];
  secrets: any[];
  user: any;
  onConnectionCreated?: () => void;
  onConnectionEdited?: () => void;
  onConnectionDeleted?: () => void;
  onConnectionTested?: () => void;
  onConnectionError?: (error: string) => void;
  onSecretCreated?: () => void;
  onSecretError?: (error: string) => void;
}

const sectionConfig = {
  connections: {
    label: 'API Connections',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    feature: 'connections',
  },
  secrets: {
    label: 'Secrets',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    feature: 'secrets',
  },
  account: {
    label: 'Account',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    feature: 'account',
  },
  preferences: {
    label: 'Preferences',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    feature: 'preferences',
  },
};

export default function SettingsTab({
  connections,
  secrets,
  user,
  onConnectionCreated,
  onConnectionEdited,
  onConnectionDeleted,
  onConnectionTested,
  onConnectionError,
  onSecretCreated,
  onSecretError,
}: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('connections');
  const { isFeatureAvailable } = useOnboarding();

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
        <p className="text-gray-600">Manage your API connections, secrets, and account preferences.</p>
      </div>

      {/* Settings Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(Object.keys(sectionConfig) as SettingsSection[]).map((section) => {
            const config = sectionConfig[section];
            const isActive = activeSection === section;
            const isAvailable = isFeatureAvailable(config.feature);

            if (!isAvailable) {
              return null;
            }

            return (
              <button
                key={section}
                onClick={() => handleSectionChange(section)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={isActive ? 'text-blue-600' : 'text-gray-500'}>
                  {config.icon}
                </span>
                <span>{config.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="min-h-[400px]">
        {activeSection === 'connections' && (
          <ProgressiveDisclosure feature="connections">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">API Connections</h3>
              {/* TODO: Integrate ConnectionsTab component here */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-500">Connections management will be integrated here</p>
              </div>
            </div>
          </ProgressiveDisclosure>
        )}

        {activeSection === 'secrets' && (
          <ProgressiveDisclosure feature="secrets">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Secrets Management</h3>
              {/* TODO: Integrate SecretsTab component here */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-500">Secrets management will be integrated here</p>
              </div>
            </div>
          </ProgressiveDisclosure>
        )}

        {activeSection === 'account' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Settings</h3>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <input
                    type="text"
                    value={user?.role || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'preferences' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Receive notifications about workflow executions</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-gray-200">
                    <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Auto-save Workflows</h4>
                    <p className="text-sm text-gray-500">Automatically save workflow changes</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-blue-600">
                    <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 