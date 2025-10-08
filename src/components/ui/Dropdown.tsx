import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'right',
  className = '',
  onOpen,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close dropdown when pressing Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        onClose?.();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen) {
      onOpen?.();
    } else {
      onClose?.();
    }
  };

  const alignClasses = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div onClick={handleToggle} className="cursor-pointer">
        {trigger}
      </div>
      
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-56 ${alignClasses} bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// Dropdown Item Component
interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  onClick,
  href,
  disabled = false,
  className = '',
  icon
}) => {
  const baseClasses = 'flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  const content = (
    <>
      {icon && <span className="mr-3">{icon}</span>}
      {children}
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        className={`${baseClasses} ${disabledClasses} ${className}`}
        role="menuitem"
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabledClasses} ${className}`}
      role="menuitem"
    >
      {content}
    </button>
  );
};

// Dropdown Divider
export const DropdownDivider: React.FC = () => (
  <div className="border-t border-gray-100 my-1" />
);

// Dropdown Header
interface DropdownHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DropdownHeader: React.FC<DropdownHeaderProps> = ({
  children,
  className = ''
}) => (
  <div className={`px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider ${className}`}>
    {children}
  </div>
);

// User Dropdown (specific to your use case)
interface UserDropdownProps {
  user: {
    name: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
  onLogout: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  className?: string;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  user,
  onLogout,
  onProfile,
  onSettings,
  onHelp,
  className = ''
}) => {
  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.name;

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  return (
    <Dropdown
      trigger={
        <button className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      }
      className={className}
    >
      <DropdownHeader>Account</DropdownHeader>
      <DropdownItem
        onClick={onProfile}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      >
        Profile
      </DropdownItem>
      <DropdownItem
        onClick={onSettings}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      >
        Settings
      </DropdownItem>
      
      {isAdmin && (
        <>
          <DropdownDivider />
          <DropdownHeader>Administration</DropdownHeader>
          <DropdownItem
            href="/dashboard?tab=settings&section=audit"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            Audit Logs
          </DropdownItem>
        </>
      )}
      
      <DropdownDivider />
      <DropdownItem
        onClick={onHelp}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        Help & Support
      </DropdownItem>
      <DropdownItem
        onClick={onLogout}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        }
      >
        Sign out
      </DropdownItem>
    </Dropdown>
  );
};
