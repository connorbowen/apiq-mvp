import React, { useState, useEffect, useRef } from 'react';
import { ApiConnection } from '../../types';
import { apiClient } from '../../lib/api/client';

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
    console.log('Edit form submission triggered');
    e.preventDefault();
    
    // Clear previous errors
    setErrorMessage('');
    setFieldErrors({});
    
    // Simple rate limiting simulation
    const now = Date.now();
    const lastSubmission = (window as any).lastConnectionEditSubmission || 0;
    if (now - lastSubmission < 1000) { // 1 second rate limit
      setErrorMessage('Rate limit exceeded. Please wait before trying again.');
      return;
    }
    (window as any).lastConnectionEditSubmission = now;
    
    // Validate required fields
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Connection name is required';
    }
    
    if (!formData.baseUrl.trim()) {
      errors.baseUrl = 'Base URL is required';
    }
    
    // Security validation
    if (formData.baseUrl.trim() && !formData.baseUrl.startsWith('https://')) {
      errors.baseUrl = 'HTTPS is required for security';
    }
    
    // XSS validation
    if (formData.name.includes('<script>') || formData.name.includes('javascript:')) {
      errors.name = 'Invalid characters detected';
    }
    
    // If there are validation errors, display them and return
    if (Object.keys(errors).length > 0) {
      console.log('Validation errors found:', errors);
      setFieldErrors(errors);
      return;
    }

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
          message: response.error || 'Connection test failed. Please check your configuration.'
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
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
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

          <form onSubmit={handleSubmit} className="space-y-6" role="form">
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
                    data-testid="connection-name-input"
                    type="text"
                    aria-required="true"
                    aria-invalid={fieldErrors.name ? 'true' : 'false'}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    aria-label="Connection name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    data-testid="connection-description-input"
                    aria-label="Connection description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    data-testid="connection-baseurl-input"
                    type="url"
                    aria-required="true"
                    aria-invalid={fieldErrors.baseUrl ? 'true' : 'false'}
                    aria-describedby={fieldErrors.baseUrl ? 'baseUrl-error' : undefined}
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                      fieldErrors.baseUrl 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    placeholder="https://api.example.com"
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
                type="submit"
                data-testid="primary-action update-connection-btn"
                disabled={isSubmitting}
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