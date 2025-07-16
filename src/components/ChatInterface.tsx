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
}

interface ChatInterfaceProps {
  onWorkflowGenerated?: (workflow: any, steps: any[]) => void;
}

/**
 *  - CHAT INTERFACE PHASE 1 & 2 CHANGES - @connorbowen 2024-12-19
 * 
 * PHASE 1.2: Make Chat the default tab ✅ COMPLETED
 * - [x] Enhance welcome message for new users
 * - [x] Add quick start examples prominently displayed
 * - [x] Improve first-time user experience
 * - [ ] Add tests: tests/unit/components/ChatInterface.test.tsx - test default tab behavior
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test chat as default landing
 * 
 * PHASE 2.1: Redesign dashboard layout with 3-tab structure
 * - [ ] INTEGRATE: Move quick actions from OverviewTab to Chat header
 * - [ ] INTEGRATE: Add status metrics from OverviewTab to Chat sidebar
 * - [ ] INTEGRATE: Show recent workflow activity in Chat interface
 * - [ ] Create ChatHeader component with integrated metrics
 * - [ ] Create ChatSidebar component for status and activity
 * - [ ] Add tests: tests/unit/components/ChatHeader.test.tsx
 * - [ ] Add tests: tests/unit/components/ChatSidebar.test.tsx
 * 
 * PHASE 2.2: Progressive disclosure
 * - [ ] Show different examples based on user onboarding stage
 * - [ ] Progressive reveal of advanced features
 * - [ ] Contextual help based on user progress
 * - [ ] Add tests: tests/unit/components/ProgressiveDisclosure.test.tsx
 * 
 * PHASE 2.4: Guided tour integration
 * - [ ] Add tour step highlighting for Chat interface
 * - [ ] Interactive tutorial for first workflow creation
 * - [ ] Tooltip guidance for new users
 * - [ ] Add tests: tests/unit/components/GuidedTour.test.tsx - test chat tour steps
 * 
 * PHASE 3.1: Mobile optimization
 * - [ ] Optimize chat interface for mobile screens
 * - [ ] Implement mobile-friendly input methods
 * - [ ] Add tests: tests/e2e/ui/navigation.test.ts - test mobile chat experience
 */

const ChatInterface: React.FC<ChatInterfaceProps> = React.memo(({
  onWorkflowGenerated,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Chat with AI</h3>
        <p className="text-sm text-gray-500 mt-1">
          Describe what you want to automate in plain English
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            {/* Welcome Header */}
            <div className="mb-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{welcomeMessage.title}</h2>
              <p className="text-lg text-gray-600 mb-2">{welcomeMessage.subtitle}</p>
              <p className="text-sm text-gray-500">{welcomeMessage.description}</p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
              {welcomeMessage.features.map((feature, index) => (
                <div key={index} className="flex items-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <svg className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
            
            {/* Quick Examples */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Try one of these examples:</p>
              <div className="space-y-2 max-w-2xl mx-auto">
                {quickExamples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickExample(example)}
                    className="block w-full text-left p-4 text-sm text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-700 transition-all duration-200 shadow-sm"
                  >
                    &quot;{example}&quot;
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
                  
                  <div className="flex space-x-2">
                    <button className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">
                      Save Workflow
                    </button>
                    <button className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300">
                      Edit
                    </button>
                  </div>
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
      <div className="px-6 py-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Describe what you want to automate..."
            disabled={isLoading}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </>
            )}
          </button>
        </form>
        
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface; 