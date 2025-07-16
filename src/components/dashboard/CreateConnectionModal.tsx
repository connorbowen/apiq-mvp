'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient, CreateConnectionRequest } from '../../lib/api/client';

// TODO: [P1.5-OPENAPI-DISCOVERY] Add OpenAPI auto-discovery feature
// - Add common path discovery (/swagger.json, /openapi.json, etc.)
// - Add "Auto-discover" button in CreateConnectionModal
// - Add discovery logic in openApiService
// - Add validation and error handling for discovered specs
// - Add E2E tests for auto-discovery functionality
// - Add caching of successful discoveries
// - Add timeout and fallback handling
// - Add loading state during discovery process
// - Add auto-fill of discovered URL in form
// - Add success/error feedback for discovery attempts

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
    baseUrl: 'https://api.test.com',
    authUrl: 'https://api.test.com/oauth/authorize',
    tokenUrl: 'https://api.test.com/oauth/token',
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

// Additional OAuth2 providers can be added here in the future
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
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.info('[modal] mounted');
    return () => {
      console.info('[modal] unmounted');
    };
  }, []);

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

  // Helper to create secrets for a connection
  const createSecretsForConnection = async (
    name: string,
    credentials: typeof formData.credentials,
    authType: typeof formData.authType,
    isTest: boolean = false
  ): Promise<{ secretIds: string[]; secretReferences: Record<string, string> }> => {
    const secretsToCreate = [];
    const secretIds: string[] = [];
    const secretReferences: Record<string, string> = {};
    const suffix = isTest ? '_test' : '';

    if (authType === 'API_KEY' && credentials.apiKey) {
      secretsToCreate.push({
        name: `${name}_api_key${suffix}`,
        type: 'API_KEY' as const,
        value: credentials.apiKey,
        description: `API key for ${name}${isTest ? ' (test)' : ''}`
      });
      secretReferences.apiKey = `${name}_api_key${suffix}`;
    } else if (authType === 'BEARER_TOKEN' && credentials.bearerToken) {
      secretsToCreate.push({
        name: `${name}_bearer_token${suffix}`,
        type: 'BEARER_TOKEN' as const,
        value: credentials.bearerToken,
        description: `Bearer token for ${name}${isTest ? ' (test)' : ''}`
      });
      secretReferences.bearerToken = `${name}_bearer_token${suffix}`;
    } else if (authType === 'BASIC_AUTH' && (credentials.username || credentials.password)) {
      if (credentials.username) {
        secretsToCreate.push({
          name: `${name}_username${suffix}`,
          type: 'BASIC_AUTH_USERNAME' as const,
          value: credentials.username,
          description: `Username for ${name}${isTest ? ' (test)' : ''}`
        });
        secretReferences.username = `${name}_username${suffix}`;
      }
      if (credentials.password) {
        secretsToCreate.push({
          name: `${name}_password${suffix}`,
          type: 'BASIC_AUTH_PASSWORD' as const,
          value: credentials.password,
          description: `Password for ${name}${isTest ? ' (test)' : ''}`
        });
        secretReferences.password = `${name}_password${suffix}`;
      }
    } else if (authType === 'OAUTH2') {
      if (credentials.clientId) {
        secretsToCreate.push({
          name: `${name}_client_id${suffix}`,
          type: 'OAUTH2_CLIENT_ID' as const,
          value: credentials.clientId,
          description: `OAuth2 client ID for ${name}${isTest ? ' (test)' : ''}`
        });
        secretReferences.clientId = `${name}_client_id${suffix}`;
      }
      if (credentials.clientSecret) {
        secretsToCreate.push({
          name: `${name}_client_secret${suffix}`,
          type: 'OAUTH2_CLIENT_SECRET' as const,
          value: credentials.clientSecret,
          description: `OAuth2 client secret for ${name}${isTest ? ' (test)' : ''}`
        });
        secretReferences.clientSecret = `${name}_client_secret${suffix}`;
      }
    }

    for (const secretData of secretsToCreate) {
      const secretResp = await apiClient.createSecret(secretData);
      if (secretResp.success && secretResp.data?.secret) {
        secretIds.push(secretResp.data.secret.id);
      } else {
        // Rollback any created secrets
        await rollbackSecrets(secretIds);
        throw new Error(secretResp.error || 'Failed to create secret');
      }
    }
    return { secretIds, secretReferences };
  };

  // Helper to rollback (delete) secrets by ID
  const rollbackSecrets = async (secretIds: string[]) => {
    for (const secretId of secretIds) {
      try {
        await apiClient.deleteSecret(secretId);
      } catch (error) {
        console.error(`Failed to rollback secret ${secretId}:`, error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.info('[modal] Form submission triggered');
    console.info('[modal] Form data:', formData);
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setFieldErrors({});
    const now = Date.now();
    const lastSubmission = (window as any).lastConnectionSubmission || 0;
    if (now - lastSubmission < 1000) {
      setErrorMessage('Rate limit exceeded. Please wait before trying again.');
      onError('Rate limit exceeded. Please wait before trying again.');
      setIsSubmitting(false);
      return;
    }
    (window as any).lastConnectionSubmission = now;
    const lastReset = (window as any).lastRateLimitReset || 0;
    if (now - lastReset > 60000) {
      (window as any).connectionSubmissionCount = 0;
      (window as any).lastRateLimitReset = now;
    }
    try {
      // --- SECRETS-FIRST: Create secrets first ---
      const { secretIds, secretReferences } = await createSecretsForConnection(
        formData.name,
        formData.credentials,
        formData.authType,
        false
      );
      // --- SECRETS-FIRST: Create connection with secret references ---
      const connectionData = {
        name: formData.name,
        description: formData.description,
        baseUrl: formData.baseUrl,
        authType: formData.authType,
        authConfig: {}, // Do not store credentials directly
        documentationUrl: formData.openApiUrl || undefined,
        secretIds,
        secretReferences
      };
      const response = await apiClient.createConnection(connectionData);
      if (response.success) {
        setSubmitSuccess(true);
        onSuccess();
        onClose();
      } else {
        // Rollback any created secrets
        await rollbackSecrets(secretIds);
        setErrorMessage(response.error || 'Failed to create connection');
        onError(response.error || 'Failed to create connection');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to create connection');
      onError(error.message || 'Failed to create connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Error handling function for consistent error management
  const handleSubmissionError = (error: any) => {
    console.error('Connection creation error:', error);
    
    let errorMessage = 'An unexpected error occurred while creating the connection';
    
    if (error.response?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please wait before trying again.';
    } else if (error.response?.status === 400) {
      errorMessage = error.response.data?.error || 'Invalid connection data provided';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication required. Please log in again.';
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission to create connections.';
    } else if (error.response?.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setErrorMessage(errorMessage);
    onError(errorMessage);
  };

  const handleTestConnection = async () => {
    setErrorMessage('');
    setTestResult(null);
    setIsSubmitting(true);
    try {
      // --- SECRETS-FIRST: Create secrets for test (ephemeral) ---
      const { secretIds, secretReferences } = await createSecretsForConnection(
        formData.name,
        formData.credentials,
        formData.authType,
        true
      );
      // --- SECRETS-FIRST: Test connection using secret references ---
      const testData = {
        name: formData.name,
        description: formData.description,
        baseUrl: formData.baseUrl,
        authType: formData.authType,
        authConfig: {},
        documentationUrl: formData.openApiUrl || undefined,
        secretIds,
        secretReferences
      };
      const response = await apiClient.testConnectionConfig(testData);
      // Clean up test secrets
      await rollbackSecrets(secretIds);
      if (response.success) {
        setTestResult({ success: true, message: response.data?.message || 'Connection test successful' });
      } else {
        setTestResult({ success: false, message: response.error || 'Connection test failed' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Connection test failed' });
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

  // Helper function to sanitize input and prevent XSS
  const sanitizeInput = (input: string): string => {
    // Remove script tags and other potentially dangerous content
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .trim();
  };

  // Helper function to handle input changes with sanitization
  const handleInputChange = (field: string, value: string) => {
    const sanitizedValue = sanitizeInput(value);
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };

  // Helper function to handle credentials input changes with sanitization
  const handleCredentialsChange = (field: string, value: string) => {
    const sanitizedValue = sanitizeInput(value);
    setFormData(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [field]: sanitizedValue
      }
    }));
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
            <div data-testid="error-message" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="polite">
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
            <div data-testid="success-message" className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md" role="alert" aria-live="polite">
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
                    onChange={(e) => handleInputChange('name', e.target.value)}
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
                    onChange={(e) => handleInputChange('description', e.target.value)}
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
                    onChange={(e) => handleInputChange('baseUrl', e.target.value)}
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
                      onChange={(e) => handleCredentialsChange('apiKey', e.target.value)}
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
                      onChange={(e) => handleCredentialsChange('bearerToken', e.target.value)}
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
                        onChange={(e) => handleCredentialsChange('username', e.target.value)}
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
                        onChange={(e) => handleCredentialsChange('password', e.target.value)}
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
                            onChange={(e) => handleCredentialsChange('clientId', e.target.value)}
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
                            onChange={(e) => handleCredentialsChange('clientSecret', e.target.value)}
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
                            onChange={(e) => handleCredentialsChange('redirectUri', e.target.value)}
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
                            onChange={(e) => handleCredentialsChange('scopes', e.target.value)}
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
                    data-testid="primary-action import-openapi-btn"
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
                      onChange={(e) => handleInputChange('openApiUrl', e.target.value)}
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
                      onChange={(e) => handleInputChange('openApiSpec', e.target.value)}
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
                    data-testid="primary-action test-connection-btn"
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
                disabled={isSubmitting || submitSuccess}
                className="px-4 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
              >
                {isSubmitting && (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                )}
                {isSubmitting ? 'Creating...' : submitSuccess ? 'Success!' : 'Create Connection'}
              </button>
              {submitSuccess && (
                <div data-testid="modal-success-message" role="status" aria-live="polite" className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-center">
                  Connection created successfully
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 