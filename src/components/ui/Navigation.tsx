import React from 'react';

// Tab Navigation Component
interface TabNavigationProps {
  tabs: Array<{
    id: string;
    label: string;
    href?: string;
    badge?: number;
    disabled?: boolean;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => (
  <nav className={`flex space-x-8 ${className}`} aria-label="Tabs">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => !tab.disabled && onTabChange(tab.id)}
        disabled={tab.disabled}
        className={`
          flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
          ${activeTab === tab.id
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }
          ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-current={activeTab === tab.id ? 'page' : undefined}
        data-testid={`tab-${tab.id}`}
      >
        <span>{tab.label}</span>
        {tab.badge && tab.badge > 0 && (
          <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-full">
            {tab.badge > 99 ? '99+' : tab.badge}
          </span>
        )}
      </button>
    ))}
  </nav>
);

// Breadcrumb Component
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className = ''
}) => (
  <nav className={`flex ${className}`} aria-label="Breadcrumb">
    <ol className="flex items-center space-x-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {index > 0 && (
            <svg className="h-4 w-4 text-gray-400 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.href ? (
            <a
              href={item.href}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-sm font-medium text-gray-900" aria-current="page">
              {item.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  className = ''
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {showInfo && (
        <div className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </div>
      )}
      
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {pageNumbers.map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={typeof page !== 'number'}
            className={`
              px-3 py-2 text-sm font-medium rounded-md
              ${typeof page === 'number'
                ? page === currentPage
                  ? 'text-white bg-indigo-600 border border-indigo-600'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                : 'text-gray-400 cursor-default'
              }
            `}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Mobile Tab Navigation (matches your existing pattern)
interface MobileTabNavigationProps {
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    href: string;
    badge?: number;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const MobileTabNavigation: React.FC<MobileTabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => (
  <nav
    className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden ${className}`}
    role="navigation"
    aria-label="Mobile navigation"
  >
    <div className="flex items-center justify-around px-2 py-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex flex-col items-center justify-center w-full py-2 px-3 rounded-lg transition-all duration-200
            ${activeTab === tab.id
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
          aria-label={`Navigate to ${tab.label}`}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          data-testid={`mobile-tab-${tab.id}`}
        >
          <div className="relative">
            {tab.icon}
            {tab.badge && tab.badge > 0 && (
              <span
                className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                aria-label={`${tab.badge} notifications`}
              >
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
          <span className="text-xs mt-1 font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
    
    {/* Safe area for devices with home indicators */}
    <div className="h-safe-area-inset-bottom bg-white" />
  </nav>
);
