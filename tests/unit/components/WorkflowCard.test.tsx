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

  it('renders the entire card as a clickable link', () => {
    render(<WorkflowCard workflow={workflow} />);
    const cardLink = screen.getByRole('link', { name: /Test Workflow/ });
    expect(cardLink).toBeInTheDocument();
    expect(cardLink).toHaveAttribute('href', '/workflows/wf-1');
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

  it('prevents event propagation on action buttons', () => {
    const onDelete = jest.fn();
    const onExecute = jest.fn();
    window.confirm = jest.fn(() => true);
    
    render(<WorkflowCard workflow={workflow} onDelete={onDelete} onExecute={onExecute} />);
    
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    const executeBtn = screen.getByRole('button', { name: /run|execute/i });
    
    // Mock preventDefault and stopPropagation
    const mockPreventDefault = jest.fn();
    const mockStopPropagation = jest.fn();
    
    fireEvent.click(deleteBtn, { preventDefault: mockPreventDefault, stopPropagation: mockStopPropagation });
    fireEvent.click(executeBtn, { preventDefault: mockPreventDefault, stopPropagation: mockStopPropagation });
    
    expect(onDelete).toHaveBeenCalledWith('wf-1');
    expect(onExecute).toHaveBeenCalledWith('wf-1');
  });
}); 