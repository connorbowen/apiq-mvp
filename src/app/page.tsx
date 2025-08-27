'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WaitlistSignup from '../components/WaitlistSignup';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [userOnboardingStage, setUserOnboardingStage] = useState<string | null>(null);
  const router = useRouter();

  // Check user onboarding state on component mount
  useEffect(() => {
    const checkUserState = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setUserOnboardingStage(data.user?.onboardingStage || null);
        }
      } catch (error) {
        // User not logged in or error - treat as new user
        setUserOnboardingStage(null);
      }
    };

    checkUserState();
  }, []);

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

  // Determine the appropriate destination based on user state
  const getChatDestination = () => {
    if (userOnboardingStage === 'NEW_USER' || userOnboardingStage === null) {
      return '/dashboard?tour=true'; // Redirect to guided tour for new users
    }
    return '/dashboard'; // Direct to chat for returning users
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
              {userOnboardingStage ? (
                <>
                  <Link
                    href={getChatDestination()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                  >
                    {userOnboardingStage === 'NEW_USER' ? 'Start Tour' : 'Try Chat'}
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <a
                  href="#waitlist"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  Join Waitlist
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="px-4 py-12 sm:px-0 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl mb-6">
              Just Ask, We&apos;ll Connect
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Automatically ingest API schemas, chat with your APIs using natural language, and create complex workflows across multiple services. 
              No more manual API integration - just describe what you want and let AI orchestrate everything.
            </p>
            
            {userOnboardingStage ? (
              <div className="flex justify-center space-x-4">
                <Link
                  href={getChatDestination()}
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                  data-testid="primary-action start-chat"
                >
                  {userOnboardingStage === 'NEW_USER' ? 'Start Your Journey' : 'Start Chatting'}
                </Link>
              </div>
            ) : (
              <div className="flex justify-center space-x-4">
                <a
                  href="#waitlist"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                  data-testid="primary-action join-waitlist"
                >
                  Join Waitlist
                </a>
                <a
                  href="#examples"
                  className="inline-flex items-center px-8 py-4 border border-gray-300 text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  See Examples
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="px-4 py-12 sm:px-0">
          <div className="text-center mb-8">
            <p className="text-lg text-gray-600 mb-4">Trusted by teams at</p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="text-2xl font-bold text-gray-400">Company A</div>
              <div className="text-2xl font-bold text-gray-400">Company B</div>
              <div className="text-2xl font-bold text-gray-400">Company C</div>
            </div>
          </div>
        </div>

        {/* Chat Demo Section */}
        <div className="px-4 py-12 sm:px-0">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-purple-600">
                <h3 className="text-lg font-medium text-white">See It In Action</h3>
                <p className="text-sm text-indigo-100 mt-1">Just describe what you want to do</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg bg-indigo-600 text-white">
                    <div className="text-sm">&quot;When a new customer signs up, add them to our CRM and send a welcome email&quot;</div>
                    <div className="text-xs text-indigo-200 mt-1">2:30 PM</div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg bg-gray-100 text-gray-900">
                    <div className="text-sm">I&apos;ll help you create a workflow that:</div>
                    <div className="text-sm mt-2 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span>Monitors for new customer signups</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span>Adds customer to your CRM system</span>
                      </div>
                      <div className="flex items-center space-x-2">
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

        {/* Core Value Section */}
        <div id="examples" className="px-4 py-12 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Core Value: API Schema Ingestion & Workflow Creation
            </h2>
            <p className="text-xl text-gray-600">
              The foundation of what makes APIQ powerful
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Core Value 1 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-500 text-white mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">API Schema Ingestion</h3>
              </div>
              <p className="text-sm text-gray-700">
                Automatically ingest and understand API schemas from OpenAPI, GraphQL, or custom formats. No manual configuration needed.
              </p>
            </div>

            {/* Core Value 2 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-500 text-white mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Natural Language Chat</h3>
              </div>
              <p className="text-sm text-gray-700">
                Chat with your APIs using natural language. Ask questions, request data, and describe workflows in plain English.
              </p>
            </div>

            {/* Core Value 3 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-500 text-white mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Workflow Creation</h3>
              </div>
              <p className="text-sm text-gray-700">
                Automatically generate and orchestrate complex workflows across multiple APIs. Transform, combine, and automate data flows.
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="px-4 py-12 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple, powerful, and intelligent
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="pt-6">
              <div className="flow-root bg-white rounded-xl px-6 pb-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-lg shadow-lg">
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
              <div className="flow-root bg-white rounded-xl px-6 pb-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-lg shadow-lg">
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
              <div className="flow-root bg-white rounded-xl px-6 pb-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-lg shadow-lg">
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

        {/* Waitlist Section */}
        <div id="waitlist" className="px-4 py-16 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get Early Access
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're building the future of API orchestration. Join our waitlist to be among the first to experience APIQ when we launch. 
              Get exclusive early access, special pricing, and help shape the product.
            </p>
            <div className="mt-6 text-sm text-gray-500">
              <p>Currently in development - not yet available for production use</p>
            </div>
          </div>
          
          <WaitlistSignup />
        </div>

        {/* CTA Section */}
        <div className="px-4 py-16 sm:px-0">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your API Workflows?
            </h2>
            <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
              Join thousands of developers who are already building smarter, faster integrations with APIQ.
            </p>
            <div className="flex justify-center space-x-4">
              {userOnboardingStage ? (
                <Link
                  href={getChatDestination()}
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-indigo-600 bg-white hover:bg-gray-50 transition-colors duration-200"
                  data-testid="primary-action cta-start"
                >
                  Start Building Now
                </Link>
              ) : (
                <a
                  href="#waitlist"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-indigo-600 bg-white hover:bg-gray-50 transition-colors duration-200"
                  data-testid="primary-action cta-waitlist"
                >
                  Join Waitlist
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Health Status - Only show for logged in users */}
        {userOnboardingStage && healthStatus && (
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
