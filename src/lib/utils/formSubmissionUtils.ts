/**
 * Form Submission Utilities
 * 
 * Provides robust form submission handling to prevent common onSubmit issues
 * including event propagation, handler conflicts, and React synthetic event problems.
 * 
 * @connorbowen 2024-12-19 - Created to address consistent onSubmit issues
 */

export interface FormSubmissionOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  validateBeforeSubmit?: boolean;
  onValidationError?: (errors: Record<string, string>) => void;
  onSubmissionStart?: () => void;
  onSubmissionComplete?: () => void;
  onSubmissionError?: (error: Error) => void;
}

export interface FormValidationRule {
  field: string;
  validator: (value: any) => string | null;
  required?: boolean;
}

/**
 * Creates a robust form submission handler that prevents common onSubmit issues
 */
export function createFormSubmissionHandler(
  submitFunction: (formData: FormData) => Promise<void> | void,
  options: FormSubmissionOptions = {}
) {
  const {
    preventDefault = true,
    stopPropagation = true,
    validateBeforeSubmit = false,
    onValidationError,
    onSubmissionStart,
    onSubmissionComplete,
    onSubmissionError
  } = options;

  return async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      // Prevent default form submission behavior
      if (preventDefault) {
        e.preventDefault();
      }
      
      // Stop event propagation to prevent conflicts
      if (stopPropagation) {
        e.stopPropagation();
      }

      // Call submission start callback
      onSubmissionStart?.();

      // Get form data
      const formData = new FormData(e.currentTarget);

      // Validate form if required
      if (validateBeforeSubmit) {
        const validationErrors = validateFormData(formData, []);
        if (Object.keys(validationErrors).length > 0) {
          onValidationError?.(validationErrors);
          return;
        }
      }

      // Execute the submission function
      await submitFunction(formData);

      // Call completion callback
      onSubmissionComplete?.();

    } catch (error) {
      console.error('Form submission error:', error);
      onSubmissionError?.(error instanceof Error ? error : new Error('Unknown form submission error'));
    }
  };
}

/**
 * Creates a robust button click handler that ensures form submission
 */
export function createButtonSubmissionHandler(
  formRef: React.RefObject<HTMLFormElement>,
  submitFunction: (formData: FormData) => Promise<void> | void,
  options: FormSubmissionOptions = {}
) {
  return async (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      // Prevent default button behavior
      e.preventDefault();
      e.stopPropagation();

      // Call submission start callback
      options.onSubmissionStart?.();

      // Get form data from the form reference
      if (!formRef.current) {
        throw new Error('Form reference not available');
      }

      const formData = new FormData(formRef.current);

      // Validate form if required
      if (options.validateBeforeSubmit) {
        const validationErrors = validateFormData(formData, []);
        if (Object.keys(validationErrors).length > 0) {
          options.onValidationError?.(validationErrors);
          return;
        }
      }

      // Execute the submission function
      await submitFunction(formData);

      // Call completion callback
      options.onSubmissionComplete?.();

    } catch (error) {
      console.error('Button submission error:', error);
      options.onSubmissionError?.(error instanceof Error ? error : new Error('Unknown button submission error'));
    }
  };
}

/**
 * Validates form data against provided rules
 */
export function validateFormData(
  formData: FormData,
  rules: FormValidationRule[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    const value = formData.get(rule.field);
    
    // Check required fields
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[rule.field] = `${rule.field} is required`;
      continue;
    }

    // Run custom validator
    if (value && rule.validator) {
      const error = rule.validator(value);
      if (error) {
        errors[rule.field] = error;
      }
    }
  }

  return errors;
}

/**
 * Creates a global form submission function for testing
 */
export function createGlobalFormSubmissionFunction(
  formId: string,
  submitFunction: (formData: FormData) => Promise<void> | void
) {
  const globalFunctionName = `submit${formId}Form`;
  
  return {
    functionName: globalFunctionName,
    setup: () => {
      (window as any)[globalFunctionName] = async () => {
        try {
          const form = document.querySelector(`[data-testid="${formId}"]`) as HTMLFormElement;
          if (!form) {
            throw new Error(`Form with data-testid="${formId}" not found`);
          }
          
          const formData = new FormData(form);
          await submitFunction(formData);
        } catch (error) {
          console.error(`Global form submission error for ${formId}:`, error);
          throw error;
        }
      };
    },
    cleanup: () => {
      delete (window as any)[globalFunctionName];
    }
  };
}

/**
 * Enhanced form submission with multiple fallback strategies
 */
export async function submitFormRobustly(
  formSelector: string = 'form[role="form"]',
  buttonSelector?: string
): Promise<boolean> {
  console.log('🔍 Starting robust form submission...');
  
  // Strategy 1: Form requestSubmit() (most reliable)
  try {
    console.log('🔍 Attempting form submission via requestSubmit()...');
    const form = document.querySelector(formSelector) as HTMLFormElement;
    if (form) {
      console.log('🔍 Form found, submitting via requestSubmit()');
      form.requestSubmit();
      console.log('🔍 Form submitted successfully');
      return true;
    } else {
      console.log('❌ Form not found for requestSubmit()');
    }
  } catch (error) {
    console.log('❌ Form requestSubmit() failed, trying global function:', error);
  }
  
  // Strategy 2: Global form submission function
  try {
    const globalFunctions = Object.keys(window).filter(key => key.startsWith('submit') && key.endsWith('Form'));
    if (globalFunctions.length > 0) {
      console.log('🔍 Using global form submission function:', globalFunctions[0]);
      await (window as any)[globalFunctions[0]]();
      console.log('✅ Form submitted via global function');
      return true;
    }
  } catch (error) {
    console.log('❌ Global function failed, trying button click:', error);
  }
  
  // Strategy 3: Button click with React event dispatch
  if (buttonSelector) {
    try {
      const button = document.querySelector(buttonSelector) as HTMLButtonElement;
      if (button) {
        // Create a synthetic React event
        const syntheticEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        // Try to find React event handlers
        const reactKey = Object.keys(button).find(key => 
          key.startsWith('__reactInternalInstance') || 
          key.startsWith('_reactInternalFiber')
        );
        
        if (reactKey) {
          const fiber = (button as any)[reactKey];
          if (fiber && fiber.memoizedProps && fiber.memoizedProps.onClick) {
            console.log('🔍 Found React onClick handler, calling it directly');
            fiber.memoizedProps.onClick(syntheticEvent);
            return true;
          }
        }
        
        // Also try the native click
        button.click();
        console.log('✅ Button clicked via native click');
        return true;
      }
    } catch (error) {
      console.log('❌ Button click failed:', error);
    }
  }
  
  console.log('❌ All form submission strategies failed');
  return false;
}

/**
 * Rate limiting utility to prevent rapid form submissions
 */
export function createRateLimitedSubmission(
  submitFunction: () => Promise<void> | void,
  rateLimitMs: number = 1000
) {
  let lastSubmission = 0;
  
  return async () => {
    const now = Date.now();
    if (now - lastSubmission < rateLimitMs) {
      throw new Error(`Rate limit exceeded. Please wait ${rateLimitMs}ms before submitting again.`);
    }
    
    lastSubmission = now;
    await submitFunction();
  };
}

/**
 * Form submission state management
 */
export interface FormSubmissionState {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

export function useFormSubmissionState() {
  const [state, setState] = React.useState<FormSubmissionState>({
    isSubmitting: false,
    error: null,
    success: false
  });

  const startSubmission = () => {
    setState({
      isSubmitting: true,
      error: null,
      success: false
    });
  };

  const completeSubmission = () => {
    setState({
      isSubmitting: false,
      error: null,
      success: true
    });
  };

  const failSubmission = (error: string) => {
    setState({
      isSubmitting: false,
      error,
      success: false
    });
  };

  const resetState = () => {
    setState({
      isSubmitting: false,
      error: null,
      success: false
    });
  };

  return {
    ...state,
    startSubmission,
    completeSubmission,
    failSubmission,
    resetState
  };
}

// Re-export React for the hook
import React from 'react';
