import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import WorkflowBuilder from '../../../src/components/WorkflowBuilder';

describe('WorkflowBuilder', () => {
  const baseWorkflow = {
    id: 'wf-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    status: 'DRAFT' as const,
    steps: [
      {
        stepOrder: 1,
        name: 'Step 1',
        description: 'First step',
        action: 'GET /users',
        parameters: {},
        timeout: 30
      }
    ]
  };

  it('renders workflow form fields', () => {
    render(<WorkflowBuilder workflow={baseWorkflow} />);
    expect(screen.getByLabelText(/Workflow Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Workflow Steps/i)).toBeInTheDocument();
  });

  it('renders existing steps', () => {
    render(<WorkflowBuilder workflow={baseWorkflow} />);
    expect(screen.getByDisplayValue('Step 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('First step')).toBeInTheDocument();
    expect(screen.getByDisplayValue('GET /users')).toBeInTheDocument();
  });

  it('can add a new step', () => {
    render(<WorkflowBuilder workflow={baseWorkflow} />);
    const addBtn = screen.getByRole('button', { name: /add step/i });
    fireEvent.click(addBtn);
    expect(screen.getAllByLabelText(/Description/i).length).toBeGreaterThan(1);
  });

  it('shows Save and Cancel buttons', () => {
    render(<WorkflowBuilder workflow={baseWorkflow} onCancel={jest.fn()} />);
    expect(screen.getByRole('button', { name: /save workflow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
}); 