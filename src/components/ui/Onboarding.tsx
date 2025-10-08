import React from 'react';

// Progress Indicator Component
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  className = ''
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// Step Navigation Component
interface StepNavigationProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  onComplete?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  canSkip?: boolean;
  className?: string;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  onPrevious,
  onNext,
  onSkip,
  onComplete,
  isFirstStep = false,
  isLastStep = false,
  canSkip = true,
  className = ''
}) => (
  <div className={`flex justify-between items-center ${className}`}>
    <div className="flex space-x-3">
      {!isFirstStep && onPrevious && (
        <button
          onClick={onPrevious}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Previous
        </button>
      )}
      {canSkip && onSkip && (
        <button
          onClick={onSkip}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Skip
        </button>
      )}
    </div>
    
    <div className="flex space-x-3">
      {isLastStep ? (
        onComplete && (
          <button
            onClick={onComplete}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Complete
          </button>
        )
      ) : (
        onNext && (
          <button
            onClick={onNext}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Next
          </button>
        )
      )}
    </div>
  </div>
);

// Feature Unlock Component
interface FeatureUnlockProps {
  feature: string;
  isUnlocked: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const FeatureUnlock: React.FC<FeatureUnlockProps> = ({
  feature,
  isUnlocked,
  children,
  fallback,
  className = ''
}) => {
  if (isUnlocked) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
        <div className="text-center p-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Complete onboarding to unlock {feature}</p>
        </div>
      </div>
    </div>
  );
};

// Onboarding Stage Component
interface OnboardingStageProps {
  stage: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
  className?: string;
}

export const OnboardingStage: React.FC<OnboardingStageProps> = ({
  stage,
  title,
  description,
  isCompleted,
  isCurrent,
  className = ''
}) => (
  <div className={`flex items-start space-x-3 ${className}`}>
    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
      isCompleted 
        ? 'bg-green-100 text-green-600' 
        : isCurrent 
        ? 'bg-indigo-100 text-indigo-600' 
        : 'bg-gray-100 text-gray-400'
    }`}>
      {isCompleted ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="text-sm font-medium">{stage}</span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className={`text-sm font-medium ${
        isCurrent ? 'text-indigo-900' : isCompleted ? 'text-green-900' : 'text-gray-500'
      }`}>
        {title}
      </h3>
      <p className={`text-sm ${
        isCurrent ? 'text-indigo-700' : isCompleted ? 'text-green-700' : 'text-gray-400'
      }`}>
        {description}
      </p>
    </div>
  </div>
);

// Onboarding Progress Component
interface OnboardingProgressProps {
  stages: Array<{
    key: string;
    title: string;
    description: string;
    completed: boolean;
  }>;
  currentStage: string;
  className?: string;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  stages,
  currentStage,
  className = ''
}) => {
  const currentStageIndex = stages.findIndex(s => s.key === currentStage);
  const isCompleted = stages.every(s => s.completed);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isCompleted ? 'Onboarding Complete!' : 'Getting Started'}
        </h3>
        {!isCompleted && (
          <p className="text-sm text-gray-600">
            Complete these steps to unlock all features
          </p>
        )}
      </div>
      
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <OnboardingStage
            key={stage.key}
            stage={(index + 1).toString()}
            title={stage.title}
            description={stage.description}
            isCompleted={stage.completed}
            isCurrent={stage.key === currentStage}
          />
        ))}
      </div>
    </div>
  );
};

// Welcome Banner Component
interface WelcomeBannerProps {
  title: string;
  description: string;
  onDismiss?: () => void;
  className?: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  title,
  description,
  onDismiss,
  className = ''
}) => (
  <div className={`bg-indigo-50 border border-indigo-200 rounded-lg p-4 ${className}`}>
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-indigo-900 mb-1">
          {title}
        </h3>
        <p className="text-sm text-indigo-700">
          {description}
        </p>
      </div>
      {onDismiss && (
        <div className="flex-shrink-0">
          <button
            onClick={onDismiss}
            className="text-indigo-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  </div>
);
