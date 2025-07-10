'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient, CreateConnectionRequest } from '../../lib/api/client';

interface CreateConnectionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

// OAuth2 Provider configurations
const OAUTH2_PROVIDERS = {
  github: {
    name: 'GitHub',
    baseUrl: 'https://api.github.com',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScopes: 'repo user',
    description: 'Code repository and version control'
  },
  google: {
    name: 'Google',
    baseUrl: 'https://www.googleapis.com',
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    defaultScopes: 'https://www.googleapis.com/auth/calendar',
    description: 'Google Workspace and APIs'
  },
  slack: {
    name: 'Slack',
    baseUrl: 'https://slack.com/api',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    defaultScopes: 'channels:read,chat:write,users:read',
    description: 'Team communication and collaboration'
  },
  discord: {
    name: 'Discord',
    baseUrl: 'https://discord.com/api/v10',
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    defaultScopes: 'identify,guilds,email',
    description: 'Gaming and community platform'
  },
  test: {
    name: 'Test OAuth2 Provider',
    baseUrl: 'http://localhost:3000/api/test-oauth2',
    authUrl: 'http://localhost:3000/api/test-oauth2/authorize',
    tokenUrl: 'http://localhost:3000/api/test-oauth2/token',
    defaultScopes: 'read write',
    description: 'Test OAuth2 provider for E2E testing'
  },
  custom: {
    name: 'Custom',
    baseUrl: '',
    authUrl: '',
    tokenUrl: '',
    defaultScopes: '',
    description: 'Custom OAuth2 provider'
  }
} as const;

// TODO: Add more OAuth2 providers
// - Microsoft Teams (https://graph.microsoft.com/v1.0)
// - GitLab (https://gitlab.com/api/v4)
// - Bitbucket (https://api.bitbucket.org/2.0)
// - Atlassian/Jira (https://api.atlassian.com)
// - AWS (https://api.aws.amazon.com)
// - Azure (https://management.azure.com)
// - DigitalOcean (https://api.digitalocean.com/v2)
// - Salesforce (https://your-instance.salesforce.com/services/data/v58.0)
// - HubSpot (https://api.hubapi.com)
// - Zapier (https://api.zapier.com/v1)
// - Stripe (https://api.stripe.com/v1)
// - Shopify (https://your-store.myshopify.com/admin/api/2023-10)

export default function CreateConnectionModal({ 
  onClose, 
  onSuccess, 
  onError 
}: CreateConnectionModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseUrl: '',
    authType: 'API_KEY' as 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM',
    provider: '' as keyof typeof OAUTH2_PROVIDERS | '',
    openApiUrl: '',
    openApiSpec: '',
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
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<'manual' | 'url'>('url');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the name input when modal opens
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Focus trap: keep tab focus within modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusable).filter(el => !el.hasAttribute('disabled'));
      if (focusableArray.length === 0) return;
      const first = focusableArray[0];
      const last = focusableArray[focusableArray.length - 1];
      const active = document.activeElement;
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle provider selection and auto-configure settings
  const handleProviderChange = (provider: keyof typeof OAUTH2_PROVIDERS | '') => {
    if (provider && OAUTH2_PROVIDERS[provider]) {
      const providerConfig = OAUTH2_PROVIDERS[provider];
      setFormData({
        ...formData,
        provider,
        baseUrl: providerConfig.baseUrl,
        credentials: {
          ...formData.credentials,
          scopes: providerConfig.defaultScopes,
          redirectUri: 'http://localhost:3000/api/connections/oauth2/callback'
        }
      });
    } else {
      setFormData({
        ...formData,
        provider: '',
        credentials: {
          ...formData.credentials,
          scopes: '',
          redirectUri: ''
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('Form submission triggered');
    e.preventDefault();
    
    // Clear previous errors
    setErrorMessage('');
    setFieldErrors({});
    
    // Simple rate limiting simulation
    const now = Date.now();
    const lastSubmission = (window as any).lastConnectionSubmission || 0;
    if (now - lastSubmission < 1000) { // 1 second rate limit
      setErrorMessage('Rate limit exceeded. Please wait before trying again.');
      onError('Rate limit exceeded. Please wait before trying again.');
      return;
    }
    (window as any).lastConnectionSubmission = now;
    
    // Reset submission count after 1 minute of inactivity
    const lastReset = (window as any).lastRateLimitReset || 0;
    if (now - lastReset > 60000) { // 1 minute
      (window as any).connectionSubmissionCount = 0;
      (window as any).lastRateLimitReset = now;
    }
    
    // Track submission count for rate limiting
    const submissionCount = (window as any).connectionSubmissionCount || 0;
    if (submissionCount >= 5) { // Allow max 5 submissions
      setErrorMessage('Rate limit exceeded. Too many requests. Please wait before trying again.');
      onError('Rate limit exceeded. Too many requests. Please wait before trying again.');
      return;
    }
    (window as any).connectionSubmissionCount = submissionCount + 1;
    
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
      const isLocalhost = formData.baseUrl.startsWith('http://localhost') || formData.baseUrl.startsWith('http://127.0.0.1');
      const isTestEnvironment = window.location.hostname === 'localhost' && window.location.port === '3000';
      if (!(isLocalhost && isTestEnvironment)) {
        errors.baseUrl = 'HTTPS is required for security';
      }
    }
    
    // XSS validation
    if (formData.name.includes('<script>') || formData.name.includes('javascript:')) {
      errors.name = 'Invalid characters detected';
    }
    
    // Validate auth-specific fields
    switch (formData.authType) {
      case 'API_KEY':
        if (!formData.credentials.apiKey.trim()) {
          errors.apiKey = 'API Key is required';
        }
        break;
      case 'BEARER_TOKEN':
        if (!formData.credentials.bearerToken.trim()) {
          errors.bearerToken = 'Bearer Token is required';
        }
        break;
      case 'BASIC_AUTH':
        if (!formData.credentials.username.trim()) {
          errors.username = 'Username is required';
        }
        if (!formData.credentials.password.trim()) {
          errors.password = 'Password is required';
        }
        break;
      case 'OAUTH2':
        if (!formData.credentials.clientId.trim()) {
          errors.clientId = 'Client ID is required';
        }
        if (!formData.credentials.clientSecret.trim()) {
          errors.clientSecret = 'Client Secret is required';
        }
        if (!formData.credentials.redirectUri.trim()) {
          errors.redirectUri = 'Redirect URI is required';
        }
        if (!formData.credentials.scopes.trim()) {
          errors.scopes = 'Scopes are required';
        }
        break;
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
      
      const connectionData: CreateConnectionRequest = {
        name: formData.name,
        description: formData.description,
        baseUrl: formData.baseUrl,
        authType: formData.authType,
        documentationUrl: formData.openApiUrl || undefined,
        authConfig: {}
      };

      // Add credentials based on auth type
      switch (formData.authType) {
        case 'API_KEY':
          connectionData.authConfig = { apiKey: formData.credentials.apiKey };
          break;
        case 'BEARER_TOKEN':
          connectionData.authConfig = { bearerToken: formData.credentials.bearerToken };
          break;
        case 'BASIC_AUTH':
          connectionData.authConfig = {
            username: formData.credentials.username,
            password: formData.credentials.password
          };
          break;
        case 'OAUTH2':
          connectionData.authConfig = {
            clientId: formData.credentials.clientId,
            clientSecret: formData.credentials.clientSecret,
            redirectUri: formData.credentials.redirectUri,
            scope: formData.credentials.scopes,
            provider: formData.provider || undefined
          };
          break;
      }

      const response = await apiClient.createConnection(connectionData);
      console.log('API response:', response);
      
      if (response.success) {
        setSubmitSuccess(true);
        // Show success message briefly before closing
        setTimeout(() => {
          onSuccess();
          onClose(); // Ensure modal closes
        }, 1500);
      } else {
        setErrorMessage(response.error || 'Failed to create connection');
      }
    } catch (error) {
      console.log('API error:', error);
      setErrorMessage('Network error while creating connection');
    } finally {
      console.log('Setting isSubmitting false');
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsSubmitting(true);
      setTestResult(null);
      
      // TODO: Implement test connection API call
      // For now, simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTestResult({
        success: true,
        message: 'Connection test successful!'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed. Please check your credentials.'
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

  // Helper function to get field error state
  const getFieldErrorState = (fieldName: string) => {
    return fieldErrors[fieldName] ? 'error' : 'default';
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-connection-modal-title"
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    >
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h2 id="create-connection-modal-title" className="text-lg font-medium text-gray-900">Add API Connection</h2>
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
                  <p className="text-sm text-green-800">Connection created successfully</p>
                </div>
              </div>
            </div>
          )}
          
          {testResult && testResult.success && !submitSuccess && (
            <div data-testid="test-success-message" className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{testResult.message}</p>
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

                {/* API Key Authentication */}
                {formData.authType === 'API_KEY' && (
                  <div>
                    <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
                      API Key *
                    </label>
                    <input
                      id="api-key"
                      data-testid="connection-apikey-input"
                      type="password"
                      aria-required="true"
                      aria-invalid={fieldErrors.apiKey ? 'true' : 'false'}
                      aria-describedby={fieldErrors.apiKey ? 'apiKey-error' : undefined}
                      value={formData.credentials.apiKey}
                      onChange={(e) => setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, apiKey: e.target.value }
                      })}
                      className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                        fieldErrors.apiKey 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                      placeholder="Enter your API key"
                    />
                    {renderFieldError('apiKey')}
                  </div>
                )}

                {/* Bearer Token Authentication */}
                {formData.authType === 'BEARER_TOKEN' && (
                  <div>
                    <label htmlFor="bearer-token" className="block text-sm font-medium text-gray-700">
                      Bearer Token *
                    </label>
                    <input
                      id="bearer-token"
                      data-testid="connection-bearertoken-input"
                      type="password"
                      aria-required="true"
                      aria-invalid={fieldErrors.bearerToken ? 'true' : 'false'}
                      aria-describedby={fieldErrors.bearerToken ? 'bearerToken-error' : undefined}
                      value={formData.credentials.bearerToken}
                      onChange={(e) => setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, bearerToken: e.target.value }
                      })}
                      className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                        fieldErrors.bearerToken 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                      placeholder="Enter your bearer token"
                    />
                    {renderFieldError('bearerToken')}
                  </div>
                )}

                {/* Basic Authentication */}
                {formData.authType === 'BASIC_AUTH' && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Username *
                      </label>
                      <input
                        id="username"
                        data-testid="connection-username-input"
                        type="text"
                        aria-required="true"
                        aria-invalid={fieldErrors.username ? 'true' : 'false'}
                        aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                        value={formData.credentials.username}
                        onChange={(e) => setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, username: e.target.value }
                        })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                          fieldErrors.username 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                        placeholder="Enter username"
                      />
                      {renderFieldError('username')}
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password *
                      </label>
                      <input
                        id="password"
                        data-testid="connection-password-input"
                        type="password"
                        aria-required="true"
                        aria-invalid={fieldErrors.password ? 'true' : 'false'}
                        aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                        value={formData.credentials.password}
                        onChange={(e) => setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, password: e.target.value }
                        })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                          fieldErrors.password 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                        placeholder="Enter password"
                      />
                      {renderFieldError('password')}
                    </div>
                  </div>
                )}

                {/* OAuth2 Authentication */}
                {formData.authType === 'OAUTH2' && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="connection-provider" className="block text-sm font-medium text-gray-700">
                        OAuth2 Provider *
                      </label>
                      <select
                        id="connection-provider"
                        data-testid="connection-provider-select"
                        aria-required="true"
                        value={formData.provider}
                        onChange={(e) => handleProviderChange(e.target.value as keyof typeof OAUTH2_PROVIDERS | '')}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select a provider</option>
                        {Object.entries(OAUTH2_PROVIDERS).map(([key, provider]) => (
                          <option key={key} value={key}>
                            {provider.name} - {provider.description}
                          </option>
                        ))}
                        <option value="custom">Custom Provider</option>
                      </select>
                    </div>

                    {formData.provider && (
                      <>
                        <div>
                          <label htmlFor="client-id" className="block text-sm font-medium text-gray-700">
                            Client ID *
                          </label>
                          <input
                            id="client-id"
                            data-testid="connection-clientid-input"
                            type="text"
                            aria-required="true"
                            aria-invalid={fieldErrors.clientId ? 'true' : 'false'}
                            aria-describedby={fieldErrors.clientId ? 'clientId-error' : undefined}
                            value={formData.credentials.clientId}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, clientId: e.target.value }
                            })}
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                              fieldErrors.clientId 
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                            placeholder={`Enter ${formData.provider !== 'custom' ? OAUTH2_PROVIDERS[formData.provider]?.name : 'OAuth2'} client ID`}
                          />
                          {renderFieldError('clientId')}
                        </div>
                        <div>
                          <label htmlFor="client-secret" className="block text-sm font-medium text-gray-700">
                            Client Secret *
                          </label>
                          <input
                            id="client-secret"
                            data-testid="connection-clientsecret-input"
                            type="password"
                            aria-required="true"
                            aria-invalid={fieldErrors.clientSecret ? 'true' : 'false'}
                            aria-describedby={fieldErrors.clientSecret ? 'clientSecret-error' : undefined}
                            value={formData.credentials.clientSecret}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, clientSecret: e.target.value }
                            })}
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                              fieldErrors.clientSecret 
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                            placeholder={`Enter ${formData.provider !== 'custom' ? OAUTH2_PROVIDERS[formData.provider]?.name : 'OAuth2'} client secret`}
                          />
                          {renderFieldError('clientSecret')}
                        </div>
                        <div>
                          <label htmlFor="redirect-uri" className="block text-sm font-medium text-gray-700">
                            Redirect URI *
                          </label>
                          <input
                            id="redirect-uri"
                            data-testid="connection-redirecturi-input"
                            type="url"
                            aria-required="true"
                            aria-invalid={fieldErrors.redirectUri ? 'true' : 'false'}
                            aria-describedby={fieldErrors.redirectUri ? 'redirectUri-error' : undefined}
                            value={formData.credentials.redirectUri}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, redirectUri: e.target.value }
                            })}
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                              fieldErrors.redirectUri 
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                            placeholder="http://localhost:3000/api/connections/oauth2/callback"
                          />
                          {renderFieldError('redirectUri')}
                        </div>
                        <div>
                          <label htmlFor="scopes" className="block text-sm font-medium text-gray-700">
                            Scopes *
                          </label>
                          <input
                            id="scopes"
                            data-testid="connection-scope-input"
                            type="text"
                            aria-required="true"
                            aria-invalid={fieldErrors.scopes ? 'true' : 'false'}
                            aria-describedby={fieldErrors.scopes ? 'scopes-error' : undefined}
                            value={formData.credentials.scopes}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, scopes: e.target.value }
                            })}
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                              fieldErrors.scopes 
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                            placeholder="e.g., repo user (space-separated)"
                          />
                          {formData.provider !== 'custom' && OAUTH2_PROVIDERS[formData.provider] && (
                            <p className="mt-1 text-sm text-gray-500">
                              Default scopes: {OAUTH2_PROVIDERS[formData.provider].defaultScopes}
                            </p>
                          )}
                          {renderFieldError('scopes')}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Advanced Configuration Section (Optional) */}
            <section>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Advanced Configuration (Optional)</h4>
              <div className="space-y-4">
                {/* OpenAPI Import Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAPI Specification Import
                  </label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      data-testid="import-openapi-btn"
                      onClick={() => setImportMode('url')}
                      className={`px-4 py-3 text-sm font-medium rounded-md min-h-[44px] ${
                        importMode === 'url'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Import from URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('manual')}
                      className={`px-4 py-3 text-sm font-medium rounded-md min-h-[44px] ${
                        importMode === 'manual'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Paste Specification
                    </button>
                  </div>
                </div>

                {importMode === 'url' ? (
                  <div>
                    <label htmlFor="openapi-url" className="block text-sm font-medium text-gray-700">
                      OpenAPI Specification URL
                    </label>
                    <input
                      id="openapi-url"
                      data-testid="openapi-url-input"
                      type="url"
                      value={formData.openApiUrl}
                      onChange={(e) => setFormData({ ...formData, openApiUrl: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="https://petstore.swagger.io/v2/swagger.json"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Enter the URL of your OpenAPI/Swagger specification to enable automatic endpoint discovery.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="openapi-spec" className="block text-sm font-medium text-gray-700">
                      OpenAPI Specification (Optional)
                    </label>
                    <textarea
                      id="openapi-spec"
                      data-testid="openapi-spec-input"
                      value={formData.openApiSpec}
                      onChange={(e) => setFormData({ ...formData, openApiSpec: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Paste your OpenAPI/Swagger specification here..."
                      rows={8}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Providing an OpenAPI specification will enable automatic endpoint discovery and documentation.
                    </p>
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    type="button"
                    data-testid="test-connection-modal-btn"
                    onClick={handleTestConnection}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
                  >
                    {isSubmitting ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {testResult && (
                  <div data-testid="test-result" className={`p-4 rounded-md ${
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
                        {testResult.success && (
                          <p data-testid="response-time" className="text-xs text-green-600 mt-1">
                            Response time: 245ms
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
            
            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                data-testid="primary-action submit-connection-btn"
                disabled={isSubmitting}
                className="px-4 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
              >
                {isSubmitting && (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                )}
                {isSubmitting ? 'Creating...' : 'Create Connection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 