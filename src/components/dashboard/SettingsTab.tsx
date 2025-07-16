/**
 * SettingsTab Component
 * 
 * Provides comprehensive settings management with tabbed interface.
 * Features:
 * - API Connections management (integrated from ConnectionsTab)
 * - Secrets management (integrated from SecretsTab)
 * - User account settings and profile management
 * - Application preferences
 * - Progressive disclosure based on user onboarding stage
 * - Mobile responsive design
 * - Accessibility compliance
 * 
 * Usage:
 * <SettingsTab
 *   connections={connections}
 *   secrets={secrets}
 *   user={user}
 *   onConnectionCreated={handleConnectionCreated}
 *   onSecretCreated={handleSecretCreated}
 * />
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import ProgressiveDisclosure from '../ProgressiveDisclosure';
import ProfileTab from './ProfileTab';
import PasswordChangeForm from './PasswordChangeForm';
import ConnectionsTab from './ConnectionsTab';
import SecretsTab from './SecretsTab';

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

const SettingsTab: React.FC<SettingsTabProps> = React.memo(({
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
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('connections');
  const { isFeatureAvailable } = useOnboarding();

  // Check URL for section parameter to set initial active section
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const sectionParam = url.searchParams.get('section');
      if (sectionParam && ['connections', 'secrets', 'account', 'preferences'].includes(sectionParam)) {
        setActiveSection(sectionParam as SettingsSection);
      }
    }
  }, []);

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
  };

  return (
    <div data-testid="settings-tab" className="space-y-6">
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
              <ConnectionsTab
                connections={connections}
                onConnectionCreated={onConnectionCreated || (() => {})}
                onConnectionEdited={onConnectionEdited || (() => {})}
                onConnectionDeleted={onConnectionDeleted || (() => {})}
                onConnectionTested={onConnectionTested || (() => {})}
                onConnectionError={onConnectionError || (() => {})}
              />
            </div>
          </ProgressiveDisclosure>
        )}

        {activeSection === 'secrets' && (
          <ProgressiveDisclosure feature="secrets">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Secrets Management</h3>
              <SecretsTab
                secrets={secrets}
                onSecretCreated={onSecretCreated || (() => {})}
                onSecretError={onSecretError || (() => {})}
              />
            </div>
          </ProgressiveDisclosure>
        )}

        {activeSection === 'account' && (
          <div className="space-y-8">
            <ProfileTab user={user} onProfileUpdated={onConnectionCreated} />
            <PasswordChangeForm onPasswordChanged={onConnectionCreated} />
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
});

SettingsTab.displayName = 'SettingsTab';

export default SettingsTab; 