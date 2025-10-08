import React from 'react';

// Button variants for consistent styling
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const buttonVariants = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent focus:ring-indigo-500',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 focus:ring-indigo-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent focus:ring-red-500',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent focus:ring-indigo-500'
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[48px]'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = buttonVariants[variant];
  const sizeClasses = buttonSizes[size];
  const widthClasses = fullWidth ? 'w-full' : '';
  
  const classes = `${baseClasses} ${variantClasses} ${sizeClasses} ${widthClasses} ${className}`;

  return (
    <button
      {...props}
      className={classes}
      disabled={disabled || loading}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
      )}
      {!loading && leftIcon && (
        <span className="mr-2">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
};

// Primary Action Button - follows your existing pattern
interface PrimaryActionButtonProps extends Omit<ButtonProps, 'variant'> {
  action: string;
  testId?: string;
}

export const PrimaryActionButton: React.FC<PrimaryActionButtonProps> = ({
  action,
  testId,
  ...props
}) => (
  <Button
    {...props}
    variant="primary"
    data-testid={testId || `primary-action ${action}-btn`}
  />
);

// Secondary Action Button
interface SecondaryActionButtonProps extends Omit<ButtonProps, 'variant'> {
  action: string;
  testId?: string;
}

export const SecondaryActionButton: React.FC<SecondaryActionButtonProps> = ({
  action,
  testId,
  ...props
}) => (
  <Button
    {...props}
    variant="secondary"
    data-testid={testId || `secondary-action ${action}-btn`}
  />
);
