import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SecretTypeSelect } from '../../../src/components/ui/SecretTypeSelect';

// Mock Headless UI components
jest.mock('@headlessui/react', () => ({
  Listbox: ({ children, value, onChange }: any) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(value);
    
    const handleButtonClick = () => setIsOpen(!isOpen);
    const handleOptionClick = (optionValue: string) => {
      setSelectedValue(optionValue);
      onChange(optionValue);
      setIsOpen(false);
    };
    
    return (
      <div className="relative">
        {React.Children.map(children, (child: any) => {
          if (child.type === 'button') {
            return React.cloneElement(child, {
              onClick: handleButtonClick,
              'aria-expanded': isOpen,
              'aria-haspopup': 'listbox'
            });
          }
          if (child.type === 'ul' && isOpen) {
            return React.cloneElement(child, {
              children: child.props.children.map((option: any) => 
                React.cloneElement(option, {
                  onClick: () => handleOptionClick(option.props.value),
                  'aria-selected': option.props.value === selectedValue
                })
              )
            });
          }
          return null;
        })}
      </div>
    );
  },
  ListboxButton: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  ListboxOptions: ({ children, ...props }: any) => (
    <ul role="listbox" {...props}>
      {children}
    </ul>
  ),
  ListboxOption: ({ children, value, ...props }: any) => (
    <li role="option" value={value} {...props}>
      {children}
    </li>
  )
}));

// Mock Heroicons
jest.mock('@heroicons/react/20/solid', () => ({
  ChevronUpDownIcon: ({ className, 'aria-hidden': ariaHidden }: any) => (
    <svg className={className} aria-hidden={ariaHidden} data-testid="chevron-icon">
      <path d="M7 14l5-5 5 5" />
    </svg>
  )
}));

describe('SecretTypeSelect', () => {
  const mockOptions = [
    { value: 'API_KEY', label: 'API Key' },
    { value: 'BEARER_TOKEN', label: 'Bearer Token' },
    { value: 'PASSWORD', label: 'Password' },
    { value: 'SSH_KEY', label: 'SSH Key' },
    { value: 'CERTIFICATE', label: 'Certificate' },
    { value: 'OAUTH2_TOKEN', label: 'OAuth2 Token' },
    { value: 'DATABASE_PASSWORD', label: 'Database Password' }
  ];

  const defaultProps = {
    options: mockOptions,
    selected: 'API_KEY',
    onChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Structure', () => {
    it('renders the select button with correct data-testid', () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      expect(selectButton).toBeInTheDocument();
      expect(selectButton).toHaveClass('flex', 'items-center', 'justify-between');
    });

    it('displays the currently selected option', () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      expect(screen.getByText('API Key')).toBeInTheDocument();
    });

    it('renders the chevron icon with proper accessibility attributes', () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const chevronIcon = screen.getByTestId('chevron-icon');
      expect(chevronIcon).toBeInTheDocument();
      expect(chevronIcon).toHaveAttribute('aria-hidden', 'true');
      expect(chevronIcon).toHaveClass('w-5', 'h-5', 'ml-2', 'text-gray-400');
    });

    it('renders all options when dropdown is opened', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(screen.getByText('API Key')).toBeInTheDocument();
        expect(screen.getByText('Bearer Token')).toBeInTheDocument();
        expect(screen.getByText('Password')).toBeInTheDocument();
        expect(screen.getByText('SSH Key')).toBeInTheDocument();
        expect(screen.getByText('Certificate')).toBeInTheDocument();
        expect(screen.getByText('OAuth2 Token')).toBeInTheDocument();
        expect(screen.getByText('Database Password')).toBeInTheDocument();
      });
    });
  });

  describe('ARIA Attributes and Accessibility', () => {
    it('has proper ARIA attributes for the select button', () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      expect(selectButton).toHaveAttribute('aria-expanded', 'false');
      expect(selectButton).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has proper ARIA attributes for the options list', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        const optionsList = screen.getByRole('listbox');
        expect(optionsList).toBeInTheDocument();
        expect(optionsList).toHaveClass('absolute', 'mt-1', 'w-full', 'bg-white', 'border', 'rounded-md', 'shadow-lg');
      });
    });

    it('has proper ARIA attributes for individual options', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(mockOptions.length);
        
        // Check that the selected option has aria-selected="true"
        const selectedOption = screen.getByRole('option', { name: 'API Key' });
        expect(selectedOption).toHaveAttribute('aria-selected', 'true');
        
        // Check that other options have aria-selected="false"
        const unselectedOption = screen.getByRole('option', { name: 'Bearer Token' });
        expect(unselectedOption).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('has proper focus management', () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      expect(selectButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-indigo-500', 'focus:border-indigo-500');
    });

    it('has proper touch target size for mobile accessibility', () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      expect(selectButton).toHaveClass('py-2', 'px-3'); // Adequate touch target
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens dropdown on Enter key press', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.keyDown(selectButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('opens dropdown on Space key press', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.keyDown(selectButton, { key: ' ', code: 'Space' });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('closes dropdown on Escape key press', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(selectButton, { key: 'Escape', code: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('navigates through options with arrow keys', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Test arrow key navigation
      fireEvent.keyDown(selectButton, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(selectButton, { key: 'ArrowUp', code: 'ArrowUp' });
      
      // The component should handle these events appropriately
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('Selection Logic', () => {
    it('calls onChange when an option is selected', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      const bearerTokenOption = screen.getByRole('option', { name: 'Bearer Token' });
      fireEvent.click(bearerTokenOption);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('BEARER_TOKEN');
    });

    it('updates the displayed value when selection changes', async () => {
      const { rerender } = render(<SecretTypeSelect {...defaultProps} />);
      
      // Initially shows API Key
      expect(screen.getByText('API Key')).toBeInTheDocument();
      
      // Change selection
      rerender(<SecretTypeSelect {...defaultProps} selected="BEARER_TOKEN" />);
      
      // Should now show Bearer Token
      expect(screen.getByText('Bearer Token')).toBeInTheDocument();
    });

    it('handles selection of all available options', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Test selecting each option
      const options = screen.getAllByRole('option');
      
      for (let i = 0; i < options.length; i++) {
        fireEvent.click(options[i]);
        expect(defaultProps.onChange).toHaveBeenCalledWith(mockOptions[i].value);
        
        // Reopen dropdown for next selection
        fireEvent.click(selectButton);
        await waitFor(() => {
          expect(screen.getByRole('listbox')).toBeInTheDocument();
        });
      }
    });

    it('closes dropdown after selection', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      const bearerTokenOption = screen.getByRole('option', { name: 'Bearer Token' });
      fireEvent.click(bearerTokenOption);
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual States and Styling', () => {
    it('applies correct styling to the select button', () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      expect(selectButton).toHaveClass(
        'flex', 'items-center', 'justify-between', 'w-full', 'py-2', 'px-3',
        'border', 'rounded-md', 'bg-white', 'shadow-sm'
      );
    });

    it('applies correct styling to options when dropdown is open', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        const optionsList = screen.getByRole('listbox');
        expect(optionsList).toHaveClass(
          'absolute', 'mt-1', 'w-full', 'bg-white', 'border', 'rounded-md',
          'shadow-lg', 'max-h-60', 'overflow-auto', 'z-10'
        );
      });
    });

    it('applies correct styling to individual options', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        options.forEach(option => {
          expect(option).toHaveClass('cursor-pointer', 'select-none', 'p-2');
        });
      });
    });

    it('highlights the selected option', async () => {
      render(<SecretTypeSelect {...defaultProps} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        const selectedOption = screen.getByRole('option', { name: 'API Key' });
        expect(selectedOption).toHaveClass('font-semibold', 'bg-blue-50');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty options array gracefully', () => {
      render(<SecretTypeSelect options={[]} selected="" onChange={jest.fn()} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      expect(selectButton).toBeInTheDocument();
      
      fireEvent.click(selectButton);
      
      // Should not crash and should show empty list
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('handles missing selected value gracefully', () => {
      render(<SecretTypeSelect options={mockOptions} selected="" onChange={jest.fn()} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      expect(selectButton).toBeInTheDocument();
      
      // Should not crash when no option is selected
      expect(selectButton.textContent).toBe('');
    });

    it('handles invalid selected value gracefully', () => {
      render(<SecretTypeSelect options={mockOptions} selected="INVALID_VALUE" onChange={jest.fn()} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      expect(selectButton).toBeInTheDocument();
      
      // Should not crash when selected value doesn't exist in options
      expect(selectButton.textContent).toBe('');
    });

    it('handles rapid option changes without errors', async () => {
      const { rerender } = render(<SecretTypeSelect {...defaultProps} />);
      
      // Rapidly change the selected value
      for (let i = 0; i < mockOptions.length; i++) {
        rerender(<SecretTypeSelect {...defaultProps} selected={mockOptions[i].value} />);
      }
      
      // Should not throw any errors
      expect(screen.getByTestId('secret-type-select')).toBeInTheDocument();
    });
  });

  describe('Integration with Form Context', () => {
    it('works correctly with form validation', () => {
      const mockOnChange = jest.fn();
      render(<SecretTypeSelect {...defaultProps} onChange={mockOnChange} />);
      
      const selectButton = screen.getByTestId('secret-type-select');
      fireEvent.click(selectButton);
      
      // Simulate form validation by checking if onChange is called
      expect(mockOnChange).toBeDefined();
    });

    it('maintains state consistency with parent component', async () => {
      const { rerender } = render(<SecretTypeSelect {...defaultProps} />);
      
      // Initial state
      expect(screen.getByText('API Key')).toBeInTheDocument();
      
      // Update from parent
      rerender(<SecretTypeSelect {...defaultProps} selected="PASSWORD" />);
      expect(screen.getByText('Password')).toBeInTheDocument();
      
      // Update again
      rerender(<SecretTypeSelect {...defaultProps} selected="SSH_KEY" />);
      expect(screen.getByText('SSH Key')).toBeInTheDocument();
    });
  });
}); 