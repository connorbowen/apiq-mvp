import React from 'react';

// Hero Section Component
interface HeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  description,
  icon,
  actions,
  className = ''
}) => (
  <div className={`text-center py-6 ${className}`}>
    {icon && (
      <div className="mx-auto h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
        {icon}
      </div>
    )}
    <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
    {subtitle && (
      <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
    )}
    {description && (
      <p className="text-xs text-gray-500 mb-4 max-w-xl mx-auto">
        {description}
      </p>
    )}
    {actions && (
      <div className="flex justify-center space-x-3">
        {actions}
      </div>
    )}
  </div>
);

// Welcome Section Component (specific to your chat interface)
interface WelcomeSectionProps {
  onExampleClick: (example: string) => void;
  className?: string;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({
  onExampleClick,
  className = ''
}) => {
  const examples = [
    "When a new customer signs up, add them to our CRM and send a welcome email",
    "Create a workflow that syncs inventory between our store and warehouse",
    "Set up an alert when our server CPU usage goes above 80%",
    "Automate sending follow-up emails to leads who haven't responded in 3 days"
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hero Section */}
      <Hero
        title="Welcome to APIQ! 🚀"
        subtitle="Your AI automation assistant"
        description="Connect APIs, create workflows, and automate tasks in plain English."
        icon={
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />
      
      {/* Examples Section */}
      <div data-testid="chat-examples">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Try these examples:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => onExampleClick(example)}
              className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors duration-200"
              data-testid={`example-${index}`}
            >
              <p className="text-sm text-gray-700">{example}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Feature Highlight Component
interface FeatureHighlightProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export const FeatureHighlight: React.FC<FeatureHighlightProps> = ({
  icon,
  title,
  description,
  className = ''
}) => (
  <div className={`flex items-start space-x-3 ${className}`}>
    <div className="flex-shrink-0">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        {icon}
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-blue-900 mb-1">
        {title}
      </h3>
      <p className="text-sm text-blue-700">
        {description}
      </p>
    </div>
  </div>
);

// Gradient Background Component
interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'blue' | 'indigo' | 'purple' | 'green';
  className?: string;
}

const gradientVariants = {
  blue: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100',
  indigo: 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100',
  purple: 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100',
  green: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100'
};

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'blue',
  className = ''
}) => (
  <div className={`rounded-xl border shadow-sm ${gradientVariants[variant]} ${className}`}>
    {children}
  </div>
);
