import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock fetch globally for all tests in this file
if (!global.fetch) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })) as any;
}

// Mock the apiClient
const mockGenerateWorkflow = jest.fn();
jest.mock('../../../src/lib/api/client', () => ({
  apiClient: {
    generateWorkflow: mockGenerateWorkflow
  }
}));

describe('ChatInterface Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockGenerateWorkflow as any).mockResolvedValue({
      success: true,
      workflow: { id: 'test-workflow-id', steps: [] }
    });
  });

  function getSubmitButton() {
    return screen.getAllByRole('button', { name: /send/i }).find(btn => btn.getAttribute('type') === 'submit');
  }

  it('renders chat interface with input and send button', () => {
    const ChatInterface = require('../../../src/components/ChatInterface').default;
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText(/describe what you want to automate/i)).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  it('displays quick examples', () => {
    const ChatInterface = require('../../../src/components/ChatInterface').default;
    render(<ChatInterface />);
    expect(screen.getByText(/when a new customer signs up, add them to our crm/i)).toBeInTheDocument();
    expect(screen.getByText(/get the latest orders from our e-commerce api/i)).toBeInTheDocument();
    expect(screen.getByText(/monitor our github repository for new issues/i)).toBeInTheDocument();
    expect(screen.getByText(/send me a daily summary of our sales data/i)).toBeInTheDocument();
  });

  it('handles form submission with user input', async () => {
    const ChatInterface = require('../../../src/components/ChatInterface').default;
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/describe what you want to automate/i);
    const submitButton = getSubmitButton();
    fireEvent.change(input, { target: { value: 'Test user input' } });
    fireEvent.click(submitButton!);
    await waitFor(() => {
      expect(mockGenerateWorkflow).toHaveBeenCalledWith('Test user input');
    });
  });

  it('handles quick example selection', async () => {
    const ChatInterface = require('../../../src/components/ChatInterface').default;
    render(<ChatInterface />);
    const crmExample = screen.getByText(/when a new customer signs up, add them to our crm/i);
    fireEvent.click(crmExample);
    const submitButton = getSubmitButton();
    fireEvent.click(submitButton!);
    await waitFor(() => {
      expect(mockGenerateWorkflow).toHaveBeenCalledWith(expect.stringContaining('customer'));
    });
  });

  it('shows loading state during submission', async () => {
    (mockGenerateWorkflow as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, workflow: { id: 'test' } }), 100))
    );
    const ChatInterface = require('../../../src/components/ChatInterface').default;
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/describe what you want to automate/i);
    const submitButton = getSubmitButton();
    fireEvent.change(input, { target: { value: 'Test input' } });
    fireEvent.click(submitButton!);
    expect(screen.getByText(/creating your workflow/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGenerateWorkflow).toHaveBeenCalled();
    });
  });
}); 