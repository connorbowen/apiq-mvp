'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { apiClient } from '../lib/api/client';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.generateWorkflow(inputMessage);
      
      if (response.success && response.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.data.explanation || 'I\'ve created a workflow for you!',
          timestamp: new Date(),
          workflow: response.data.workflow,
          steps: response.data.steps,
          explanation: response.data.explanation
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Call the callback if provided
        if (onWorkflowGenerated && response.data.workflow && response.data.steps) {
          onWorkflowGenerated(response.data.workflow, response.data.steps);
        }
      } else {
        throw new Error(response.error || 'Failed to generate workflow');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I'm sorry, I couldn't create that workflow. ${errorMessage}`,
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
      const response = await apiClient.createWorkflow({
        name: message.workflow.name,
        description: message.workflow.description,
        steps: message.steps || []
      });

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
            <div>
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
                    <div className="space-y-2">
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
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                      <div className="text-xs text-green-800">
                        ✅ Executed successfully
                      </div>
                      <div className="text-xs text-green-600">
                        Execution ID: {message.executionResult.executionId}
                      </div>
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
                <span className="text-sm">Creating your workflow...</span>
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
            data-testid="chat-send-button"
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
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
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface; 