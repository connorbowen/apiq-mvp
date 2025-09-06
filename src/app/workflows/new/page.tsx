'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkflowBuilder from '../../../components/WorkflowBuilder';

export default function NewWorkflowPage() {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleSave = async (workflow: any) => {
    setIsCreating(true);
    try {
      // Redirect to the workflows list after successful creation
      router.push('/workflows');
    } catch (error) {
      console.error('Failed to create workflow:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.push('/workflows');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Workflow</h1>
          <h2 className="text-xl font-semibold text-gray-800 mt-4">Visual Workflow Builder</h2>
          <p className="text-gray-600 mt-2">
            Build your workflow step by step using the visual builder. Configure API calls, parameters, and data flow.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <WorkflowBuilder 
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
