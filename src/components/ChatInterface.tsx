'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { apiClient } from '../lib/api/client';
import { ResponseFormatter, FormattedResponse } from '../lib/services/responseFormatter';
import { ConnectionSetupForm } from './ConnectionSetupForm';
import ConnectionGuidance from './ConnectionGuidance';
import ConfidenceConfirmation from './ConfidenceConfirmation';
import { createFormSubmissionHandler, createGlobalFormSubmissionFunction } from '../lib/utils/formSubmissionUtils';
import { sanitizeForChat } from '../lib/utils/inputSanitization';

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
  intent?: 'api_call' | 'workflow_creation' | 'general_chat' | 'connection_guidance';
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
    error?: string;
  };
  // Confidence confirmation properties
  confidenceConfirmation?: {
    confidence: number;
    uncertaintyType: 'parameter' | 'connection' | 'data_mapping' | 'intent' | 'endpoint' | 'general';
    explanation: string;
    suggestions: Array<{
      option: string;
      description: string;
      confidence: number;
    }>;
    originalResponse: string;
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

  // Force reset loading state as a backup mechanism (less aggressive)
  useEffect(() => {
    const forceResetTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('🔍 ChatInterface: Force resetting loading state after 30 seconds');
        setIsLoading(false);
      }
    }, 30000); // 30 second force reset

    return () => clearTimeout(forceResetTimeout);
  }, [isLoading]);

  // Confidence confirmation handlers
  const handleConfidenceConfirm = (messageId: string, selectedOption?: string) => {
    console.log('🔍 ChatInterface: handleConfidenceConfirm called for message:', messageId, 'with option:', selectedOption);
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.confidenceConfirmation) {
        // Replace the confidence confirmation message with the original response
        return {
          ...msg,
          content: msg.confidenceConfirmation.originalResponse,
          confidenceConfirmation: undefined
        };
      }
      return msg;
    }));
  };

  const handleConfidenceCancel = (messageId: string) => {
    console.log('🔍 ChatInterface: handleConfidenceCancel called for message:', messageId);
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.confidenceConfirmation) {
        // Remove the confidence confirmation and show a cancellation message
        return {
          ...msg,
          content: "I've cancelled this request. Please let me know how I can help you better.",
          confidenceConfirmation: undefined
        };
      }
      return msg;
    }));
  };

  const handleConfidenceRefine = (messageId: string) => {
    console.log('🔍 ChatInterface: handleConfidenceRefine called for message:', messageId);
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.confidenceConfirmation) {
        // Replace with a message asking for clarification
        return {
          ...msg,
          content: "I'd like to help you better. Could you provide more details about what you're trying to accomplish? For example:\n\n- What specific data do you need?\n- Which API endpoints are you interested in?\n- What should happen with the results?\n\nThis will help me give you a more accurate response.",
          confidenceConfirmation: undefined
        };
      }
      return msg;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔍 ChatInterface: handleSubmit called, isLoading:', isLoading);
    
    if (!inputMessage.trim() || isLoading) {
      console.log('🔍 ChatInterface: Early return - inputMessage:', inputMessage.trim(), 'isLoading:', isLoading);
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

    // Set a single reasonable timeout to ensure loading state is reset
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 30000); // 30 second timeout - more reasonable for API calls

    try {
      console.log('🔍 ChatInterface: Starting try block');
      
      // Build context from previous messages - use the current messages state
      // Note: This will include the user message we just added
      const context = [...messages, userMessage].map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        intent: msg.intent,
        apiCallResult: msg.apiCallResult,
        workflow: msg.workflow,
        steps: msg.steps
      }));

      // Let AI orchestrator handle everything
      console.log('🔍 ChatInterface: About to call apiClient.processMessage');
      let response;
      try {
        response = await apiClient.processMessage(messageText, context);
        console.log('🔍 ChatInterface: API response received:', response);
      } catch (error) {
        console.error('🔍 ChatInterface: Error calling apiClient.processMessage:', error);
        throw error;
      }
      console.log('🔍 ChatInterface: Response success:', response.success);
      console.log('🔍 ChatInterface: Response data:', response.data);
      console.log('🔍 ChatInterface: API call result:', response.data?.apiCallResult);
      console.log('🔍 ChatInterface: API call result URL:', response.data?.apiCallResult?.url);
      console.log('🔍 ChatInterface: API call result statusCode:', response.data?.apiCallResult?.statusCode);
      console.log('🔍 ChatInterface: API call result error:', response.data?.apiCallResult?.error);
      console.log('🔍 ChatInterface: Response data type:', response.data?.type);
      console.log('🔍 ChatInterface: Has apiCallResult:', !!response.data?.apiCallResult);
      console.log('🔍 ChatInterface: Has connectionGuidance:', !!response.data?.connectionGuidance);
      console.log('🔍 ChatInterface: Connection guidance details:', response.data?.connectionGuidance);
      console.log('🔍 ChatInterface: Full response data:', JSON.stringify(response.data, null, 2));
      
      // DEBUG: Log current messages state before adding new message
      console.log('🔍 ChatInterface: Current messages state before adding new message:', {
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1],
        allMessages: messages.map(m => ({ id: m.id, type: m.type, content: m.content?.substring(0, 50) + '...' }))
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to process message');
      }

      // Create assistant message based on AI response
      console.log('🔍 ChatInterface: Creating assistant message with data:', {
        content: response.data.content,
        type: response.data.type,
        apiCallResult: response.data.apiCallResult,
        hasApiCallResult: !!response.data.apiCallResult
      });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.content,
        timestamp: new Date(),
        intent: response.data.type === 'workflow' ? 'workflow_creation' : 
                response.data.type === 'direct_api_call' ? 'api_call' : 
                response.data.type === 'connection_guidance' ? 'connection_guidance' :
                response.data.type || 'general_chat',
        workflow: response.data.workflow ? {
          ...response.data.workflow,
          isSaved: false
        } : undefined,
        steps: response.data.steps,
        apiCallResult: response.data.apiCallResult,
        connectionGuidance: response.data.connectionGuidance,
        suggestedAction: response.data.suggestedAction,
        confidenceConfirmation: response.data.confidenceConfirmation
      };
      
      console.log('🔍 ChatInterface: Assistant message created:', {
        id: assistantMessage.id,
        type: assistantMessage.type,
        intent: assistantMessage.intent,
        hasApiCallResult: !!assistantMessage.apiCallResult,
        apiCallResult: assistantMessage.apiCallResult,
        content: assistantMessage.content,
        suggestedAction: assistantMessage.suggestedAction,
        hasConnectionGuidance: !!assistantMessage.connectionGuidance,
        connectionGuidance: assistantMessage.connectionGuidance,
        hasConfidenceConfirmation: !!assistantMessage.confidenceConfirmation,
        confidenceConfirmation: assistantMessage.confidenceConfirmation
      });
      
      // Debug connection guidance specifically
      if (assistantMessage.connectionGuidance) {
        console.log('🔍 ChatInterface: Connection guidance details:', {
          requiresGuidance: assistantMessage.connectionGuidance.requiresGuidance,
          missingApisCount: assistantMessage.connectionGuidance.missingApis?.length || 0,
          suggestedConnectionsCount: assistantMessage.connectionGuidance.suggestedConnections?.length || 0,
          guidanceMessage: assistantMessage.connectionGuidance.guidanceMessage
        });
      }
      

      // Create formatted response for API call results
      if (response.data.apiCallResult) {
        const formatted = ResponseFormatter.formatApiResponse(response.data.apiCallResult);
        assistantMessage.formattedResponse = formatted;
      }

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        console.log('🔍 ChatInterface: Messages updated:', {
          totalMessages: newMessages.length,
          lastMessage: newMessages[newMessages.length - 1],
          hasApiCallResult: !!newMessages[newMessages.length - 1]?.apiCallResult,
          apiCallResult: newMessages[newMessages.length - 1]?.apiCallResult,
          apiCallResultUrl: newMessages[newMessages.length - 1]?.apiCallResult?.url,
          allMessages: newMessages.map(m => ({
            id: m.id,
            type: m.type,
            hasApiCallResult: !!m.apiCallResult,
            apiCallResultUrl: m.apiCallResult?.url,
            content: m.content?.substring(0, 50) + '...'
          }))
        });
        return newMessages;
      });
      
      // DEBUG: Log after state update to verify it worked
      console.log('🔍 ChatInterface: State update completed, checking if new message was added...');

      // Call the callback if provided
      if (onWorkflowGenerated && response.data.workflow && response.data.steps) {
        onWorkflowGenerated(response.data.workflow, response.data.steps);
      }
      
      // Reset loading state after successful processing
      console.log('🔍 ChatInterface: About to clear timeout and set isLoading to false after success');
      clearTimeout(loadingTimeout);
      console.log('🔍 ChatInterface: Setting isLoading to false after success');
      setIsLoading(false);
      console.log('🔍 ChatInterface: Successfully set isLoading to false');

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
      
      // Reset loading state after error processing
      clearTimeout(loadingTimeout);
      console.log('🔍 ChatInterface: Setting isLoading to false after error');
      setIsLoading(false);
    }
  };


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

  const handleSetupConnection = useCallback((api: any) => {
    console.log('🔍 ChatInterface: handleSetupConnection called with api:', api);
    
    // Find the message that contains the connection guidance for this API
    const guidanceMessage = messages.find(msg => 
      msg.type === 'assistant' && 
      msg.connectionGuidance && 
      msg.connectionGuidance.suggestedConnections?.some(conn => conn.name === api.name)
    );
    
    console.log('🔍 ChatInterface: Found guidance message:', guidanceMessage?.id);
    
    setConnectionSetupApi(api);
    setConnectionSetupMessageId(guidanceMessage?.id || null);
    setShowConnectionSetup(true);
  }, [messages]);

  const handleCancelConnectionSetup = useCallback(() => {
    setShowConnectionSetup(false);
    setConnectionSetupApi(null);
    setConnectionSetupMessageId(null);
  }, []);

  const handleSaveConnection = useCallback(async (credentials: Record<string, string>) => {
    console.log('🔍 ChatInterface: handleSaveConnection called with credentials:', credentials);
    console.log('🔍 ChatInterface: connectionSetupApi:', connectionSetupApi);
    console.log('🔍 ChatInterface: connectionSetupMessageId:', connectionSetupMessageId);
    
    if (!connectionSetupApi || !connectionSetupMessageId) {
      console.log('🔍 ChatInterface: Missing connectionSetupApi or connectionSetupMessageId, returning early');
      return;
    }

    console.log('🔍 ChatInterface: Starting to save connection...');
    setIsSavingConnection(true);
    try {
      // First, create the connection
      const connectionResponse = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: connectionSetupApi.name,
          displayName: connectionSetupApi.displayName,
          description: connectionSetupApi.description,
          authType: connectionSetupApi.authType,
          baseUrl: connectionSetupApi.baseUrl,
          documentationUrl: connectionSetupApi.documentationUrl
        })
      });

      if (!connectionResponse.ok) {
        const error = await connectionResponse.json();
        throw new Error(error.message || 'Failed to create connection');
      }

      const connection = await connectionResponse.json();
      
      // Then, add the secrets/credentials
      if (Object.keys(credentials).length > 0) {
        for (const [key, value] of Object.entries(credentials)) {
          const secretResponse = await fetch(`/api/connections/${connection.data.id}/secrets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: key,
              value: value,
              type: connectionSetupApi.authType,
              description: `${connectionSetupApi.displayName} ${key}`,
              enableRotation: false
            })
          });

          if (!secretResponse.ok) {
            const error = await secretResponse.json();
            console.error('Failed to save secret:', error);
            // Continue with other secrets even if one fails
          }
        }
      }
      
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
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
            data-testid="chat-message"
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-3 sm:px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm">{sanitizeForChat(message.content)}</div>
              <div className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-indigo-200' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </div>
              
              {/* Connection Guidance */}
              {message.connectionGuidance && message.type === 'assistant' && (
                <div className="mt-3">
                  <ConnectionGuidance 
                    message={message.content} 
                    connectionGuidance={message.connectionGuidance}
                    onSetupClick={handleSetupConnection}
                  />
                </div>
              )}
              
              {/* Confidence Confirmation */}
              {message.confidenceConfirmation && message.type === 'assistant' && (
                <div className="mt-3">
                  <ConfidenceConfirmation
                    confidence={message.confidenceConfirmation.confidence}
                    uncertaintyType={message.confidenceConfirmation.uncertaintyType}
                    explanation={message.confidenceConfirmation.explanation}
                    suggestions={message.confidenceConfirmation.suggestions}
                    originalResponse={message.confidenceConfirmation.originalResponse}
                    onConfirm={(selectedOption) => handleConfidenceConfirm(message.id, selectedOption)}
                    onCancel={() => handleConfidenceCancel(message.id)}
                    onRefine={() => handleConfidenceRefine(message.id)}
                  />
                </div>
              )}
              
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

              {/* Direct API call result */}
              {message.apiCallResult && message.type === 'assistant' && (
                <div 
                  className="mt-3 p-3 bg-white rounded border border-gray-200" 
                  data-testid="api-call-result"
                >
                  {(() => {
                    console.log('🔍 ChatInterface: Rendering API call result:', {
                      messageId: message.id,
                      hasApiCallResult: !!message.apiCallResult,
                      apiCallResult: message.apiCallResult
                    });
                    return null;
                  })()}
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
                          {message.apiCallResult.statusCode >= 400 && message.apiCallResult.error ? (
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
            <div className="bg-gray-100 text-gray-900 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-3 sm:px-4 py-2 rounded-lg">
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
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
         <form 
           onSubmit={handleSubmit} 
           className="flex flex-col sm:flex-row gap-2 sm:gap-3"
           data-testid="chat-form"
         >
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              data-testid="chat-input"
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Describe what you want to automate..."
              disabled={isLoading}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 text-sm sm:text-base min-h-[44px]"
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
              // Directly call handleSubmit to bypass form submission issues
              await handleSubmit(e);
            }}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md min-h-[44px] w-full sm:w-auto"
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