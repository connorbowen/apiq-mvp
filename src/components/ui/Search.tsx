import React from 'react';

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  testId?: string;
}

export const Search: React.FC<SearchProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  onSearch,
  className = '',
  testId = 'search-input'
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <svg 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid={testId}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent form-field-enhanced"
        />
      </div>
    </form>
  );
};

// Filter Select Component
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Filter by...",
  className = '',
  testId = 'filter-select'
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent form-field-enhanced ${className}`}
    data-testid={testId}
  >
    <option value="">{placeholder}</option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// Search and Filter Bar Component
interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    key: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
  }>;
  onClearFilters?: () => void;
  className?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onClearFilters,
  className = ''
}) => (
  <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
    <form className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          testId="search-input"
        />
      </div>

      {/* Filters */}
      {filters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filters.map((filter) => (
            <div key={filter.key}>
              <FilterSelect
                value={filter.value}
                onChange={filter.onChange}
                options={filter.options}
                placeholder={filter.placeholder}
                testId={`filter-${filter.key}`}
              />
            </div>
          ))}
          
          {onClearFilters && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={onClearFilters}
                className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  </div>
);
