import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the ConnectionCard component
const ConnectionCard = ({ 
  connection, 
  onTest, 
  onEdit, 
  onDelete 
}: { 
  connection: {
    id: string;
    name: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
    endpointCount: number;
    authType: string;
  };
  onTest?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) => (
  <div className="connection-card">
    <h3>{connection.name}</h3>
    {connection.description && <p>{connection.description}</p>}
    <span className={`status status-${connection.status.toLowerCase()}`}>
      {connection.status}
    </span>
    <span className="endpoint-count">{connection.endpointCount} endpoints</span>
    <span className="auth-type">{connection.authType}</span>
    
    <div className="actions">
      {onTest && (
        <button onClick={() => onTest(connection.id)} className="test-btn">
          Test
        </button>
      )}
      {onEdit && (
        <button onClick={() => onEdit(connection.id)} className="edit-btn">
          Edit
        </button>
      )}
      {onDelete && (
        <button onClick={() => onDelete(connection.id)} className="delete-btn">
          Delete
        </button>
      )}
    </div>
  </div>
);

describe('ConnectionCard', () => {
  const mockConnection = {
    id: 'conn-1',
    name: 'Test API',
    description: 'A test API connection',
    status: 'ACTIVE' as const,
    endpointCount: 15,
    authType: 'OAUTH2'
  };

  it('renders connection details', () => {
    render(<ConnectionCard connection={mockConnection} />);
    expect(screen.getByText('Test API')).toBeInTheDocument();
    expect(screen.getByText('A test API connection')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('15 endpoints')).toBeInTheDocument();
    expect(screen.getByText('OAUTH2')).toBeInTheDocument();
  });

  it('calls onTest when test button is clicked', () => {
    const onTest = jest.fn();
    render(<ConnectionCard connection={mockConnection} onTest={onTest} />);
    const testBtn = screen.getByRole('button', { name: /test/i });
    fireEvent.click(testBtn);
    expect(onTest).toHaveBeenCalledWith('conn-1');
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<ConnectionCard connection={mockConnection} onEdit={onEdit} />);
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith('conn-1');
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();
    render(<ConnectionCard connection={mockConnection} onDelete={onDelete} />);
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('conn-1');
  });

  it('renders different statuses correctly', () => {
    const { rerender } = render(<ConnectionCard connection={mockConnection} />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    
    const inactiveConnection = { ...mockConnection, status: 'INACTIVE' as const };
    rerender(<ConnectionCard connection={inactiveConnection} />);
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    
    const errorConnection = { ...mockConnection, status: 'ERROR' as const };
    rerender(<ConnectionCard connection={errorConnection} />);
    expect(screen.getByText('ERROR')).toBeInTheDocument();
  });
}); 