'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api/client';
import { ApiSchemaEnhancementService } from '../lib/services/apiSchemaEnhancementService';
import { ResponseFormatter, FormattedResponse } from '../lib/services/responseFormatter';

interface Endpoint {
  id: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    in: 'query' | 'path' | 'header' | 'body';
  }>;
  requestSchema?: any;
  responseSchema?: any;
}

interface ApiOperationTesterProps {
  endpoint: Endpoint;
  connectionName: string;
  baseUrl: string;
}

interface ExecutionResult {
  executionId: string;
  status: string;
  responseData?: any;
  responseHeaders?: Record<string, string>;
  statusCode?: number;
  executionTime?: number;
  error?: string;
}

export default function ApiOperationTester({ endpoint, connectionName, baseUrl }: ApiOperationTesterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [requestBody, setRequestBody] = useState<string>('');
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [formattedResponse, setFormattedResponse] = useState<FormattedResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [enhancedParameters, setEnhancedParameters] = useState<any[]>([]);

  // Initialize enhanced parameters on mount
  useEffect(() => {
    const initializeEnhanced = async () => {
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        try {
          const enhancedEndpoint = await ApiSchemaEnhancementService.enhanceEndpoint(endpoint);
          setEnhancedParameters(enhancedEndpoint.parameters);
        } catch (error) {
          console.error('Failed to initialize enhanced parameters:', error);
          // Fallback to raw parameters
          setEnhancedParameters(endpoint.parameters || []);
        }
      }
    };
    initializeEnhanced();
  }, [endpoint]);

  // Initialize parameters from enhanced endpoint schema
  const initializeParameters = async () => {
    const initialParams: Record<string, any> = {};
    if (enhancedParameters.length > 0) {
      // Use already loaded enhanced parameters
      enhancedParameters.forEach((param: any) => {
        if (param.location === 'query' || param.location === 'path') {
          initialParams[param.name] = param.type === 'boolean' ? false : 
                                    param.type === 'number' ? 0 : '';
        }
      });
    } else if (endpoint.parameters) {
      // Fallback to raw parameters if enhanced not available yet
      endpoint.parameters.forEach((param: any) => {
        if (param.in === 'query' || param.in === 'path') {
          initialParams[param.name] = param.type === 'boolean' ? false : 
                                    param.type === 'number' ? 0 : '';
        }
      });
    }
    setParameters(initialParams);
  };

  const handleExpand = () => {
    if (!isExpanded) {
      initializeParameters();
    }
    setIsExpanded(!isExpanded);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleHeaderChange = (headerName: string, value: string) => {
    setCustomHeaders(prev => ({
      ...prev,
      [headerName]: value
    }));
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError('');
    setResult(null);

    try {
      // Parse request body if provided
      let parsedRequestBody: any = null;
      if (requestBody.trim()) {
        try {
          parsedRequestBody = JSON.parse(requestBody);
        } catch (e) {
          throw new Error('Invalid JSON in request body');
        }
      }

      // Filter out empty parameters
      const filteredParameters = Object.fromEntries(
        Object.entries(parameters).filter(([_, value]) => 
          value !== null && value !== undefined && value !== ''
        )
      );

      // Filter out empty headers
      const filteredHeaders = Object.fromEntries(
        Object.entries(customHeaders).filter(([_, value]) => 
          value !== null && value !== undefined && value !== ''
        )
      );

      const response = await apiClient.executeOperation({
        endpointId: endpoint.id,
        parameters: filteredParameters,
        requestBody: parsedRequestBody,
        headers: filteredHeaders
      });

      if (response.success && response.data) {
        console.log('API execution response:', response.data);
        setResult(response.data);
        
        // Format the response for human-friendly display
        if (response.data.responseData !== undefined) {
          const apiResponse = {
            method: endpoint.method,
            url: endpoint.path,
            statusCode: response.data.statusCode || 200,
            responseData: response.data.responseData,
            responseHeaders: response.data.responseHeaders || {},
            executionTime: response.data.executionTime || 0,
            error: response.data.error
          };
          const formatted = ResponseFormatter.formatApiResponse(apiResponse);
          setFormattedResponse(formatted);
        }
      } else {
        console.log('API execution failed:', response.error);
        setError(response.error || 'Failed to execute operation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600';
      case 'FAILED': return 'text-red-600';
      case 'PENDING': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <button
        onClick={handleExpand}
        className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 font-medium"
        data-testid={`try-it-out-btn-${endpoint.id || endpoint.path}-${endpoint.method}`}
      >
        <span>🚀 Try It Out</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4" data-testid="operation-tester">
          {/* Parameters Section */}
          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <form data-testid="parameter-form">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Parameters</h4>
              <div className="space-y-3">
                {enhancedParameters.map((param: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <label className="flex-1 text-sm text-gray-700">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                      <span className="text-gray-500 ml-2">({param.type})</span>
                    </label>
                    <div className="flex-1">
                      {param.type === 'boolean' ? (
                        <select
                          name={param.name}
                          value={parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value === 'true')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          data-testid={`parameter-${param.name}`}
                        >
                          <option value="">Select...</option>
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : param.type === 'number' ? (
                        <input
                          type="number"
                          name={param.name}
                          value={parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          data-testid={`parameter-${param.name}`}
                          placeholder={param.description || `Enter ${param.name}`}
                          min={param.validation?.min}
                          max={param.validation?.max}
                        />
                      ) : (
                        <input
                          type="text"
                          name={param.name}
                          value={parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          data-testid={`parameter-${param.name}`}
                          placeholder={param.description || `Enter ${param.name}`}
                          pattern={param.validation?.pattern}
                        />
                      )}
                      {/* Show natural language mappings and examples */}
                      <div className="mt-1 text-xs text-gray-500">
                        {param.naturalLanguageMappings && param.naturalLanguageMappings.length > 0 && (
                          <div>Also known as: {param.naturalLanguageMappings.join(', ')}</div>
                        )}
                        {param.examples && param.examples.length > 0 && (
                          <div>Examples: {param.examples.join(', ')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          )}

          {/* Request Body Section */}
          {['POST', 'PUT', 'PATCH'].includes(endpoint.method) && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Request Body</h4>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                rows={6}
                placeholder="Enter JSON request body..."
                data-testid="request-body-textarea"
              />
            </div>
          )}

          {/* Custom Headers Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Custom Headers (Optional)</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="Header name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  data-testid="custom-header-name"
                />
                <input
                  type="text"
                  placeholder="Header value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  data-testid="custom-header-value"
                />
              </div>
            </div>
          </div>

          {/* Execute Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="primary-action-execute-api-btn"
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </button>
            <span className="text-sm text-gray-500">
              {connectionName} • {baseUrl}
            </span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md" data-testid="execution-error">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Execution Failed</h3>
                  <div className="mt-1 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-3" data-testid="execution-result">
              {/* Human-friendly summary */}
              {formattedResponse && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className={`text-sm font-medium mb-2 ${
                    formattedResponse.status === 'success' ? 'text-green-800' :
                    formattedResponse.status === 'error' ? 'text-red-800' :
                    'text-yellow-800'
                  }`}>
                    {formattedResponse.summary}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {formattedResponse.details}
                  </div>
                  <div className="text-sm text-gray-800 bg-white p-2 rounded border">
                    {formattedResponse.data.formatted}
                  </div>
                  
                  {/* Suggestions */}
                  {formattedResponse.suggestions && formattedResponse.suggestions.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">💡 Suggestions</div>
                      <div className="space-y-1">
                        {formattedResponse.suggestions.map((suggestion, index) => (
                          <div key={index} className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Indicator */}
              {result.status === 'COMPLETED' && (
                <div data-testid="execution-success" className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">API call executed successfully</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status */}
              <div className="flex items-center space-x-3">
                <span className={`text-sm font-medium ${getStatusColor(result.status)}`} data-testid="response-status">
                  Status: {result.status}
                </span>
                {result.statusCode && (
                  <span className="text-sm text-gray-600">
                    HTTP {result.statusCode}
                  </span>
                )}
                {result.executionTime && (
                  <span className="text-sm text-gray-600">
                    {result.executionTime}ms
                  </span>
                )}
              </div>

              {/* Response Headers */}
              {result.responseHeaders && Object.keys(result.responseHeaders).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Response Headers</h4>
                  <div className="p-3 bg-gray-50 rounded-md" data-testid="response-headers">
                    <pre className="text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(result.responseHeaders, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Response Data */}
              {result.responseData && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Response Data</h4>
                  <div className="p-3 bg-gray-50 rounded-md" data-testid="response-body">
                    <pre className="text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(result.responseData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {result.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm text-red-700">{result.error}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
