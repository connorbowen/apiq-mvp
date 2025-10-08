import React from 'react';

// Form Group Component
interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  className = ''
}) => (
  <div className={`space-y-4 ${className}`}>
    {children}
  </div>
);

// Form Section Component
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = ''
}) => (
  <div className={`space-y-4 ${className}`}>
    {title && (
      <div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
    )}
    {children}
  </div>
);

// Form Actions Component
interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className = ''
}) => (
  <div className={`flex justify-end space-x-3 pt-6 border-t border-gray-200 ${className}`}>
    {children}
  </div>
);

// Fieldset Component
interface FieldsetProps {
  legend: string;
  children: React.ReactNode;
  className?: string;
}

export const Fieldset: React.FC<FieldsetProps> = ({
  legend,
  children,
  className = ''
}) => (
  <fieldset className={`space-y-4 ${className}`}>
    <legend className="text-sm font-medium text-gray-900">{legend}</legend>
    {children}
  </fieldset>
);

// Form Error Component
interface FormErrorProps {
  error?: string;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({
  error,
  className = ''
}) => {
  if (!error) return null;

  return (
    <div className={`rounded-md bg-red-50 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Form Success Component
interface FormSuccessProps {
  message?: string;
  className?: string;
}

export const FormSuccess: React.FC<FormSuccessProps> = ({
  message,
  className = ''
}) => {
  if (!message) return null;

  return (
    <div className={`rounded-md bg-green-50 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">Success</h3>
          <div className="mt-2 text-sm text-green-700">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Form Help Text Component
interface FormHelpTextProps {
  children: React.ReactNode;
  className?: string;
}

export const FormHelpText: React.FC<FormHelpTextProps> = ({
  children,
  className = ''
}) => (
  <p className={`text-sm text-gray-600 ${className}`}>
    {children}
  </p>
);

// Form Label Component (enhanced version)
interface FormLabelProps {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  htmlFor,
  required = false,
  children,
  className = ''
}) => (
  <label
    htmlFor={htmlFor}
    className={`block text-sm font-medium text-gray-700 ${className}`}
  >
    {children}
    {required && (
      <span className="text-red-500 ml-1" aria-label="required">
        *
      </span>
    )}
  </label>
);

// Form Field Component (wrapper for consistent spacing)
interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  children,
  className = ''
}) => (
  <div className={`space-y-1 ${className}`}>
    {children}
  </div>
);

// Form Grid Component
interface FormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const gridColumns = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
};

export const FormGrid: React.FC<FormGridProps> = ({
  children,
  columns = 2,
  className = ''
}) => (
  <div className={`grid ${gridColumns[columns]} gap-4 ${className}`}>
    {children}
  </div>
);
