'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { apiClient } from '../lib/api/client';
import { ResponseFormatter, FormattedResponse } from '../lib/services/responseFormatter';
import { ConnectionSetupForm } from './ConnectionSetupForm';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  workflow?: any;
  steps?: any[];
  explanation?: string;
  isExecuted?: boolean;
  executionResult?: any;
  // Direct API call properties
  intent?: 'api_call' | 'workflow_creation' | 'general_chat';
  apiCallResult?: {
    method: string;
    url: string;
    statusCode: number;
    responseData: any;
    responseHeaders: Record<string, string>;
    executionTime: number;
    error?: string;
  };
  formattedResponse?: FormattedResponse;
  suggestedAction?: string;
  // Connection guidance properties
  connectionGuidance?: {
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
      documentationUrl?: string;
      baseUrl?: string;
      commonEndpoints?: string[];
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
      documentationUrl?: string;
      baseUrl?: string;
      commonEndpoints?: string[];
    }>;
    guidanceMessage: string;
    error?: string;
    setupInstructions?: {
      title: string;
      steps: string[];
    };
  };
}

interface ChatInterfaceProps {
  onWorkflowGenerated?: (workflow: any, steps: any[]) => void;
  onWorkflowSaved?: (workflowId: string) => void;
}

/**
 * Enhanced Chat Interface - Consolidated Workflow Management
 * 
 * Supports both one-shot executions and workflow creation:
 * - One-shot: Execute immediately without saving
 * - Workflow creation: Save for later use and management
 * - Context-aware: Detect intent and suggest appropriate action
 * 
 * @connorbowen 2024-12-19 - Phase 1.2: Make Chat the default tab ✅ COMPLETED
 * @connorbowen 2024-12-19 - Phase 2.1: Consolidated workflow management ✅ IN PROGRESS
 */

const ChatInterface: React.FC<ChatInterfaceProps> = React.memo(({
  onWorkflowGenerated,
  onWorkflowSaved,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingWorkflow, setSavingWorkflow] = useState<string | null>(null);
  const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);
  
  // Connection setup state
  const [showConnectionSetup, setShowConnectionSetup] = useState(false);
  const [connectionSetupApi, setConnectionSetupApi] = useState<any>(null);
  const [connectionSetupMessageId, setConnectionSetupMessageId] = useState<string | null>(null);
  const [isSavingConnection, setIsSavingConnection] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-focus on chat input when component mounts
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    console.log('🔍 ChatInterface: handleSubmit called');
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) {
      console.log('🔍 ChatInterface: Early return - no message or loading');
      return;
    }

    const messageText = inputMessage.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    try {
      // Let AI orchestrator handle everything
      console.log('🤖 ChatInterface: Sending message to AI orchestrator');
      const response = await apiClient.processMessage(inputMessage);
      console.log('🤖 ChatInterface: AI orchestrator response:', response);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to process message');
      }

      // Create assistant message based on AI response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.content,
        timestamp: new Date(),
        intent: response.data.type === 'workflow' ? 'workflow_creation' : 
                response.data.type === 'direct_api_call' ? 'api_call' : 'general_chat',
        workflow: response.data.workflow ? {
          ...response.data.workflow,
          isSaved: false
        } : undefined,
        steps: response.data.steps,
        apiCallResult: response.data.apiCallResult,
        connectionGuidance: response.data.connectionGuidance,
        suggestedAction: response.data.suggestedAction
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Call the callback if provided
      if (onWorkflowGenerated && response.data.workflow && response.data.steps) {
        onWorkflowGenerated(response.data.workflow, response.data.steps);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I'm sorry, I couldn't process that request. ${errorMessage}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, onWorkflowGenerated]);


  const handleSaveWorkflow = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.workflow) return;

    setSavingWorkflow(messageId);
    
    try {
      console.log('🔍 Saving workflow:', {
        workflow: message.workflow,
        steps: message.steps,
        workflowName: message.workflow.name,
        workflowDescription: message.workflow.description
      });
      
      const response = await apiClient.createWorkflow({
        name: message.workflow.name,
        description: message.workflow.description,
        steps: message.steps || []
      });
      
      console.log('🔍 Save workflow response:', response);

      if (response.success && response.data && response.data.workflow) {
        const workflowId = response.data.workflow.id;
        
        // Update the message to show it's saved
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, workflow: { ...m.workflow, id: workflowId, isSaved: true } }
            : m
        ));

        // Call callback if provided
        if (onWorkflowSaved && workflowId) {
          onWorkflowSaved(workflowId);
        }

        // Add a success message
        const successMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `✅ Workflow "${message.workflow.name}" has been saved successfully! You can now manage it from the Workflows tab.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMsg]);
      } else {
        throw new Error(response.error || 'Failed to save workflow');
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `❌ Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSavingWorkflow(null);
    }
  }, [messages, onWorkflowSaved]);

  // Connection setup handlers
  const handleStartConnectionSetup = useCallback((api: any, messageId: string) => {
    setConnectionSetupApi(api);
    setConnectionSetupMessageId(messageId);
    setShowConnectionSetup(true);
  }, []);

  const handleCancelConnectionSetup = useCallback(() => {
    setShowConnectionSetup(false);
    setConnectionSetupApi(null);
    setConnectionSetupMessageId(null);
  }, []);

  const handleSaveConnection = useCallback(async (credentials: Record<string, string>) => {
    if (!connectionSetupApi || !connectionSetupMessageId) return;

    setIsSavingConnection(true);
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: connectionSetupApi.name,
          displayName: connectionSetupApi.displayName,
          description: connectionSetupApi.description,
          authType: connectionSetupApi.authType,
          baseUrl: connectionSetupApi.baseUrl,
          credentials
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save connection');
      }

      const result = await response.json();
      
      // Close the setup form
      setShowConnectionSetup(false);
      setConnectionSetupApi(null);
      setConnectionSetupMessageId(null);

      // Add success message
      const successMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `✅ Successfully connected to ${connectionSetupApi.displayName}! You can now create your workflow.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMsg]);

      // Refresh the original message to remove connection guidance
      setMessages(prev => prev.map(m => 
        m.id === connectionSetupMessageId 
          ? { 
              ...m, 
              connectionGuidance: m.connectionGuidance ? { 
                ...m.connectionGuidance, 
                requiresGuidance: false 
              } : undefined
            }
          : m
      ));

    } catch (error) {
      throw error; // Let the form handle the error display
    } finally {
      setIsSavingConnection(false);
    }
  }, [connectionSetupApi, connectionSetupMessageId]);

  const handleExecuteWorkflow = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.workflow) return;

    setExecutingWorkflow(messageId);
    
    try {
      // If workflow is saved, execute it directly
      if (message.workflow.id) {
        const response = await apiClient.executeWorkflow(message.workflow.id);
        if (response.success) {
          // Update message to show execution result
          setMessages(prev => prev.map(m => 
            m.id === messageId 
              ? { ...m, isExecuted: true, executionResult: response.data }
              : m
          ));

          // Add execution result message
          const resultMsg: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `✅ Workflow executed successfully! Execution ID: ${response.data.executionId}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, resultMsg]);
        } else {
          throw new Error(response.error || 'Failed to execute workflow');
        }
      } else {
        // For unsaved workflows, we need to save and execute
        // This is a simplified version - in practice you might want to ask user first
        await handleSaveWorkflow(messageId);
        
        // Then execute the saved workflow
        const savedMessage = messages.find(m => m.id === messageId);
        if (savedMessage?.workflow?.id) {
          const response = await apiClient.executeWorkflow(savedMessage.workflow.id);
          if (response.success) {
            const resultMsg: Message = {
              id: (Date.now() + 1).toString(),
              type: 'assistant',
              content: `✅ Workflow saved and executed successfully! Execution ID: ${response.data.executionId}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, resultMsg]);
          }
        }
      }
    } catch (error) {
      // Update message to show execution failed
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, isExecuted: true, executionResult: { status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' } }
          : m
      ));

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `❌ Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setExecutingWorkflow(null);
    }
  }, [messages, handleSaveWorkflow]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const quickExamples = useMemo(() => [
    "When a new customer signs up, add them to our CRM and send a welcome email",
    "Get the latest orders from our e-commerce API and update our inventory system",
    "Monitor our GitHub repository for new issues and create Trello cards",
    "Send me a daily summary of our sales data and customer feedback"
  ], []);

  // Enhanced welcome message for new users
  const welcomeMessage = useMemo(() => ({
    title: "Welcome to APIQ! 🚀",
    subtitle: "I'm your AI assistant that helps you automate workflows between your APIs",
    description: "Just describe what you want to do in plain English, and I'll create the workflow for you.",
    features: [
      "Connect any API with OAuth2 or API keys",
      "Create multi-step workflows automatically", 
      "Monitor and manage your automations",
      "Secure secret management built-in"
    ]
  }), []);

  const handleQuickExample = useCallback((example: string) => {
    setInputMessage(example);
  }, []);

  return (
    <div data-testid="chat-interface" className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 min-h-0 chat-interface">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-6">
            {/* Hero Section - Fixed height */}
            <div className="text-center py-6 max-h-[160px] flex flex-col justify-center">
              <div className="mx-auto h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to APIQ! 🚀</h2>
              <p className="text-sm text-gray-600 mb-3">Your AI automation assistant</p>
              <p className="text-xs text-gray-500 mb-4 max-w-xl mx-auto">
                Connect APIs, create workflows, and automate tasks in plain English.
              </p>
            </div>
            
            {/* Examples Section */}
            <div data-testid="chat-examples">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Try these examples:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
                {quickExamples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickExample(example)}
                    className="group p-3 text-left bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                        <span className="text-indigo-600 font-medium text-xs">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-700 group-hover:text-indigo-700 transition-colors leading-relaxed">
                          {example}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 group-hover:text-indigo-600 transition-colors">
                          Tap to try
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm">{message.content}</div>
              <div className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-indigo-200' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </div>
              
              {message.workflow && message.steps && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <div className="text-xs font-medium text-gray-900 mb-2">
                    ✨ Created: {message.workflow.name}
                    {message.workflow.isSaved && (
                      <span className="ml-2 text-green-600">✓ Saved</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {message.workflow.description}
                  </div>
                  
                  {/* Multi-step workflow display */}
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      📋 Workflow Steps ({message.steps.length} step{message.steps.length !== 1 ? 's' : ''})
                    </div>
                    <div className="space-y-2" data-testid="workflow-steps-container">
                      {message.steps.map((step: any, index: number) => (
                        <div key={step.id || index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded border border-gray-100">
                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900">
                              {step.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {step.description || `${step.type} step`}
                            </div>
                            {step.type === 'api_call' && step.apiConnectionId && (
                              <div className="text-xs text-indigo-600 mt-1">
                                🔗 API Connection: {step.apiConnectionId}
                              </div>
                            )}
                            {step.dataMapping && Object.keys(step.dataMapping).length > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                🔄 Data mapping configured
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex space-x-2">
                    {!message.workflow.isSaved ? (
                      <button 
                        onClick={() => handleSaveWorkflow(message.id)}
                        disabled={savingWorkflow === message.id}
                        className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingWorkflow === message.id ? 'Saving...' : 'Save Workflow'}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleExecuteWorkflow(message.id)}
                        disabled={executingWorkflow === message.id}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {executingWorkflow === message.id ? 'Executing...' : 'Execute Now'}
                      </button>
                    )}
                    
                    <button className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">
                      Edit
                    </button>
                    
                    {message.workflow.isSaved && (
                      <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                        View in Workflows
                      </button>
                    )}
                  </div>
                  
                  {/* Execution result */}
                  {message.isExecuted && message.executionResult && (
                    <div className={`mt-3 p-2 border rounded ${message.executionResult.status === 'FAILED' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`} data-testid="execution-progress">
                      <div className={`text-xs ${message.executionResult.status === 'FAILED' ? 'text-red-800' : 'text-green-800'}`} data-testid="execution-status">
                        {message.executionResult.status === 'FAILED' ? '❌ Execution failed - FAILED' : '✅ Executed successfully - COMPLETED'}
                      </div>
                      {message.executionResult.executionId && (
                        <div className={`text-xs ${message.executionResult.status === 'FAILED' ? 'text-red-600' : 'text-green-600'}`}>
                          Execution ID: {message.executionResult.executionId}
                        </div>
                      )}
                      <div className={`text-xs mt-1 ${message.executionResult.status === 'FAILED' ? 'text-red-600' : 'text-gray-600'}`} data-testid="step-execution">
                        {message.executionResult.status === 'FAILED' ? `Step execution failed: ${message.executionResult.error}` : 'Step execution completed successfully'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Connection guidance */}
              {message.connectionGuidance && message.connectionGuidance.requiresGuidance && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200" data-testid="connection-guidance">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        {message.connectionGuidance.guidanceMessage}
                      </h4>
                      
                      {/* Error state for connection guidance */}
                      {message.connectionGuidance.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3" data-testid="connection-guidance-error">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="ml-2">
                              <p className="text-sm text-red-800">{message.connectionGuidance.error}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Missing APIs list */}
                      {message.connectionGuidance.missingApis.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-blue-800 mb-2">Missing API connections:</div>
                          <div className="space-y-2" data-testid="missing-apis-list">
                            {message.connectionGuidance.missingApis.map((api, index) => (
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
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Setup instructions */}
                      {message.connectionGuidance.setupInstructions && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-blue-800 mb-2">
                            {message.connectionGuidance.setupInstructions.title}:
                          </div>
                          <div className="space-y-1" data-testid="connection-instructions">
                            {message.connectionGuidance.setupInstructions.steps.map((step, index) => (
                              <div key={index} className="flex items-start space-x-2 text-xs text-gray-700" data-testid={`instruction-step-${index + 1}`}>
                                <div className="flex-shrink-0 w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                                  <span className="text-blue-600 font-medium text-xs">{index + 1}</span>
                                </div>
                                <div className="flex-1">{step}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="space-y-2">
                        {/* Individual API setup buttons */}
                        <div className="space-y-1">
                          {message.connectionGuidance.missingApis.map((api, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{api.displayName}</div>
                                <div className="text-xs text-gray-600">{api.description}</div>
                              </div>
                              <button
                                onClick={() => handleStartConnectionSetup(api, message.id)}
                                className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                data-testid={`setup-in-chat-${api.name}`}
                              >
                                Set up in Chat
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Help button */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => {
                              // Show more detailed instructions
                              console.log('Show detailed instructions for:', message.connectionGuidance?.missingApis);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Set up connections
                          </button>
                        </div>
                        
                        {/* Recovery options */}
                        {message.connectionGuidance.error && (
                          <div className="mt-3 pt-3 border-t border-gray-200" data-testid="recovery-options">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  // Retry connection guidance
                                  console.log('Retrying connection guidance');
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Try again
                              </button>
                              <button
                                onClick={() => {
                                  // Contact support
                                  window.open('mailto:support@apiq.com?subject=Connection Guidance Error', '_blank');
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Contact support
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Direct API call result */}
              {message.apiCallResult && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200" data-testid="api-call-result">
                  <div className="text-xs font-medium text-gray-900 mb-2">
                    🔗 API Call Result
                  </div>
                  
                  {/* Human-friendly summary */}
                  {message.formattedResponse && (
                    <div className="mb-3">
                      <div className={`text-sm font-medium mb-2 ${
                        message.formattedResponse.status === 'success' ? 'text-green-800' :
                        message.formattedResponse.status === 'error' ? 'text-red-800' :
                        'text-yellow-800'
                      }`}>
                        {message.formattedResponse.summary}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {message.formattedResponse.details}
                      </div>
                      <div className="text-sm text-gray-800 bg-gray-50 p-2 rounded border">
                        {message.formattedResponse.data.formatted}
                      </div>
                    </div>
                  )}

                  {/* API call details */}
                  <div className="mb-3 space-y-1">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Method:</span> 
                      <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono" data-testid="api-call-method">
                        {message.apiCallResult.method}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">URL:</span> 
                      <span className="ml-1 font-mono text-xs" data-testid="api-call-url">
                        {message.apiCallResult.url}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Status:</span> 
                      <span className={`ml-1 px-1 py-0.5 rounded text-xs font-mono ${
                        message.apiCallResult.statusCode >= 200 && message.apiCallResult.statusCode < 300
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`} data-testid="response-status">
                        {message.apiCallResult.statusCode}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Duration:</span> 
                      <span className="ml-1" data-testid="api-call-duration">
                        {message.apiCallResult.executionTime}ms
                      </span>
                    </div>
                  </div>

                  {/* Suggestions */}
                  {message.formattedResponse?.suggestions && message.formattedResponse.suggestions.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">💡 Suggestions</div>
                      <div className="space-y-1">
                        {message.formattedResponse.suggestions.map((suggestion, index) => (
                          <div key={index} className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw response data (collapsible) */}
                  <details className="mb-3">
                    <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      📋 Raw Response Data
                    </summary>
                    <div className="mt-2">
                      {/* Response headers */}
                      {message.apiCallResult.responseHeaders && Object.keys(message.apiCallResult.responseHeaders).length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-700 mb-1">Response Headers</div>
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto" data-testid="response-headers">
                            {Object.entries(message.apiCallResult.responseHeaders).map(([key, value]) => (
                              <div key={key} className="font-mono">
                                {key}: {value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Response body */}
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-1">Response Body</div>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border max-h-40 overflow-y-auto" data-testid="response-body">
                          {message.apiCallResult.error ? (
                            <div className="text-red-600" data-testid="api-call-error">
                              <div className="font-medium" data-testid="error-message">Error: {message.apiCallResult.error}</div>
                            </div>
                          ) : (
                            <pre className="whitespace-pre-wrap font-mono">
                              {typeof message.apiCallResult.responseData === 'string' 
                                ? message.apiCallResult.responseData
                                : JSON.stringify(message.apiCallResult.responseData, null, 2)
                              }
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Suggested action */}
                  {message.suggestedAction && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
                      💡 {message.suggestedAction}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm">Processing your request...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              data-testid="chat-input"
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Describe what you want to automate..."
              disabled={isLoading}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 text-sm sm:text-base"
            />
            {inputMessage && (
              <button
                type="button"
                onClick={() => setInputMessage('')}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            data-testid="primary-action chat-send-btn"
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            onClick={async (e) => {
              console.log('🔍 ChatInterface: Send button clicked');
              e.preventDefault();
              e.stopPropagation();
              await handleSubmit(e);
            }}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md min-h-[44px]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                <span className="hidden sm:inline">Creating...</span>
                <span className="sm:hidden">Creating</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="hidden sm:inline">Send</span>
                <span className="sm:hidden">Send</span>
              </>
            )}
          </button>
        </form>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Connection Setup Form Modal */}
        {showConnectionSetup && connectionSetupApi && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="connection-setup-modal">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <ConnectionSetupForm
                apiSuggestion={connectionSetupApi}
                onSave={handleSaveConnection}
                onCancel={handleCancelConnectionSetup}
                isLoading={isSavingConnection}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface; 