'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      setHealthStatus({
        success: false,
        error: 'Failed to connect to API',
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">APIQ</h1>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">AI-Powered API Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Try Chat
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              Just Ask, We'll Connect
            </h2>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Describe what you want to do with your APIs in plain English. Our AI understands your intent and orchestrates the complex connections for you.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Start Chatting
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <a
                  href="#examples"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  See Examples
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Demo Section */}
        <div className="mt-16 px-4 sm:px-0">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Chat Interface</h3>
                <p className="text-sm text-gray-500 mt-1">Just describe what you want to do</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-indigo-600 text-white">
                    <div className="text-sm">"When a new customer signs up, add them to our CRM and send a welcome email"</div>
                    <div className="text-xs text-indigo-200 mt-1">2:30 PM</div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
                    <div className="text-sm">I'll help you create a workflow that:</div>
                    <div className="text-sm mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span>Monitors for new customer signups</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span>Adds customer to your CRM system</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span>Sends a personalized welcome email</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Ready to save and activate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Examples Section */}
        <div id="examples" className="mt-16 px-4 sm:px-0">
          <div className="text-center">
            <h3 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              What You Can Ask
            </h3>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Natural language examples that work right away
            </p>
          </div>

          <div className="mt-12">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Example 1 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-sm text-gray-600 mb-4">
                  "Get the latest orders from our e-commerce API and update our inventory system"
                </div>
                <div className="text-xs text-gray-500">
                  Creates a workflow that syncs order data with inventory management
                </div>
              </div>

              {/* Example 2 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-sm text-gray-600 mb-4">
                  "Monitor our GitHub repository for new issues and create Trello cards"
                </div>
                <div className="text-xs text-gray-500">
                  Automatically creates project management tasks from development issues
                </div>
              </div>

              {/* Example 3 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-sm text-gray-600 mb-4">
                  "Send me a daily summary of our sales data and customer feedback"
                </div>
                <div className="text-xs text-gray-500">
                  Generates automated reports combining multiple data sources
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 px-4 sm:px-0">
          <div className="text-center">
            <h3 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Why It Works
            </h3>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Simple, powerful, and intelligent
            </p>
          </div>

          <div className="mt-12">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Natural Language</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Just describe what you want in plain English. No technical jargon or complex configuration needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">AI-Powered</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Advanced AI understands your intent and automatically plans the optimal sequence of API calls.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Simple & Secure</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Clean, intuitive interface with enterprise-grade security for your API credentials and data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Status */}
        {healthStatus && (
          <div className="mt-8 px-4 sm:px-0">
            <div className={`rounded-lg p-4 ${
              healthStatus.success && healthStatus.status === 'healthy' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {healthStatus.success && healthStatus.status === 'healthy' ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    healthStatus.success && healthStatus.status === 'healthy' 
                      ? 'text-green-800' 
                      : 'text-red-800'
                  }`}>
                    System Health: {healthStatus.status || 'Unknown'}
                  </h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(healthStatus, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
