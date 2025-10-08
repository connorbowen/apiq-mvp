import React from 'react';

// Container component for consistent max-width and padding
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
}

const containerSizes = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full'
};

export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  size = 'lg',
  padding = true
}) => {
  const sizeClass = containerSizes[size];
  const paddingClass = padding ? 'px-4 sm:px-6 lg:px-8' : '';
  
  return (
    <div className={`mx-auto ${sizeClass} ${paddingClass} ${className}`}>
      {children}
    </div>
  );
};

// Grid system for consistent layouts
interface GridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg';
  responsive?: boolean;
}

const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  12: 'grid-cols-12'
};

const gridGaps = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8'
};

export const Grid: React.FC<GridProps> = ({
  children,
  className = '',
  cols = 3,
  gap = 'md',
  responsive = true
}) => {
  const colsClass = responsive ? gridCols[cols] : `grid-cols-${cols}`;
  const gapClass = gridGaps[gap];
  
  return (
    <div className={`grid ${colsClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
};

// Flex utilities for consistent spacing
interface FlexProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  wrap?: boolean;
  gap?: 'sm' | 'md' | 'lg';
}

const flexDirections = {
  row: 'flex-row',
  col: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'col-reverse': 'flex-col-reverse'
};

const flexJustify = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
};

const flexAlign = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch'
};

const flexGaps = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6'
};

export const Flex: React.FC<FlexProps> = ({
  children,
  className = '',
  direction = 'row',
  justify = 'start',
  align = 'start',
  wrap = false,
  gap = 'md'
}) => {
  const directionClass = flexDirections[direction];
  const justifyClass = flexJustify[justify];
  const alignClass = flexAlign[align];
  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';
  const gapClass = flexGaps[gap];
  
  return (
    <div className={`flex ${directionClass} ${justifyClass} ${alignClass} ${wrapClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
};

// Spacing component for consistent vertical rhythm
interface SpacingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const spacingSizes = {
  xs: 'h-1',      // 4px
  sm: 'h-2',      // 8px
  md: 'h-4',      // 16px
  lg: 'h-6',      // 24px
  xl: 'h-8',      // 32px
  '2xl': 'h-12'   // 48px
};

export const Spacing: React.FC<SpacingProps> = ({
  size = 'md',
  className = ''
}) => (
  <div className={`${spacingSizes[size]} ${className}`} />
);

// Section component for consistent page sections
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  background?: 'white' | 'gray' | 'transparent';
}

const sectionPadding = {
  none: '',
  sm: 'py-4',
  md: 'py-8',
  lg: 'py-12'
};

const sectionBackground = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  transparent: 'bg-transparent'
};

export const Section: React.FC<SectionProps> = ({
  children,
  className = '',
  padding = 'md',
  background = 'white'
}) => {
  const paddingClass = sectionPadding[padding];
  const backgroundClass = sectionBackground[background];
  
  return (
    <section className={`${paddingClass} ${backgroundClass} ${className}`}>
      {children}
    </section>
  );
};
