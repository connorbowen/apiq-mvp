/**
 * ConnectionGuidance Component
 * 
 * Displays connection guidance UI when users need to set up API connections.
 * This component includes all the data-testid attributes required by E2E tests.
 */

import React from 'react';

interface ConnectionGuidanceProps {
  message: string;
  connectionGuidance: {
    requiresGuidance: boolean;
    missingApis: Array<{
      name: string;
      displayName: string;
      description: string;
      authType: string;
      setupInstructions: {
        step1: string;
        step2: string;
        step3: string;
        additionalNotes?: string;
      };
      documentationUrl: string;
      baseUrl: string;
      commonEndpoints: string[];
    }>;
    suggestedConnections: Array<{
      name: string;
      displayName: string;
      description: string;
      authType: string;
      setupInstructions: {
        step1: string;
        step2: string;
        step3: string;
        additionalNotes?: string;
      };
      documentationUrl: string;
      baseUrl: string;
      commonEndpoints: string[];
    }>;
    guidanceMessage: string;
    setupInstructions: Record<string, any>;
  };
  onSetupClick?: (api: any) => void;
}

export default function ConnectionGuidance({ message, connectionGuidance, onSetupClick }: ConnectionGuidanceProps) {
  console.log('🔍 ConnectionGuidance: Component rendered with:', {
    message,
    connectionGuidance,
    requiresGuidance: connectionGuidance?.requiresGuidance,
    missingApis: connectionGuidance?.missingApis?.length || 0,
    suggestedConnections: connectionGuidance?.suggestedConnections?.length || 0
  });
  
  console.log('🔍 ConnectionGuidance: Full connectionGuidance object:', JSON.stringify(connectionGuidance, null, 2));
  
  if (!connectionGuidance.requiresGuidance) {
    console.log('🔍 ConnectionGuidance: Not rendering - requiresGuidance is false');
    return null;
  }

  const { missingApis, suggestedConnections, guidanceMessage, setupInstructions } = connectionGuidance;

  return (
    <div data-testid="connection-guidance" className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            {guidanceMessage || "I can help you set up API connections to automate your workflows."}
          </h3>
          
          {/* API Suggestions - Only show if no missing APIs (to avoid duplicates) */}
          {suggestedConnections.length > 0 && missingApis.length === 0 && (
            <div className="mb-4">
              <p className="text-sm text-blue-700 mb-2">Available APIs to connect:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedConnections.map((api) => (
                  <button
                    key={api.name}
                    data-testid={`api-suggestion-${api.displayName}`}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {api.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Missing APIs List - This is the primary display */}
          {missingApis.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-blue-800 mb-2">Missing API connections:</div>
              <div className="space-y-2" data-testid="missing-apis-list">
                {missingApis.map((api, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded border border-blue-100" data-testid={`api-suggestion-${api.displayName}`}>
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-xs">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{api.displayName}</div>
                      <div className="text-xs text-gray-600">{api.description}</div>
                      <div className="text-xs text-blue-600 mt-1">
                        Auth: {api.authType} • {api.baseUrl}
                      </div>
                      {/* Documentation Link */}
                      <a
                        href={api.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="documentation-link"
                        className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                      >
                        View {api.displayName} documentation
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Instructions */}
          {(missingApis.length > 0 || suggestedConnections.length > 0) && (
            <div data-testid="connection-instructions" className="space-y-1">
              <p className="text-sm font-medium text-blue-900 mb-2">Setup Instructions:</p>
              {/* Use missingApis if available, otherwise use suggestedConnections */}
              {(missingApis.length > 0 ? missingApis : suggestedConnections).map((api, apiIndex) => (
                <div key={`${api.name}-${apiIndex}`} className="mb-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">{api.displayName}</h4>
                  <div className="space-y-1">
                    <div data-testid="instruction-step-1" className="text-xs text-blue-700">
                      <span className="font-medium">Step 1:</span> {api.setupInstructions.step1}
                    </div>
                    <div data-testid="instruction-step-2" className="text-xs text-blue-700">
                      <span className="font-medium">Step 2:</span> {api.setupInstructions.step2}
                    </div>
                    <div data-testid="instruction-step-3" className="text-xs text-blue-700">
                      <span className="font-medium">Step 3:</span> {api.setupInstructions.step3}
                    </div>
                    {api.setupInstructions.additionalNotes && (
                      <div className="text-xs text-blue-600 mt-1 italic">
                        {api.setupInstructions.additionalNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* In-Chat Setup Buttons */}
          {(suggestedConnections.length > 0 || missingApis.length > 0) && (
            <div className="mt-4">
              <p className="text-sm text-blue-700 mb-2">Quick setup:</p>
              <div className="flex flex-wrap gap-2">
                {(suggestedConnections.length > 0 ? suggestedConnections : missingApis).map((api) => (
                  <button
                    key={`setup-${api.name}`}
                    data-testid={`setup-in-chat-${api.name.toLowerCase()}`}
                    onClick={() => onSetupClick?.(api)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Set up {api.displayName} in chat
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fallback for when no specific APIs are detected */}
          {suggestedConnections.length === 0 && missingApis.length === 0 && (
            <div className="mt-4">
              <p className="text-sm text-blue-700 mb-2">What would you like to connect to?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  data-testid="api-suggestion-Stripe"
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Stripe
                </button>
                <button
                  data-testid="api-suggestion-Slack"
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Slack
                </button>
                <button
                  data-testid="api-suggestion-GitHub"
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  GitHub
                </button>
                <button
                  data-testid="api-suggestion-OpenAI"
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  OpenAI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
