/**
 * UserDropdown Component
 * 
 * A modern, accessible dropdown menu that provides user-specific actions and admin access.
 * Follows best practices by placing admin functions in the user dropdown rather than
 * separate navigation tabs, reducing cognitive load and improving mobile experience.
 * 
 * Features:
 * - User profile display with name, email, and role
 * - Profile settings navigation
 * - Role-based admin/audit access (ADMIN/SUPER_ADMIN only)
 * - Help/support access
 * - Logout functionality
 * - Full keyboard navigation support
 * - Mobile-optimized touch targets
 * - Progressive disclosure of advanced features
 * 
 * Best Practice Implementation:
 * - Follows modern UI patterns (GitHub, Slack, Notion, etc.)
 * - Reduces navigation clutter by moving admin functions to dropdown
 * - Provides contextual access to user-specific actions
 * - Maintains full accessibility compliance
 * - Supports progressive disclosure of advanced features
 * 
 * Usage:
 * <UserDropdown
 *   user={user}
 *   onLogout={handleLogout}
 *   onHelp={() => setShowSupportModal(true)}
 * />
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * User interface for dropdown component
 */
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Props for UserDropdown component
 */
interface UserDropdownProps {
  /** User object containing profile information */
  user: User;
  /** Callback function for logout action */
  onLogout: () => void;
  /** Optional callback function for help/support action */
  onHelp?: () => void;
}

/**
 * UserDropdown Component
 * 
 * A modern, accessible dropdown menu that provides user-specific actions and admin access.
 * Follows best practices by placing admin functions in the user dropdown rather than
 * separate navigation tabs, reducing cognitive load and improving mobile experience.
 * 
 * Features:
 * - User profile display
 * - Profile settings access
 * - Role-based admin/audit access
 * - Help/support access
 * - Logout functionality
 * - Full keyboard navigation support
 * - Mobile-optimized touch targets
 * 
 * @param props - Component props
 * @returns JSX element
 */
export default function UserDropdown({ user, onLogout, onHelp }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown when pressing Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  /**
   * Handle logout action
   */
  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  /**
   * Navigate to profile details
   */
  const handleProfileClick = () => {
    setIsOpen(false);
    router.push('/dashboard?tab=profile');
  };

  /**
   * Navigate to settings (preferences, admin for admins)
   */
  const handleSettingsClick = () => {
    setIsOpen(false);
    router.push('/dashboard?tab=settings&section=preferences');
  };

  /**
   * Navigate to secrets management
   */
  const handleSecretsClick = () => {
    setIsOpen(false);
    router.push('/dashboard?tab=settings&section=secrets');
  };

  /**
   * Navigate to audit logs (admin users only)
   */
  const handleAuditClick = () => {
    setIsOpen(false);
    router.push('/dashboard?tab=settings&section=audit');
  };

  /**
   * Handle help/support action
   */
  const handleHelpClick = () => {
    setIsOpen(false);
    if (onHelp) {
      onHelp();
    } else {
      // Placeholder: open support ticket modal or redirect
      // For now, just log
      // eslint-disable-next-line no-console
      console.log('Help/Support clicked');
      alert('Support ticket modal would open here.');
    }
  };

  // Display name logic: prefer firstName + lastName, fallback to name
  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.name;

  // Check if user has admin privileges
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors min-h-[44px]"
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="user-dropdown-toggle"
      >
        <span className="truncate max-w-[120px]">{displayName}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-dropdown-toggle"
        >
          <div className="py-1" role="none">
            {/* Profile Link */}
            <button
              onClick={handleProfileClick}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
              role="menuitem"
              data-testid="user-dropdown-profile"
            >
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </div>
            </button>

            {/* Settings Link */}
            <button
              onClick={handleSettingsClick}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
              role="menuitem"
              data-testid="user-dropdown-settings"
            >
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </div>
            </button>

            {/* Secrets Link */}
            <button
              onClick={handleSecretsClick}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
              role="menuitem"
              data-testid="user-dropdown-secrets"
            >
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secrets
              </div>
            </button>

            {/* Audit Logs - Only show for admin users */}
            {isAdmin && (
              <button
                onClick={handleAuditClick}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
                role="menuitem"
                data-testid="user-dropdown-audit"
              >
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Audit Log
                </div>
              </button>
            )}

            {/* Help Link */}
            <button
              onClick={handleHelpClick}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
              role="menuitem"
              data-testid="user-dropdown-help"
            >
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 14v.01M16 10h.01M12 18a6 6 0 100-12 6 6 0 000 12z" />
                </svg>
                Help
              </div>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-100 my-1"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
              role="menuitem"
              data-testid="user-dropdown-logout"
            >
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 