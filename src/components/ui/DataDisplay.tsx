import React from 'react';

// Table Component
interface TableColumn<T = any> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export const Table = <T,>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = ''
}: TableProps<T>) => {
  if (loading) {
    return (
      <div className={`overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg ${className}`}>
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: 3 }).map((_, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg ${className}`}>
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.render ? column.render(item, index) : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// List Component
interface ListItem {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
}

interface ListProps {
  items: ListItem[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const List: React.FC<ListProps> = ({
  items,
  loading = false,
  emptyMessage = 'No items available',
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white p-4 rounded-lg border animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={`bg-white p-4 rounded-lg border hover:shadow-md transition-shadow ${
            item.onClick ? 'cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {item.icon && (
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="text-sm text-gray-500 truncate">
                    {item.subtitle}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
            {item.actions && (
              <div className="flex-shrink-0">
                {item.actions}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Stats Component
interface StatItem {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ReactNode;
}

interface StatsProps {
  stats: StatItem[];
  className?: string;
}

export const Stats: React.FC<StatsProps> = ({
  stats,
  className = ''
}) => (
  <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
    {stats.map((stat, index) => (
      <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {stat.icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {stat.label}
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </div>
                  {stat.change && (
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      stat.change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <svg
                        className={`self-center flex-shrink-0 h-5 w-5 ${
                          stat.change.type === 'increase' ? 'text-green-500' : 'text-red-500'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d={
                            stat.change.type === 'increase'
                              ? 'M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z'
                              : 'M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z'
                          }
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="sr-only">
                        {stat.change.type === 'increase' ? 'Increased' : 'Decreased'} by
                      </span>
                      {Math.abs(stat.change.value)}%
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeVariants = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800'
};

const badgeSizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base'
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => (
  <span className={`inline-flex items-center rounded-full font-medium ${badgeVariants[variant]} ${badgeSizes[size]} ${className}`}>
    {children}
  </span>
);
