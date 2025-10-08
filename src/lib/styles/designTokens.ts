// Design Tokens for Consistent UI
// This file centralizes all design decisions for consistent styling

export const colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Enhanced text colors for accessibility
  text: {
    primary: '#111827',    // Very dark gray for maximum contrast
    secondary: '#374151',  // Dark gray for good contrast
    tertiary: '#6b7280',  // Medium gray for sufficient contrast
    placeholder: '#6b7280', // Better contrast placeholder
    muted: '#9ca3af',     // Muted text with better contrast
  },
  
  // Input styling
  input: {
    bg: '#ffffff',         // Pure white input background
    border: '#d1d5db',     // Consistent border color
    focus: '#3b82f6',      // Focus ring color
    text: '#111827',       // Dark text for inputs
    placeholder: '#6b7280', // Better contrast placeholder
  },
  
  // Status colors
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
  },
  
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
  },
  
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    600: '#d97706',
  },
  
  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
} as const;

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

export const typography = {
  fontFamily: {
    sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
    mono: ['var(--font-jetbrains-mono)', 'monospace'],
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  }
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: '36px',
      md: '44px',
      lg: '48px',
    },
    padding: {
      sm: '0.375rem 0.75rem',
      md: '0.5rem 1rem',
      lg: '0.75rem 1.5rem',
    }
  },
  
  input: {
    height: {
      sm: '36px',
      md: '44px',
      lg: '48px',
    },
    padding: {
      sm: '0.375rem 0.75rem',
      md: '0.5rem 0.75rem',
      lg: '0.75rem 1rem',
    }
  },
  
  card: {
    padding: {
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
    },
    borderRadius: '0.5rem',
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  }
} as const;

// Utility functions for consistent styling
export const getButtonClasses = (variant: 'primary' | 'secondary' | 'danger' | 'ghost', size: 'sm' | 'md' | 'lg') => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent focus:ring-indigo-500',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 focus:ring-indigo-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent focus:ring-indigo-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]'
  };
  
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
};

export const getInputClasses = (hasError: boolean = false, additionalClasses: string = '') => {
  const baseClasses = 'block w-full rounded-md border px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  const errorClasses = hasError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500';
  
  return `${baseClasses} ${errorClasses} ${additionalClasses}`;
};

export const getCardClasses = (padding: 'sm' | 'md' | 'lg' = 'md', shadow: 'sm' | 'md' | 'lg' = 'sm') => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };
  
  return `bg-white rounded-lg border border-gray-200 ${paddingClasses[padding]} ${shadowClasses[shadow]}`;
};
