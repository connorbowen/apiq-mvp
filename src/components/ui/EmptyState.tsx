import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Default empty state icons
const defaultIcons = {
  connections: (
    <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  workflows: (
    <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  secrets: (
    <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  search: (
    <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  error: (
    <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => (
  <div className={`text-center py-12 ${className}`}>
    <div className="flex justify-center mb-4">
      {icon || defaultIcons.search}
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    {description && (
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
    )}
    {action && (
      <div className="flex justify-center">
        {action}
      </div>
    )}
  </div>
);

// Specific empty states for your use cases
interface ConnectionsEmptyStateProps {
  onCreateConnection: () => void;
  className?: string;
}

export const ConnectionsEmptyState: React.FC<ConnectionsEmptyStateProps> = ({
  onCreateConnection,
  className = ''
}) => (
  <EmptyState
    icon={defaultIcons.connections}
    title="No API Connections"
    description="Connect to your first API to start building workflows and automating tasks."
    action={
      <button
        onClick={onCreateConnection}
        data-testid="primary-action create-connection-empty-btn"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create Your First Connection
      </button>
    }
    className={className}
  />
);

interface WorkflowsEmptyStateProps {
  onCreateWorkflow: () => void;
  className?: string;
}

export const WorkflowsEmptyState: React.FC<WorkflowsEmptyStateProps> = ({
  onCreateWorkflow,
  className = ''
}) => (
  <EmptyState
    icon={defaultIcons.workflows}
    title="No Workflows Yet"
    description="Create your first workflow to automate tasks and connect your APIs."
    action={
      <button
        onClick={onCreateWorkflow}
        data-testid="primary-action create-workflow-btn"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create Your First Workflow
      </button>
    }
    className={className}
  />
);

interface SecretsEmptyStateProps {
  onCreateSecret: () => void;
  className?: string;
}

export const SecretsEmptyState: React.FC<SecretsEmptyStateProps> = ({
  onCreateSecret,
  className = ''
}) => (
  <EmptyState
    icon={defaultIcons.secrets}
    title="No Secrets Stored"
    description="Store your API keys and credentials securely to use in your workflows."
    action={
      <button
        onClick={onCreateSecret}
        data-testid="primary-action create-secret-btn"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Store Your First Secret
      </button>
    }
    className={className}
  />
);

interface SearchEmptyStateProps {
  searchTerm: string;
  onClearSearch: () => void;
  className?: string;
}

export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({
  searchTerm,
  onClearSearch,
  className = ''
}) => (
  <EmptyState
    icon={defaultIcons.search}
    title={`No results for "${searchTerm}"`}
    description="Try adjusting your search terms or filters to find what you're looking for."
    action={
      <button
        onClick={onClearSearch}
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Clear Search
      </button>
    }
    className={className}
  />
);
