'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface UserDropdownProps {
  user: User;
  onLogout: () => void;
  onHelp?: () => void;
}

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

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    router.push('/dashboard?tab=settings&section=account');
  };

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

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.name;

  return (
    <div className="relative" ref={dropdownRef}>
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

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-dropdown-toggle"
        >
          <div className="py-1" role="none">
            {/* User Info */}
            <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
              <div className="font-medium">{displayName}</div>
              <div className="text-gray-500 truncate">{user.email}</div>
              <div className="text-xs text-gray-400 capitalize">{user.role.toLowerCase()}</div>
            </div>

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