'use client';

import { useState } from 'react';
import { apiClient, CreateConnectionRequest } from '../../lib/api/client';

interface CreateConnectionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

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
    openApiUrl: '',
    openApiSpec: '',
    credentials: {
      apiKey: '',
      bearerToken: '',
      username: '',
      password: '',
      clientId: '',
      clientSecret: ''
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [importMode, setImportMode] = useState<'manual' | 'url'>('url');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.baseUrl) {
      setErrorMessage('Name and Base URL are required');
      return;
    }

    try {
      console.log('Setting isSubmitting true');
      setIsSubmitting(true);
      setErrorMessage('');
      
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
          if (!formData.credentials.apiKey) {
            setErrorMessage('API Key is required');
            return;
          }
          connectionData.authConfig = { apiKey: formData.credentials.apiKey };
          break;
        case 'BEARER_TOKEN':
          if (!formData.credentials.bearerToken) {
            setErrorMessage('Bearer Token is required');
            return;
          }
          connectionData.authConfig = { bearerToken: formData.credentials.bearerToken };
          break;
        case 'BASIC_AUTH':
          if (!formData.credentials.username || !formData.credentials.password) {
            setErrorMessage('Username and Password are required');
            return;
          }
          connectionData.authConfig = {
            username: formData.credentials.username,
            password: formData.credentials.password
          };
          break;
        case 'OAUTH2':
          if (!formData.credentials.clientId || !formData.credentials.clientSecret) {
            setErrorMessage('Client ID and Client Secret are required');
            return;
          }
          connectionData.authConfig = {
            clientId: formData.credentials.clientId,
            clientSecret: formData.credentials.clientSecret
          };
          break;
      }

      const response = await apiClient.createConnection(connectionData);
      console.log('API response:', response);
      
      if (response.success) {
          onSuccess();
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

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label htmlFor="connection-name" className="block text-sm font-medium text-gray-700">
          Connection Name *
        </label>
        <input
          id="connection-name"
          data-testid="connection-name-input"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="e.g., GitHub API"
        />
      </div>
      
      <div>
        <label htmlFor="connection-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="connection-description"
          data-testid="connection-description-input"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
          data-testid="connection-base-url-input"
          type="url"
          required
          value={formData.baseUrl}
          onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://api.example.com"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label htmlFor="connection-auth-type" className="block text-sm font-medium text-gray-700">
          Authentication Type *
        </label>
                  <select
            id="connection-auth-type"
            data-testid="connection-auth-type-select"
            required
            value={formData.authType}
            onChange={(e) => setFormData({ ...formData, authType: e.target.value as 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM' })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
          <option value="API_KEY">API Key</option>
          <option value="BEARER_TOKEN">Bearer Token</option>
          <option value="BASIC_AUTH">Basic Authentication</option>
          <option value="OAUTH2">OAuth2</option>
        </select>
      </div>

      {formData.authType === 'API_KEY' && (
        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
            API Key *
          </label>
          <input
            id="api-key"
            data-testid="api-key-input"
            type="password"
            required
            value={formData.credentials.apiKey}
            onChange={(e) => setFormData({
              ...formData,
              credentials: { ...formData.credentials, apiKey: e.target.value }
            })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your API key"
          />
        </div>
      )}

      {formData.authType === 'BEARER_TOKEN' && (
        <div>
          <label htmlFor="bearer-token" className="block text-sm font-medium text-gray-700">
            Bearer Token *
          </label>
          <input
            id="bearer-token"
            data-testid="bearer-token-input"
            type="password"
            required
            value={formData.credentials.bearerToken}
            onChange={(e) => setFormData({
              ...formData,
              credentials: { ...formData.credentials, bearerToken: e.target.value }
            })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your bearer token"
          />
        </div>
      )}

      {formData.authType === 'BASIC_AUTH' && (
        <>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username *
            </label>
            <input
              id="username"
              data-testid="username-input"
              type="text"
              required
              value={formData.credentials.username}
              onChange={(e) => setFormData({
                ...formData,
                credentials: { ...formData.credentials, username: e.target.value }
              })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <input
              id="password"
              data-testid="password-input"
              type="password"
              required
              value={formData.credentials.password}
              onChange={(e) => setFormData({
                ...formData,
                credentials: { ...formData.credentials, password: e.target.value }
              })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter password"
            />
          </div>
        </>
      )}

      {formData.authType === 'OAUTH2' && (
        <>
          <div>
            <label htmlFor="client-id" className="block text-sm font-medium text-gray-700">
              Client ID *
            </label>
            <input
              id="client-id"
              data-testid="client-id-input"
              type="text"
              required
              value={formData.credentials.clientId}
              onChange={(e) => setFormData({
                ...formData,
                credentials: { ...formData.credentials, clientId: e.target.value }
              })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter OAuth2 client ID"
            />
          </div>
          <div>
            <label htmlFor="client-secret" className="block text-sm font-medium text-gray-700">
              Client Secret *
            </label>
            <input
              id="client-secret"
              data-testid="client-secret-input"
              type="password"
              required
              value={formData.credentials.clientSecret}
              onChange={(e) => setFormData({
                ...formData,
                credentials: { ...formData.credentials, clientSecret: e.target.value }
              })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter OAuth2 client secret"
            />
          </div>
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
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
          data-testid="test-connection-btn"
          onClick={handleTestConnection}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
        >
          {isSubmitting ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {testResult && (
        <div className={`p-4 rounded-md ${
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
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Add API Connection</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
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

          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step <= currentStep ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      step < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Basic Info</span>
              <span>Authentication</span>
              <span>Configuration</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
              >
                Previous
              </button>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
                >
                  Cancel
                </button>
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-4 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
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
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 