'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api/client';

export const dynamic = 'force-dynamic';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  steps?: WorkflowStep[];
}

interface WorkflowStep {
  id?: string;
  stepOrder: number;
  name: string;
  description: string;
  method: string;
  endpoint: string;
  parameters: Record<string, any>;
  timeout: number;
}

export default function EditWorkflowPage() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'DRAFT' as const
  });
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const params = useParams();
  const router = useRouter();
  const workflowId = params?.workflowId as string;

  const loadWorkflow = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getWorkflow(workflowId);
      
      if (response.success && response.data) {
        const workflowData = response.data.workflow;
        setWorkflow(workflowData);
        setFormData({
          name: workflowData.name,
          description: workflowData.description || '',
          status: workflowData.status
        });
        setSteps(workflowData.steps || []);
      } else {
        setError(response.error || 'Failed to load workflow');
      }
    } catch (error) {
      setError('Failed to load workflow');
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    }
  }, [workflowId, loadWorkflow]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      stepOrder: steps.length + 1,
      name: `Step ${steps.length + 1}`,
      description: '',
      method: 'GET',
      endpoint: '',
      parameters: {},
      timeout: 30
    };
    setSteps(prev => [...prev, newStep]);
  };

  const updateStep = (index: number, field: string, value: any) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    ));
  };

  const removeStep = (index: number) => {
    setSteps(prev => {
      const newSteps = prev.filter((_, i) => i !== index);
      return newSteps.map((step, i) => ({ ...step, stepOrder: i + 1 }));
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Workflow name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await apiClient.updateWorkflow(workflowId, {
        name: formData.name,
        description: formData.description,
        status: formData.status
      });
      
      if (response.success) {
        router.push(`/workflows/${workflowId}`);
      } else {
        throw new Error(response.error || 'Failed to update workflow');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/workflows/${workflowId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/workflows"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                ← Back to Workflows
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Workflow not found</h3>
              <p className="mt-1 text-sm text-gray-500">
                The workflow you&apos;re looking for doesn&apos;t exist.
              </p>
              <div className="mt-6">
                <Link
                  href="/workflows"
                  className="text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  ← Back to Workflows
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="edit-workflow-page">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <Link
                    href="/workflows"
                    className="text-gray-400 hover:text-gray-500"
                  >
                    Workflows
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <Link
                      href={`/workflows/${workflowId}`}
                      className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      {workflow.name}
                    </Link>
                  </div>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-4 text-sm font-medium text-gray-500">Edit</span>
                  </div>
                </li>
              </ol>
            </nav>
            <div className="mt-2">
              <h1 className="text-3xl font-bold text-gray-900">Edit Workflow</h1>
              <p className="mt-1 text-sm text-gray-500">
                Update your workflow configuration and settings.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Form */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Workflow Configuration</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Update your workflow details and configuration.
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Workflow Name */}
                <div>
                  <label htmlFor="workflow-name" className="block text-sm font-medium text-gray-700">
                    Workflow Name *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="workflow-name"
                      name="workflow-name"
                      data-testid="workflow-name-input"
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter workflow name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                </div>

                {/* Workflow Description */}
                <div>
                  <label htmlFor="workflow-description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="workflow-description"
                      name="workflow-description"
                      data-testid="workflow-description-input"
                      rows={3}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Describe what this workflow does"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                </div>

                {/* Workflow Status */}
                <div>
                  <label htmlFor="workflow-status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <div className="mt-1">
                    <select
                      id="workflow-status"
                      name="workflow-status"
                      data-testid="workflow-status-select"
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Section */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Workflow Steps</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Configure the steps that make up your workflow.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addStep}
                    data-testid="add-step-btn"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Step
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                {steps.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No steps yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by adding a step to your workflow.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-900">Step {step.stepOrder}</h4>
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="text-red-600 hover:text-red-500 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Step Name</label>
                            <input
                              type="text"
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              value={step.name}
                              onChange={(e) => updateStep(index, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                              rows={2}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              value={step.description}
                              onChange={(e) => updateStep(index, 'description', e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Method</label>
                              <select
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={step.method}
                                onChange={(e) => updateStep(index, 'method', e.target.value)}
                              >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                                <option value="PATCH">PATCH</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                              <input
                                type="text"
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="/api/endpoint"
                                value={step.endpoint}
                                onChange={(e) => updateStep(index, 'endpoint', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !formData.name.trim()}
              data-testid="save-workflow-btn"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
