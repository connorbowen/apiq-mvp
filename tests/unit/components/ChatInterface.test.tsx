import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ChatInterface from '../../../src/components/ChatInterface';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';

// Mock the OpenAI service
jest.mock('../../../src/services/openaiService', () => ({
  generateWorkflow: jest.fn()
}));

describe('ChatInterface Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render chat interface with input field', () => {
    render(<ChatInterface />);
    
    expect(screen.getByPlaceholderText('Describe what you want to automate...')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /send/i })[0]).toBeInTheDocument();
  });

  it('should display welcome message and quick examples', () => {
    render(<ChatInterface />);
    
    expect(screen.getByText(/I can help you create workflows/i)).toBeInTheDocument();
    expect(screen.getByText(/When a new customer signs up, add them to our CRM and send a welcome email/i)).toBeInTheDocument();
    expect(screen.getByText(/Get the latest orders from our e-commerce API and update our inventory system/i)).toBeInTheDocument();
    expect(screen.getByText(/Monitor our GitHub repository for new issues and create Trello cards/i)).toBeInTheDocument();
    expect(screen.getByText(/Send me a daily summary of our sales data and customer feedback/i)).toBeInTheDocument();
  });

  it('should handle user input and submission', async () => {
    const mockGenerateWorkflow = jest.fn().mockResolvedValue({
      success: true,
      data: {
        workflow: {
          id: 'workflow-123',
          name: 'Test Workflow',
          steps: []
        }
      }
    });

    const { generateWorkflow } = require('../../../src/services/openaiService');
    generateWorkflow.mockImplementation(mockGenerateWorkflow);

    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Describe what you want to automate...');
    const sendButton = screen.getAllByRole('button', { name: /send/i })[0];
    
    fireEvent.change(input, { target: { value: 'Create a workflow for GitHub issues' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockGenerateWorkflow).toHaveBeenCalledWith('Create a workflow for GitHub issues');
    });
  });

  it('should display loading state during workflow generation', async () => {
    const mockGenerateWorkflow = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        data: { workflow: { id: 'workflow-123' } }
      }), 100))
    );

    const { generateWorkflow } = require('../../../src/services/openaiService');
    generateWorkflow.mockImplementation(mockGenerateWorkflow);

    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Describe what you want to automate...');
    const sendButton = screen.getAllByRole('button', { name: /send/i })[0];
    
    fireEvent.change(input, { target: { value: 'Test workflow' } });
    fireEvent.click(sendButton);
    
    expect(screen.getByText(/generating your workflow/i)).toBeInTheDocument();
  });

  it('should handle quick example clicks', () => {
    render(<ChatInterface />);
    
    const githubExample = screen.getByText(/Monitor our GitHub repository for new issues and create Trello cards/i);
    fireEvent.click(githubExample);
    
    const input = screen.getByPlaceholderText('Describe what you want to automate...');
    expect(input).toHaveValue('Monitor our GitHub repository for new issues and create Trello cards');
  });

  it('should display error message on workflow generation failure', async () => {
    const mockGenerateWorkflow = jest.fn().mockRejectedValue(new Error('API Error'));

    const { generateWorkflow } = require('../../../src/services/openaiService');
    generateWorkflow.mockImplementation(mockGenerateWorkflow);

    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Describe what you want to automate...');
    const sendButton = screen.getAllByRole('button', { name: /send/i })[0];
    
    fireEvent.change(input, { target: { value: 'Test workflow' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/sorry, i couldn't generate that workflow/i)).toBeInTheDocument();
    });
  });

  it('should clear input after successful submission', async () => {
    const mockGenerateWorkflow = jest.fn().mockResolvedValue({
      success: true,
      data: { workflow: { id: 'workflow-123' } }
    });

    const { generateWorkflow } = require('../../../src/services/openaiService');
    generateWorkflow.mockImplementation(mockGenerateWorkflow);

    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Describe what you want to automate...');
    const sendButton = screen.getAllByRole('button', { name: /send/i })[0];
    
    fireEvent.change(input, { target: { value: 'Test workflow' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('should disable send button when input is empty', () => {
    render(<ChatInterface />);
    
    const sendButton = screen.getAllByRole('button', { name: /send/i })[0];
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when input has content', () => {
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Describe what you want to automate...');
    const sendButton = screen.getAllByRole('button', { name: /send/i })[0];
    
    fireEvent.change(input, { target: { value: 'Test workflow' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('should handle Enter key press for submission', async () => {
    const mockGenerateWorkflow = jest.fn().mockResolvedValue({
      success: true,
      data: { workflow: { id: 'workflow-123' } }
    });

    const { generateWorkflow } = require('../../../src/services/openaiService');
    generateWorkflow.mockImplementation(mockGenerateWorkflow);

    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Describe what you want to automate...');
    
    fireEvent.change(input, { target: { value: 'Test workflow' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });
    
    await waitFor(() => {
      expect(mockGenerateWorkflow).toHaveBeenCalledWith('Test workflow');
    });
  });
}); 