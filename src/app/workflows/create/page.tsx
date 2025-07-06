import NaturalLanguageWorkflowChat from '../../../components/NaturalLanguageWorkflowChat';

export default function CreateWorkflowPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Workflow</h1>
          <p className="text-gray-600 mt-2">
            Use AI to create workflows by describing what you want to automate in plain English.
          </p>
        </div>
        
        <NaturalLanguageWorkflowChat />
      </div>
    </div>
  );
} 