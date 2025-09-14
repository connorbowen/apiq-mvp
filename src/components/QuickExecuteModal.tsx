'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api/client';
import { ParameterExtractionService } from '../lib/services/parameterExtractionService';
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
}

interface Connection {
  id: string;
  name: string;
  baseUrl: string;
  authType: string;
}

interface QuickExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: Connection;
  endpoint: Endpoint | null;
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

export default function QuickExecuteModal({ 
  isOpen, 
  onClose, 
  connection, 
  endpoint 
}: QuickExecuteModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [requestBody, setRequestBody] = useState<string>('');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [formattedResponse, setFormattedResponse] = useState<FormattedResponse | null>(null);
  const [error, setError] = useState<string>('');

  // Initialize parameters when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialParams: Record<string, any> = {};
      if (endpoint?.parameters) {
        // Use enhanced parameters if available
        const enhancedEndpoint = ParameterExtractionService.enhanceEndpoint(endpoint);
        enhancedEndpoint.parameters.forEach(param => {
          if (param.location === 'query' || param.location === 'path') {
            initialParams[param.name] = param.type === 'boolean' ? false : 
                                      param.type === 'number' ? 0 : '';
          }
        });
      }
      setParameters(initialParams);
      setRequestBody('');
      setResult(null);
      setError('');
    }
  }, [isOpen, endpoint]);

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleExecute = async () => {
    if (!endpoint) {
      setError('No endpoint available for execution');
      return;
    }

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

      const response = await apiClient.executeOperation({
        endpointId: endpoint.id,
        parameters: filteredParameters,
        requestBody: parsedRequestBody
      });

      if (response.success && response.data) {
        setResult(response.data);
        
        // Format the response for human-friendly display
        if (response.data.responseData !== undefined && endpoint) {
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

  if (!isOpen) {
    console.log('🚫 QuickExecuteModal not open');
    return null;
  }

  console.log('✅ QuickExecuteModal rendering with:', { isOpen, connection: connection?.id, endpoint: endpoint?.id || null });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" data-testid="quick-execute-modal">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {endpoint ? (
              <>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                  {endpoint.method}
                </span>
                <span className="font-mono text-sm text-gray-900">{endpoint.path}</span>
                <span className="text-sm text-gray-500">{endpoint.summary}</span>
              </>
            ) : (
              <span className="text-sm text-gray-500">No endpoints available</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            data-testid="close-modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Connection Info */}
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Connection:</span> {connection.name}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Base URL:</span> {connection.baseUrl}
            </div>
          </div>

          {/* Parameters Section */}
          {endpoint?.parameters && endpoint.parameters.length > 0 && (
            <div data-testid="parameter-form">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Parameters</h3>
              <div className="space-y-3">
                {endpoint.parameters.map((param, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <label className="w-1/3 text-sm text-gray-700">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                      <span className="text-gray-500 ml-2">({param.type})</span>
                    </label>
                    <div className="flex-1">
                      {param.type === 'boolean' ? (
                        <select
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
                          value={parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          data-testid={`parameter-${param.name}`}
                          placeholder={param.description}
                        />
                      ) : (
                        <input
                          type="text"
                          value={parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          data-testid={`parameter-${param.name}`}
                          placeholder={param.description}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Body Section */}
          {endpoint && ['POST', 'PUT', 'PATCH'].includes(endpoint.method) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Request Body</h3>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                rows={8}
                placeholder="Enter JSON request body..."
                data-testid="request-body-textarea"
              />
            </div>
          )}

          {/* Execute Button */}
          <div className="flex items-center justify-between">
            {endpoint ? (
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="primary-action execute-api-btn"
              >
                {isExecuting ? 'Executing...' : 'Execute API Call'}
              </button>
            ) : (
              <div className="text-sm text-gray-500">
                No endpoints available for this connection. Please explore the API to see available endpoints.
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Cancel
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md" data-testid="execution-error">
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
            <div className="space-y-4" data-testid="execution-result">
              {/* Human-friendly summary */}
              {formattedResponse && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
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
              <div className="flex items-center space-x-4">
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
                  <div className="p-3 bg-gray-50 rounded-md max-h-96 overflow-y-auto" data-testid="response-body">
                    <pre className="text-xs text-gray-700">
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
      </div>
    </div>
  );
}
