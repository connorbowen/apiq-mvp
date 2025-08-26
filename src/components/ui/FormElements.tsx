import React from 'react';

// Enhanced Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required = false,
  helperText,
  className = '',
  ...props
}) => {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="label-enhanced">
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        aria-required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
        className={`form-field-enhanced ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''} ${className}`}
      />
      {helperText && (
        <p id={helperId} className="text-sm text-gray-600">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Enhanced Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  required = false,
  helperText,
  className = '',
  ...props
}) => {
  const textareaId = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${textareaId}-error` : undefined;
  const helperId = helperText ? `${textareaId}-helper` : undefined;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={textareaId} className="label-enhanced">
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      <textarea
        {...props}
        id={textareaId}
        aria-required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
        className={`form-field-enhanced ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''} ${className}`}
      />
      {helperText && (
        <p id={helperId} className="text-sm text-gray-600">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Enhanced Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  required = false,
  helperText,
  options,
  className = '',
  ...props
}) => {
  const selectId = props.id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText ? `${selectId}-helper` : undefined;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={selectId} className="label-enhanced">
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      <select
        {...props}
        id={selectId}
        aria-required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
        className={`form-field-enhanced ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''} ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && (
        <p id={helperId} className="text-sm text-gray-600">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Enhanced Label Component
interface LabelProps {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({
  htmlFor,
  required = false,
  children,
  className = '',
}) => (
  <label htmlFor={htmlFor} className={`label-enhanced ${className}`}>
    {children}
    {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
  </label>
);

// Enhanced Form Field Wrapper
interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  children,
  className = '',
}) => (
  <div className={`space-y-1 ${className}`}>
    {children}
  </div>
);
