import NaturalLanguageWorkflowChat from '../../../components/NaturalLanguageWorkflowChat';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Workflow',
  description: 'Use AI to create workflows by describing what you want to automate in plain English.',
};

export default function CreateWorkflowPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Workflow</h1>
          <h2 className="text-xl font-semibold text-gray-800 mt-4">Natural Language Workflow Creation</h2>
          <p className="text-gray-600 mt-2">
            Use AI to create workflows by describing what you want to automate in plain English.
          </p>
        </div>
        <NaturalLanguageWorkflowChat />
      </div>
    </div>
  );
} 