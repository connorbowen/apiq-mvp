// Enhanced Form Styling Utilities
// This file provides consistent styling functions for form elements across the application

export const getInputClasses = (hasError: boolean = false, additionalClasses: string = '') => {
  const baseClasses = 'form-field-enhanced';
  const errorClasses = hasError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : '';
  
  return `${baseClasses} ${errorClasses} ${additionalClasses}`.trim();
};

export const getLabelClasses = (additionalClasses: string = '') => {
  return `label-enhanced ${additionalClasses}`.trim();
};

export const getTextareaClasses = (hasError: boolean = false, additionalClasses: string = '') => {
  return getInputClasses(hasError, additionalClasses);
};

export const getSelectClasses = (hasError: boolean = false, additionalClasses: string = '') => {
  return getInputClasses(hasError, additionalClasses);
};

// Enhanced text color utilities
export const getTextClasses = (variant: 'primary' | 'secondary' | 'tertiary' | 'muted' = 'primary') => {
  const textClasses = {
    primary: 'text-enhanced-primary',
    secondary: 'text-enhanced-secondary',
    tertiary: 'text-enhanced-tertiary',
    muted: 'text-enhanced-muted'
  };
  
  return textClasses[variant];
};

// Enhanced button styling
export const getButtonClasses = (variant: 'primary' | 'secondary' | 'danger' = 'primary', size: 'sm' | 'md' | 'lg' = 'md') => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 min-h-[44px]';
  
  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
};

// Enhanced form field wrapper
export const getFormFieldClasses = (additionalClasses: string = '') => {
  return `space-y-1 ${additionalClasses}`.trim();
};

// Enhanced input group styling
export const getInputGroupClasses = (additionalClasses: string = '') => {
  return `space-y-4 ${additionalClasses}`.trim();
};

// Enhanced section styling
export const getSectionClasses = (additionalClasses: string = '') => {
  return `space-y-6 ${additionalClasses}`.trim();
};

// Enhanced modal styling
export const getModalClasses = (additionalClasses: string = '') => {
  return `relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white ${additionalClasses}`.trim();
};

// Enhanced card styling
export const getCardClasses = (additionalClasses: string = '') => {
  return `bg-white shadow rounded-lg p-6 ${additionalClasses}`.trim();
};

// Enhanced table styling
export const getTableClasses = (additionalClasses: string = '') => {
  return `bg-white shadow overflow-hidden sm:rounded-md ${additionalClasses}`.trim();
};

// Enhanced status badge styling
export const getStatusClasses = (status: 'success' | 'warning' | 'error' | 'info' | 'default') => {
  const statusClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    default: 'bg-gray-100 text-gray-800'
  };
  
  return `${statusClasses[status]} px-2 py-1 text-xs font-medium rounded-full`;
};
