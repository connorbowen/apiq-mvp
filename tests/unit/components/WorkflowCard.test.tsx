import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowCard from '../../../src/components/WorkflowCard';

describe('WorkflowCard', () => {
  const workflow = {
    id: 'wf-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    status: 'ACTIVE' as const,
    stepCount: 3,
    executionCount: 5,
    lastExecuted: '2024-01-01T12:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  it('renders workflow name, status, and description', () => {
    render(<WorkflowCard workflow={workflow} />);
    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('A test workflow')).toBeInTheDocument();
  });

  it('calls onDelete when delete is confirmed', () => {
    window.confirm = jest.fn(() => true);
    const onDelete = jest.fn();
    render(<WorkflowCard workflow={workflow} onDelete={onDelete} />);
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('wf-1');
  });

  it('calls onExecute when execute is clicked', () => {
    const onExecute = jest.fn();
    render(<WorkflowCard workflow={workflow} onExecute={onExecute} />);
    const executeBtn = screen.getByRole('button', { name: /run|execute/i });
    fireEvent.click(executeBtn);
    expect(onExecute).toHaveBeenCalledWith('wf-1');
  });
}); 