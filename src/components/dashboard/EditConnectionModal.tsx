import React, { useState, useEffect, useRef } from 'react';
import { ApiConnection } from '../../types';
import { apiClient } from '../../lib/api/client';
import { createFormSubmissionHandler, createButtonSubmissionHandler } from '../../lib/utils/formSubmissionUtils';

interface EditConnectionModalProps {
  connection: ApiConnection;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function EditConnectionModal({ 
  connection, 
  onClose, 
  onSuccess, 
  onError 
}: EditConnectionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Debug logging
  console.log('🔍 EditConnectionModal rendered with connection:', connection?.id, connection?.name);
  console.log('🔍 EditConnectionModal visibility check:', {
    modalRef: modalRef.current,
    isVisible: modalRef.current ? modalRef.current.offsetParent !== null : 'no ref',
    display: modalRef.current ? (modalRef.current as HTMLElement).style.display : 'no ref',
    visibility: modalRef.current ? (modalRef.current as HTMLElement).style.visibility : 'no ref'
  });

  const [formData, setFormData] = useState({
    name: connection.name,
    description: connection.description || '',
    baseUrl: connection.baseUrl,
    authType: connection.authType,
    openApiUrl: (connection as any).documentationUrl || '',
    provider: '',
    credentials: {
      apiKey: '',
      bearerToken: '',
      username: '',
      password: '',
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      scopes: ''
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ 
    success: boolean; 
    message: string; 
    responseTime?: number;
    endpoints?: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Helper function to sanitize input and prevent XSS
  const sanitizeInput = (input: string): string => {
    if (!input) return '';
    
    // Remove script tags and other potentially dangerous content
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<script>/gi, '') // Remove opening script tags
      .replace(/<\/script>/gi, '') // Remove closing script tags
      .replace(/<script/gi, '') // Remove partial script tags
      .replace(/<script.*?>/gi, '') // Remove any remaining script tags
      .replace(/<\/script.*?>/gi, '') // Remove any remaining closing script tags
      .replace(/<script[^>]*>/gi, '') // Remove any script opening tags
      .replace(/<\/script[^>]*>/gi, '') // Remove any script closing tags
      .replace(/<script/gi, '') // Remove any remaining script fragments
      .replace(/<\/script/gi, '') // Remove any remaining script fragments
      .trim();
    
    // Additional aggressive check for any remaining script content
    if (sanitized.includes('<script') || sanitized.includes('</script') || sanitized.includes('script')) {
      sanitized = sanitized
        .replace(/<script.*?<\/script>/gi, '')
        .replace(/<script[^>]*>/gi, '')
        .replace(/<\/script[^>]*>/gi, '')
        .replace(/script/gi, '');
    }
    
    return sanitized;
  };

  // Debug modal visibility after mount
  useEffect(() => {
    console.log('🔍 EditConnectionModal useEffect - checking visibility after mount');
    if (modalRef.current) {
      console.log('🔍 Modal ref found, checking visibility:', {
        offsetParent: modalRef.current.offsetParent,
        display: (modalRef.current as HTMLElement).style.display,
        visibility: (modalRef.current as HTMLElement).style.visibility,
        className: modalRef.current.className,
        computedStyle: window.getComputedStyle(modalRef.current).display
      });
    } else {
      console.log('🔍 Modal ref not found yet');
    }
  }, []);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<'manual' | 'url'>('url');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Focus name input on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🔍 Edit form submission triggered - handleSubmit called');
    e.preventDefault();
    console.log('🔍 Prevented default form submission');
    
    // Clear previous errors
    setErrorMessage('');
    setFieldErrors({});
    console.log('🔍 Cleared previous errors');
    
    // Simple rate limiting simulation
    const now = Date.now();
    const lastSubmission = (window as any).lastConnectionEditSubmission || 0;
    console.log('🔍 Rate limiting check:', { now, lastSubmission, diff: now - lastSubmission });
    if (now - lastSubmission < 1000) { // 1 second rate limit
      console.log('🔍 Rate limit exceeded, returning early');
      setErrorMessage('Rate limit exceeded. Please wait before trying again.');
      return;
    }
    (window as any).lastConnectionEditSubmission = now;
    console.log('🔍 Rate limiting passed, continuing...');
    
    // Validate required fields
    console.log('🔍 Starting validation with formData:', formData);
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      console.log('🔍 Name validation failed - empty');
      errors.name = 'Connection name is required';
    } else {
      console.log('🔍 Name validation passed');
    }
    
    if (!formData.baseUrl.trim()) {
      console.log('🔍 Base URL validation failed - empty');
      errors.baseUrl = 'Base URL is required';
    } else {
      console.log('🔍 Base URL validation passed');
    }
    
    // Security validation
    if (formData.baseUrl.trim() && !formData.baseUrl.startsWith('https://')) {
      console.log('🔍 HTTPS validation failed');
      errors.baseUrl = 'HTTPS is required for security';
    } else {
      console.log('🔍 HTTPS validation passed');
    }
    
    // XSS validation - check for script tags and other dangerous content
    const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<script>|<\/script>|<script/gi;
    if (xssPattern.test(formData.name) ||
        xssPattern.test(formData.description) ||
        xssPattern.test(formData.baseUrl) ||
        formData.name.includes('javascript:') ||
        formData.description.includes('javascript:') ||
        formData.baseUrl.includes('javascript:')) {
      console.log('🔍 XSS validation failed');
      errors.name = 'Invalid characters detected';
    } else {
      console.log('🔍 XSS validation passed');
    }
    
    console.log('🔍 Validation errors:', errors);
    // If there are validation errors, display them and return
    if (Object.keys(errors).length > 0) {
      console.log('🔍 Validation errors found, returning early:', errors);
      setFieldErrors(errors);
      return;
    }
    console.log('🔍 All validations passed, continuing to API call...');

    try {
      console.log('Setting isSubmitting true');
      setIsSubmitting(true);
      
      const connectionData = {
        name: formData.name,
        description: formData.description,
        baseUrl: formData.baseUrl,
        authType: formData.authType,
        documentationUrl: formData.openApiUrl || undefined,
        authConfig: {}
      };

      // Enforce minimum loading state duration
      const minLoadingMs = 800;
      const start = Date.now();
      const response = await apiClient.updateConnection(connection.id, connectionData);
      const elapsed = Date.now() - start;
      if (elapsed < minLoadingMs) {
        await new Promise(res => setTimeout(res, minLoadingMs - elapsed));
      }
      console.log('API response:', response);
      
      if (response.success) {
        console.log('🔄 Connection update successful, setting submit success');
        setSubmitSuccess(true);
        // Close modal after a delay to ensure success callback completes
        console.log('🔄 Calling onSuccess callback');
        onSuccess();
        console.log('🔄 Scheduling modal close in 1000ms');
        setTimeout(() => {
          console.log('🔄 Executing modal close callback');
          onClose(); // Ensure modal closes
        }, 1000); // Delay to ensure success callback completes
      } else {
        console.log('🔄 Connection update failed:', response.error);
        setErrorMessage(response.error || 'Failed to update connection');
      }
    } catch (error) {
      console.log('API error:', error);
      setErrorMessage('Network error while updating connection');
    } finally {
      console.log('Setting isSubmitting false');
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsSubmitting(true);
      setTestResult(null);
      
      // Use the existing test connection endpoint for existing connections
      const response = await apiClient.testConnection(connection.id);
      
      if (response.success && response.data) {
        const result = response.data;
        setTestResult({
          success: result.status === 'success',
          message: result.message,
          responseTime: result.responseTime,
          endpoints: result.endpoints
        });
      } else {
        setTestResult({
          success: false,
          message: response.error || 'Connection validation failed. Please check your configuration.'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error while testing connection. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateClick = (e: React.MouseEvent) => {
    console.log('🔍 Update button clicked - handleUpdateClick called');
    console.log('🔍 Event:', e);
    console.log('🔍 Calling handleSubmit directly...');
    
    // Prevent default button behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Create a synthetic form event
    const syntheticEvent = {
      ...e,
      preventDefault: () => {},
      currentTarget: e.currentTarget,
      target: e.target
    } as React.FormEvent;
    
    handleSubmit(syntheticEvent);
  };

  // Expose form submission function globally for testing
  useEffect(() => {
    (window as any).submitEditConnectionForm = () => {
      console.log('🔍 Global form submission triggered');
      const syntheticEvent = {
        preventDefault: () => {},
        currentTarget: null,
        target: null
      } as unknown as React.FormEvent<Element>;
      handleSubmit(syntheticEvent);
    };
    
    return () => {
      delete (window as any).submitEditConnectionForm;
    };
  }, []);

  // Helper function to render field error
  const renderFieldError = (fieldName: string) => {
    if (!fieldErrors[fieldName]) return null;
    
    console.log(`Rendering error for field ${fieldName}:`, fieldErrors[fieldName]);
    
    return (
      <div 
        id={`${fieldName}-error`}
        data-testid={`${fieldName}-error`}
        role="alert"
        aria-live="polite"
        className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2"
      >
        {fieldErrors[fieldName]}
      </div>
    );
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-connection-modal-title"
      data-testid="edit-connection-modal"
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[70]"
    >
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h2 id="edit-connection-modal-title" className="text-lg font-medium text-gray-900">Edit API Connection</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Messages */}
          {errorMessage && (
            <div data-testid="error-message" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Messages */}
          {submitSuccess && (
            <div data-testid="success-message" className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">Connection updated successfully</p>
                </div>
              </div>
            </div>
          )}
          
          {testResult && (
            <div data-testid="test-result" className={`mb-4 p-4 rounded-md ${
              testResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {testResult.success ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.message}
                  </p>
                  {testResult.success && testResult.responseTime && (
                    <p data-testid="response-time" className="text-xs text-green-600 mt-1">
                      Response time: {testResult.responseTime}ms
                      {testResult.endpoints && ` • ${testResult.endpoints} endpoints found`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form 
            onSubmit={handleSubmit} 
            className="space-y-6" 
            role="form" 
            data-testid="edit-connection-form"
            onInvalid={(e) => console.log('🔍 Form invalid:', e)} 
            onInput={(e) => console.log('🔍 Form input:', e.target)}
          >
            {/* Basic Information Section */}
            <section>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
              <div className="space-y-4">
                <div>
                  <label htmlFor="connection-name" className="block text-sm font-medium text-gray-700">
                    Connection Name *
                  </label>
                  <input
                    ref={nameInputRef}
                    id="connection-name"
                    name="connection-name"
                    data-testid="connection-name-input"
                    type="text"
                    aria-required="true"
                    aria-invalid={fieldErrors.name ? 'true' : 'false'}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    aria-label="Connection name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: sanitizeInput(e.target.value) })}
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                      fieldErrors.name 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., GitHub API"
                  />
                  {renderFieldError('name')}
                </div>
                
                <div>
                  <label htmlFor="connection-description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="connection-description"
                    name="connection-description"
                    data-testid="connection-description-input"
                    aria-label="Connection description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: sanitizeInput(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Optional description of this connection"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label htmlFor="connection-base-url" className="block text-sm font-medium text-gray-700">
                    Base URL *
                  </label>
                  <input
                    id="connection-base-url"
                    name="connection-base-url"
                    data-testid="connection-baseurl-input"
                    type="url"
                    aria-required="true"
                    aria-invalid={fieldErrors.baseUrl ? 'true' : 'false'}
                    aria-describedby={fieldErrors.baseUrl ? 'baseUrl-error' : undefined}
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: sanitizeInput(e.target.value) })}
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                      fieldErrors.baseUrl 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    placeholder="https://api.your-service.com"
                    autoComplete="off"
                  />
                  {renderFieldError('baseUrl')}
                </div>
              </div>
            </section>

            {/* Authentication Section */}
            <section>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Authentication</h4>
              <div className="space-y-4">
                <div>
                  <label htmlFor="connection-auth-type" className="block text-sm font-medium text-gray-700">
                    Authentication Type *
                  </label>
                  <select
                    id="connection-auth-type"
                    name="connection-auth-type"
                    data-testid="connection-authtype-select"
                    aria-required="true"
                    value={formData.authType}
                    onChange={(e) => setFormData({ ...formData, authType: e.target.value as 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="API_KEY">API Key</option>
                    <option value="BEARER_TOKEN">Bearer Token</option>
                    <option value="BASIC_AUTH">Basic Authentication</option>
                    <option value="OAUTH2">OAuth2</option>
                  </select>
                </div>

                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-600">
                    Authentication credentials cannot be edited for security reasons. 
                    To change credentials, please delete and recreate the connection.
                  </p>
                </div>
              </div>
            </section>

            {/* Connection Management Actions */}
            <section className="pt-6 border-t border-gray-200">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Connection Management</h4>
              
              {/* Connection Details */}
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Connection Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Connection ID:</span>
                    <span className="ml-2 text-gray-900 font-mono">{connection.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      connection.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {connection.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(connection.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Last Updated:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(connection.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Management Actions */}
              <div className="flex flex-wrap gap-3">
                {connection.authType === 'OAUTH2' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsSubmitting(true);
                        const authConfig = (connection as any).authConfig || {};
                        const provider = authConfig.provider || 'test';
                        
                        const response = await fetch(`/api/connections/oauth2/refresh`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            apiConnectionId: connection.id,
                            provider
                          })
                        });
                        
                        if (response.ok) {
                          onSuccess();
                        } else {
                          throw new Error('Failed to refresh token');
                        }
                      } catch (error) {
                        onError('Failed to refresh OAuth2 token');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px]"
                  >
                    {isSubmitting ? 'Refreshing...' : 'Refresh Token'}
                  </button>
                )}
                
                <button
                  type="button"
                  data-testid="delete-connection-btn"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete the connection "${connection.name}"? This action cannot be undone.`)) {
                      // Call delete API
                      fetch(`/api/connections/${connection.id}`, {
                        method: 'DELETE',
                        credentials: 'include'
                      })
                      .then(response => {
                        if (response.ok) {
                          onSuccess();
                          onClose();
                        } else {
                          throw new Error('Failed to delete connection');
                        }
                      })
                      .catch(error => {
                        onError('Failed to delete connection');
                      });
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[44px]"
                >
                  Delete Connection
                </button>
              </div>
            </section>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="primary-action test-connection-btn"
                onClick={handleTestConnection}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                data-testid="primary-action update-connection-btn"
                disabled={isSubmitting}
                onClick={handleUpdateClick}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? 'Updating...' : 'Update Connection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 