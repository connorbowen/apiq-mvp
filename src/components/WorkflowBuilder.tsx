'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api/client';

interface WorkflowStep {
  id?: string;
  stepOrder: number;
  name: string;
  description?: string;
  action: string;
  apiConnectionId?: string;
  parameters: Record<string, any>;
  conditions?: Record<string, any>;
  retryConfig?: Record<string, any>;
  timeout?: number;
}

interface WorkflowBuilderProps {
  workflow?: {
    id?: string;
    name: string;
    description?: string;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
    steps?: WorkflowStep[];
  };
  onSave?: (workflow: any) => void;
  onCancel?: () => void;
}

export default function WorkflowBuilder({ workflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [formData, setFormData] = useState({
    name: workflow?.name || '',
    description: workflow?.description || '',
    status: workflow?.status || 'DRAFT' as const
  });
  
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps || []);
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const response = await apiClient.getConnections();
      if (response.success && response.data) {
        setConnections(response.data.connections || []);
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      stepOrder: steps.length + 1,
      name: `Step ${steps.length + 1}`,
      description: '',
      action: '',
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
      // Reorder steps
      return newSteps.map((step, i) => ({ ...step, stepOrder: i + 1 }));
    });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    setSteps(prev => {
      const newSteps = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap steps
      [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
      
      // Update step orders
      return newSteps.map((step, i) => ({ ...step, stepOrder: i + 1 }));
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Workflow name is required');
      return;
    }

    if (steps.length === 0) {
      setError('At least one step is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const workflowData = {
        ...formData,
        steps: steps.map(step => ({
          ...step,
          parameters: step.parameters || {},
          conditions: step.conditions || {},
          retryConfig: step.retryConfig || {}
        }))
      };

      if (workflow?.id) {
        // Update existing workflow
        const response = await apiClient.updateWorkflow(workflow.id, {
          name: workflowData.name,
          description: workflowData.description,
          status: workflowData.status
        });
        
        if (response.success) {
          onSave?.(response.data);
        } else {
          throw new Error(response.error || 'Failed to update workflow');
        }
      } else {
        // Create new workflow
        const response = await apiClient.createWorkflow({
          name: workflowData.name,
          description: workflowData.description,
          isPublic: false
        });
        
        if (response.success) {
          onSave?.(response.data);
        } else {
          throw new Error(response.error || 'Failed to create workflow');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {workflow?.id ? 'Edit Workflow' : 'Create New Workflow'}
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Workflow Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter workflow name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe what this workflow does"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">Workflow Steps</h4>
            <button
              onClick={addStep}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Step
            </button>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No steps added yet</p>
              <p className="text-sm">Click "Add Step" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 text-xs font-medium rounded-full">
                        {step.stepOrder}
                      </span>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(index, 'name', e.target.value)}
                        className="text-sm font-medium border-none bg-transparent focus:outline-none focus:ring-0"
                        placeholder="Step name"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => moveStep(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveStep(index, 'down')}
                        disabled={index === steps.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeStep(index)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={step.description || ''}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        className="block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="What this step does"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">API Connection</label>
                      <select
                        value={step.apiConnectionId || ''}
                        onChange={(e) => updateStep(index, 'apiConnectionId', e.target.value || undefined)}
                        className="block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select API</option>
                        {connections.map(conn => (
                          <option key={conn.id} value={conn.id}>
                            {conn.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                      <input
                        type="text"
                        value={step.action}
                        onChange={(e) => updateStep(index, 'action', e.target.value)}
                        className="block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., GET /users, POST /data"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                      <input
                        type="number"
                        value={step.timeout || 30}
                        onChange={(e) => updateStep(index, 'timeout', parseInt(e.target.value) || 30)}
                        className="block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        min="1"
                        max="300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isLoading || !formData.name.trim() || steps.length === 0}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
} 