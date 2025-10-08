import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  hover?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};

const shadowClasses = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg'
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'sm',
  border = true,
  hover = false
}) => {
  const baseClasses = 'bg-white rounded-lg';
  const paddingClass = paddingClasses[padding];
  const shadowClass = shadowClasses[shadow];
  const borderClass = border ? 'border border-gray-200' : '';
  const hoverClass = hover ? 'hover:shadow-md transition-shadow duration-200' : '';
  
  const classes = `${baseClasses} ${paddingClass} ${shadowClass} ${borderClass} ${hoverClass} ${className}`;

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

// Card Header
interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = ''
}) => (
  <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`}>
    {children}
  </div>
);

// Card Title
interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className = '',
  as: Component = 'h3'
}) => (
  <Component className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </Component>
);

// Card Content
interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = ''
}) => (
  <div className={className}>
    {children}
  </div>
);

// Card Footer
interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = ''
}) => (
  <div className={`border-t border-gray-200 pt-4 mt-4 ${className}`}>
    {children}
  </div>
);
