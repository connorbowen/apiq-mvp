"use client";

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '../lib/api/client';

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  apiConnectionId?: string;
  endpoint?: string;
  method?: string;
  parameters?: Record<string, any>;
  order: number;
}

interface GeneratedWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  estimatedExecutionTime: number;
  confidence: number;
  explanation: string;
}

interface WorkflowValidation {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  workflow?: GeneratedWorkflow;
  validation?: WorkflowValidation;
  alternatives?: GeneratedWorkflow[];
}

export default function NaturalLanguageWorkflowChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<GeneratedWorkflow | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages]);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const validateInput = (input: string): string | null => {
    if (!input.trim()) {
      return 'Please describe your workflow in plain English';
    }
    if (input.trim().length < 10) {
      return 'Please try being more specific about what you want to accomplish';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous validation error
    setValidationError(null);
    
    // Validate input
    const error = validateInput(inputValue);
    if (error) {
      setValidationError(error);
      return;
    }

    if (isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    addMessage({
      type: 'user',
      content: userMessage
    });

    try {
      // Call the workflow generation API
      const response = await apiClient.generateWorkflow(userMessage);

      if (response.success && response.data.workflow) {
        // Add assistant response with generated workflow
        addMessage({
          type: 'assistant',
          content: `I've created a workflow for you!\n\nWorkflow: "${response.data.workflow.name}"\n\n${response.data.explanation}\n\nConfidence: ${Math.round(response.data.confidence * 100)}%\nEstimated execution time: ${response.data.workflow.estimatedExecutionTime / 1000}s`,
          workflow: response.data.workflow,
          validation: response.data.validation,
          alternatives: response.data.alternatives
        });

        // Auto-select the generated workflow
        setSelectedWorkflow(response.data.workflow);
      } else {
        // Add error message
        addMessage({
          type: 'assistant',
          content: `I couldn't generate a workflow for that request. ${response.error || 'Please try being more specific about what you want to accomplish.'}`
        });
      }
    } catch (error) {
      console.error('Workflow generation error:', error);
      addMessage({
        type: 'assistant',
        content: 'Sorry, I encountered an error while generating your workflow. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkflowSelect = (workflow: GeneratedWorkflow) => {
    setSelectedWorkflow(workflow);
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      // Save the workflow to the database
      const response = await apiClient.createWorkflow({
        name: selectedWorkflow.name,
        description: selectedWorkflow.description
      });

      if (response.success) {
        addMessage({
          type: 'assistant',
          content: `✅ Workflow "${selectedWorkflow.name}" has been saved successfully! You can now run it from your workflows dashboard.`
        });
        setSelectedWorkflow(null);
      } else {
        addMessage({
          type: 'assistant',
          content: `❌ Failed to save workflow: ${response.error}`
        });
      }
    } catch (error) {
      console.error('Save workflow error:', error);
      addMessage({
        type: 'assistant',
        content: '❌ Failed to save workflow. Please try again.'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Workflow</h2>
          <p className="text-gray-600 mt-2">
            Describe what you want to automate in plain English, and I&apos;ll create a workflow for you.
          </p>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg font-medium">Start by describing your workflow</p>
              <p className="text-sm mt-2">Examples:</p>
              <ul className="text-sm mt-1 space-y-1">
                <li>• &quot;When a new GitHub issue is created, send a Slack notification&quot;</li>
                <li>• &quot;Every morning at 9 AM, fetch weather data and send an email&quot;</li>
                <li>• &quot;When a form is submitted, create a Trello card and send a confirmation&quot;</li>
              </ul>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'assistant' && message.content.startsWith("I've created a workflow for you") ? (
                <div
                  data-testid="workflow-success-message"
                  className="bg-green-50 text-green-800 p-3 rounded-lg shadow"
                >
                  {message.content}
                </div>
              ) : (
                <div
                  className={`max-w-3xl rounded-lg px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Show workflow details if available */}
                  {message.workflow && (
                    <div className="mt-4 p-4 bg-white rounded border">
                      <h4 className="font-semibold text-gray-900 mb-2">Generated Workflow</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Steps:</strong> {message.workflow.steps.length}</p>
                        <p><strong>Confidence:</strong> {Math.round(message.workflow.confidence * 100)}%</p>
                        <p><strong>Est. Time:</strong> {message.workflow.estimatedExecutionTime / 1000}s</p>
                      </div>
                      
                      {/* Show validation issues */}
                      {message.validation && !message.validation.isValid && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-yellow-800 font-medium">⚠️ Issues Found:</p>
                          <ul className="text-yellow-700 text-sm mt-1">
                            {message.validation.issues.map((issue, index) => (
                              <li key={index}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Show alternatives */}
                      {message.alternatives && message.alternatives.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Alternative approaches:</p>
                          <div className="space-y-2">
                            {message.alternatives.map((alt, index) => (
                              <button
                                key={index}
                                onClick={() => handleWorkflowSelect(alt)}
                                className="block w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                              >
                                {alt.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Generating workflow...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setValidationError(null); // Clear validation error when user types
              }}
              placeholder="Describe your workflow in plain English..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              data-testid="workflow-description-input"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              data-testid="generate-workflow-btn"
            >
              {isLoading ? 'Generating' : 'Generate'}
            </button>
          </form>
          
          {/* Validation Error Display */}
          {validationError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
              <p className="text-red-800 text-sm">{validationError}</p>
            </div>
          )}
        </div>

        {/* Selected Workflow Actions */}
        {selectedWorkflow && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Selected Workflow</h3>
                <p className="text-sm text-gray-600">{selectedWorkflow.name}</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedWorkflow(null)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWorkflow}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Save Workflow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 