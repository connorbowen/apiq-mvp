import React, { useState, useEffect } from 'react';

export interface ConnectionSetupFormProps {
  apiSuggestion: {
    name: string;
    displayName: string;
    description: string;
    authType: 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2' | 'BASIC_AUTH' | 'NONE';
    setupInstructions: {
      step1: string;
      step2: string;
      step3: string;
      additionalNotes?: string;
    };
    documentationUrl?: string;
    baseUrl?: string;
  };
  onSave: (credentials: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConnectionSetupForm: React.FC<ConnectionSetupFormProps> = ({
  apiSuggestion,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);



  const getFormFields = () => {
    switch (apiSuggestion.authType) {
      case 'API_KEY':
        return [
          { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'Enter your API key' }
        ];
      case 'BEARER_TOKEN':
        return [
          { key: 'bearerToken', label: 'Bearer Token', type: 'password', required: true, placeholder: 'Enter your bearer token' }
        ];
      case 'BASIC_AUTH':
        return [
          { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'Enter username' },
          { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Enter password' }
        ];
      case 'OAUTH2':
        return [
          { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'Enter client ID' },
          { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: 'Enter client secret' },
          { key: 'redirectUri', label: 'Redirect URI', type: 'text', required: false, placeholder: 'https://yourapp.com/callback' }
        ];
      default:
        return [];
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const fields = getFormFields();

    fields.forEach(field => {
      if (field.required && !credentials[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setIsTesting(true);
    try {
      // Test the connection by making a simple API call
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiName: apiSuggestion.name,
          authType: apiSuggestion.authType,
          credentials
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Connection test failed');
      }

      // Show success message
      setErrors({});
      alert('Connection test successful! ✅');
    } catch (error) {
      setErrors({ test: error instanceof Error ? error.message : 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    console.log('🔍 ConnectionSetupForm: handleSave called');
    console.log('🔍 ConnectionSetupForm: credentials:', credentials);
    
    if (!validateForm()) {
      console.log('🔍 ConnectionSetupForm: Form validation failed');
      return;
    }

    console.log('🔍 ConnectionSetupForm: Form validation passed, calling onSave');
    try {
      await onSave(credentials);
      console.log('🔍 ConnectionSetupForm: onSave completed successfully');
    } catch (error) {
      console.log('🔍 ConnectionSetupForm: onSave failed:', error);
      setErrors({ save: error instanceof Error ? error.message : 'Failed to save connection' });
    }
  };

  const fields = getFormFields();

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4" data-testid="connection-setup-form">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">
          Set up {apiSuggestion.displayName} connection
        </h4>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
          data-testid="cancel-connection-setup"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-gray-600 mb-4">{apiSuggestion.description}</p>

      <div className="space-y-3">
        {fields.map(field => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type}
              value={credentials[field.key] || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors[field.key] ? 'border-red-300' : 'border-gray-300'
              }`}
              data-testid={`connection-input-${field.key}`}
            />
            {errors[field.key] && (
              <p className="text-xs text-red-600 mt-1" data-testid={`error-${field.key}`}>
                {errors[field.key]}
              </p>
            )}
          </div>
        ))}

        {errors.test && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded" data-testid="test-error">
            {errors.test}
          </div>
        )}

        {errors.save && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded" data-testid="save-error">
            {errors.save}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || isLoading}
            className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="test-connection-btn"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={(e) => {
              console.log('🔍 ConnectionSetupForm: Save button clicked!');
              console.log('🔍 ConnectionSetupForm: Event:', e);
              console.log('🔍 ConnectionSetupForm: isLoading:', isLoading);
              console.log('🔍 ConnectionSetupForm: isTesting:', isTesting);
              console.log('🔍 ConnectionSetupForm: Button disabled:', isLoading || isTesting);
              if (!isLoading && !isTesting) {
                handleSave();
              } else {
                console.log('🔍 ConnectionSetupForm: Button is disabled, not calling handleSave');
              }
            }}
            disabled={isLoading || isTesting}
            className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-connection-btn"
          >
            {isLoading ? 'Saving...' : 'Save Connection'}
          </button>
        </div>

        {apiSuggestion.documentationUrl && (
          <div className="pt-2 border-t border-gray-200">
            <a
              href={apiSuggestion.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800"
              data-testid="documentation-link"
            >
              📖 View {apiSuggestion.displayName} documentation
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
