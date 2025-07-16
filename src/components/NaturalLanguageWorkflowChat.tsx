"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../lib/api/client';

// Validation schema
const workflowDescriptionSchema = z.object({
  description: z
    .string()
    .min(1, 'Workflow description is required. Please describe your workflow in plain English')
    .min(10, 'Please provide more details about what you want to accomplish (at least 10 characters)')
    .max(2000, 'Description is too long. Please keep it under 2000 characters')
});

type WorkflowFormData = z.infer<typeof workflowDescriptionSchema>;

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  apiConnectionId?: string;
  endpoint?: string;
  method?: string;
  parameters?: Record<string, any>;
  dataMapping?: Record<string, string>;
  conditions?: any;
  order: number;
  description?: string; // Added description field
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

interface NaturalLanguageWorkflowChatProps {
  onWorkflowCreated?: () => void;
  onWorkflowError?: (error: string) => void;
}

export default function NaturalLanguageWorkflowChat({ 
  onWorkflowCreated, 
  onWorkflowError 
}: NaturalLanguageWorkflowChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<GeneratedWorkflow | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    trigger
  } = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowDescriptionSchema)
  });

  const watchedDescription = watch('description');

  // Focus the textarea after component mounts (delay ensures reliability in React/Playwright)
  useEffect(() => {
    // Delay focus to ensure DOM is ready (fixes Playwright/React timing issues)
    const timeout = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  // Merged ref for React Hook Form and our own ref
  const registerTextarea = register('description');
  const setMergedRef = (el: HTMLTextAreaElement | null) => {
    // Use callback ref pattern to avoid read-only property assignment
    if (typeof registerTextarea.ref === 'function') {
      registerTextarea.ref(el);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages]);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Debug: log the full messages state after each update
      console.log('📝 [NaturalLanguageWorkflowChat] messages state:', JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const onSubmit = async (data: WorkflowFormData) => {
    console.log('NaturalLanguageWorkflowChat: onSubmit called with description:', `"${data.description}"`);
    
    // Set loading state immediately
    setIsLoading(true);
    console.log('NaturalLanguageWorkflowChat: Clearing error, setting loading state');
    setError('');
    setSuccessMessage('');
    // Artificial delay for E2E test reliability
    await new Promise(r => setTimeout(r, 300));
    
    try {
      const response = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ userDescription: data.description }),
      });

      const responseData = await response.json();
      console.log('🔍 Frontend: API response data:', JSON.stringify(responseData, null, 2));

      if (responseData.success) {
        const successText = "I've created a workflow for you based on your description. You can now review and activate it.";
        setSuccessMessage(successText);
        reset(); // Reset form after successful submission
        
        console.log('🔍 Frontend: Workflow object from response:', responseData.data?.workflow);
        console.log('🔍 Frontend: Validation from response:', responseData.data?.validation);
        console.log('🔍 Frontend: Alternatives from response:', responseData.data?.alternatives);
        
        // Add a chat message with the workflow object if available
        addMessage({
          type: 'assistant',
          content: successText,
          workflow: responseData.data?.workflow || undefined,
          validation: responseData.data?.validation || undefined,
          alternatives: responseData.data?.alternatives || undefined
        });
        
        if (onWorkflowCreated) {
          onWorkflowCreated();
        }
      } else {
        const errorMessage = responseData.error || 'Failed to generate workflow. Please try again.';
        setError(errorMessage);
        if (onWorkflowError) {
          onWorkflowError(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error generating workflow:', error);
      const errorMessage = 'An error occurred while generating the workflow. Please try again.';
      setError(errorMessage);
      if (onWorkflowError) {
        onWorkflowError(errorMessage);
      }
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
        description: selectedWorkflow.description,
        steps: selectedWorkflow.steps
      });

      if (response.success) {
        addMessage({
          type: 'assistant',
          content: `✅ Workflow "${selectedWorkflow.name}" has been saved successfully! Redirecting to workflows dashboard...`
        });
        setSelectedWorkflow(null);
        
        // Redirect to workflows list page after successful save
        setTimeout(() => {
          window.location.href = '/workflows';
        }, 1500); // Give user time to see the success message
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

          {messages.map((msg, idx) => {
            // Check if this is a workflow success message
            const isWorkflowSuccess = 
              msg.type === 'assistant' && 
              msg.content.startsWith("I've created a workflow for you");
            
            return (
              <div
                key={msg.id || idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-lg px-4 py-2 ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : isWorkflowSuccess
                      ? 'bg-green-50 text-green-800'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  
                  {/* Show workflow details if available */}
                  {msg.workflow && (
                    <div className="mt-4 p-4 bg-white rounded border" data-testid="workflow-preview">
                      <h4 className="font-semibold text-gray-900 mb-2">Generated Workflow</h4>
                      
                      {/* Multi-step workflow preview */}
                      <div className="space-y-4">
                        {/* Workflow overview */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-700">Steps</p>
                            <p className="text-gray-900">{msg.workflow.steps.length}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Confidence</p>
                            <p className="text-gray-900">{Math.round(msg.workflow.confidence * 100)}%</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Est. Time</p>
                            <p className="text-gray-900">{msg.workflow.estimatedExecutionTime / 1000}s</p>
                          </div>
                        </div>

                        {/* Step-by-step preview */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-gray-900">Workflow Steps</h5>
                          {msg.workflow.steps.map((step, index) => (
                            <div key={step.id} className="border rounded-lg p-3 bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-medium rounded-full">
                                      {step.order}
                                    </span>
                                    <h6 className="font-medium text-gray-900" data-testid={`step-${index + 1}-title`}>
                                      Step {index + 1}: {step.name}
                                    </h6>
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      step.type === 'api_call' ? 'bg-blue-100 text-blue-800' :
                                      step.type === 'data_transform' ? 'bg-purple-100 text-purple-800' :
                                      step.type === 'condition' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {step.type}
                                    </span>
                                  </div>
                                  
                                  {/* Step details */}
                                  <div className="text-sm text-gray-600 space-y-1">
                                    {/* Step description/explanation */}
                                    {step.description && (
                                      <p className="mb-1" data-testid={`step-${index + 1}-description`}>
                                        {step.description}
                                      </p>
                                    )}
                                    {step.endpoint && (
                                      <p><span className="font-medium">Endpoint:</span> {step.method} {step.endpoint}</p>
                                    )}
                                    {step.parameters && Object.keys(step.parameters).length > 0 && (
                                      <div>
                                        <p className="font-medium">Parameters:</p>
                                        <ul className="ml-4 space-y-1">
                                          {Object.entries(step.parameters).map(([key, value]) => (
                                            <li key={key} data-testid={`step-${index + 1}-param-${key}`}>
                                              <span className="font-medium">{key}:</span> {String(value)}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {step.dataMapping && Object.keys(step.dataMapping).length > 0 && (
                                      <div>
                                        <p className="font-medium">Data Mapping:</p>
                                        <ul className="ml-4 space-y-1">
                                          {Object.entries(step.dataMapping).map(([key, value]) => (
                                            <li key={key} data-testid={`step-${index + 1}-mapping-${key}`}>
                                              <span className="font-medium">{key}:</span> {value}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {step.conditions && (
                                      <div>
                                        <p className="font-medium">Conditions:</p>
                                        <p className="ml-4 text-gray-600">{JSON.stringify(step.conditions)}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Data flow visualization */}
                        {msg.workflow.steps.some(step => step.dataMapping && Object.keys(step.dataMapping).length > 0) && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <h5 className="font-medium text-blue-900 mb-2">Data Flow</h5>
                            <div className="space-y-2 text-sm">
                              {msg.workflow.steps.map((step, index) => {
                                if (step.dataMapping && Object.keys(step.dataMapping).length > 0) {
                                  return (
                                    <div key={step.id} className="flex items-center space-x-2">
                                      <span className="text-blue-600">Step {step.order}</span>
                                      <span className="text-blue-400">→</span>
                                      <span className="text-blue-800">{Object.keys(step.dataMapping).join(', ')}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Add clickable button to select this workflow */}
                      <button
                        onClick={() => handleWorkflowSelect(msg.workflow!)}
                        className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors min-h-[44px]"
                        data-testid="select-workflow-btn"
                      >
                        Select This Workflow
                      </button>
                      
                      {/* Show validation issues */}
                      {msg.validation && !msg.validation.isValid && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-yellow-800 font-medium">⚠️ Issues Found:</p>
                          <ul className="text-yellow-700 text-sm mt-1">
                            {msg.validation.issues.map((issue, index) => (
                              <li key={index}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Show alternatives */}
                      {msg.alternatives && msg.alternatives.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Alternative approaches:</p>
                          <div className="space-y-2">
                            {msg.alternatives.map((alt, index) => (
                              <button
                                key={index}
                                onClick={() => handleWorkflowSelect(alt)}
                                className="block w-full text-left p-2 text-sm border rounded hover:bg-gray-50 min-h-[44px] min-w-[44px]"
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
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Generating multi-step workflow...</span>
                </div>
                {/* Progress indicators for multi-step generation */}
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Analyzing workflow requirements</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Planning workflow steps</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Generating step configurations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Validating workflow logic</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Creating data flow mappings</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t border-gray-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" role="form">
            <div className="space-y-2">
              <label htmlFor="workflow-description" className="block text-sm font-medium text-gray-700">
                Workflow Description
              </label>
              <textarea
                id="workflow-description"
                data-testid="workflow-description-input"
                autoFocus
                {...registerTextarea}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Trigger validation to show errors
                    await trigger('description');
                    // Only submit if validation passes
                    if (Object.keys(errors).length === 0) {
                      const form = e.currentTarget.form;
                      if (form) {
                        form.requestSubmit();
                      }
                    }
                  } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    // Submit the form
                    const form = e.currentTarget.form;
                    if (form) {
                      form.requestSubmit();
                    }
                  }
                }}
                placeholder="Describe your workflow..."
                aria-required="true"
                aria-describedby="workflow-description-help workflow-description-error"
                aria-invalid={errors.description ? "true" : "false"}
                aria-label="Workflow description"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] min-w-[44px] ${
                  errors.description 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300'
                }`}
                disabled={isLoading || isSubmitting}
                ref={setMergedRef}
              />
              <p id="workflow-description-help" className="text-sm text-gray-500">
                Describe what you want to automate or do
              </p>
              
              {/* Form Validation Error */}
              {errors.description && (
                <div 
                  id="workflow-description-error"
                  className="p-3 bg-red-50 border border-red-200 rounded-md" 
                  data-testid="workflow-validation-error"
                  role="alert"
                  aria-live="assertive"
                >
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                </div>
              )}
            </div>

            {/* API Error Message */}
            {error && error.toLowerCase().includes('rate limit') && (
              <div 
                className="p-3 bg-red-50 border border-red-200 rounded-md" 
                data-testid="rate-limit-error"
                role="alert"
                aria-live="assertive"
              >
                <p className="text-sm text-red-600">Rate Limit: You have made too many requests. Please wait a moment and try again.</p>
              </div>
            )}
            {error && (!error.toLowerCase().includes('rate limit')) && (
              <div 
                className="p-3 bg-red-50 border border-red-200 rounded-md" 
                data-testid="workflow-error-message"
                role="alert"
                aria-live="assertive"
              >
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div 
                className="p-3 bg-green-50 border border-green-200 rounded-md" 
                data-testid="workflow-success-form-message"
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm text-green-600">{successMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="primary-action generate-workflow-btn"
            >
              {isLoading || isSubmitting ? 'Generating...' : 'Generate Workflow'}
            </button>
          </form>
        </div>

        {/* Selected Workflow Actions */}
        {selectedWorkflow && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Selected Workflow</h3>
                  <p className="text-sm text-gray-600">{selectedWorkflow.name}</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedWorkflow(null)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] min-w-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWorkflow}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors min-h-[44px]"
                    data-testid="primary-action save-workflow-btn"
                  >
                    Save Workflow
                  </button>
                </div>
              </div>
              
              {/* Selected workflow details */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-gray-900 mb-3">Workflow Preview</h4>
                <div className="space-y-2">
                  {selectedWorkflow.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-2 text-sm">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-medium rounded-full">
                        {step.order}
                      </span>
                      <span className="font-medium">{step.name}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        step.type === 'api_call' ? 'bg-blue-100 text-blue-800' :
                        step.type === 'data_transform' ? 'bg-purple-100 text-purple-800' :
                        step.type === 'condition' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {step.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 