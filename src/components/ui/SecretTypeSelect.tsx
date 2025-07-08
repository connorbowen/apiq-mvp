import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Fragment } from 'react';

type Option = { value: string; label: string };

export function SecretTypeSelect({
  options,
  selected,
  onChange,
  'aria-describedby': ariaDescribedBy,
  disabled = false,
}: {
  options: Option[];
  selected: string;
  onChange: (value: string) => void;
  'aria-describedby'?: string;
  disabled?: boolean;
}) {
  const current = options.find(o => o.value === selected) || null;

  return (
    <Listbox value={selected} onChange={onChange} disabled={disabled}>
      <div className="relative">
        <Listbox.Button
          data-testid="secret-type-select"
          className={`flex items-center justify-between w-full py-2 px-3 border rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-describedby={ariaDescribedBy}
        >
          {current ? current.label : 'Select type'}
          <ChevronUpDownIcon 
            data-testid="chevron-icon"
            className="w-5 h-5 ml-2 text-gray-400" 
            aria-hidden="true" 
          />
        </Listbox.Button>

        <Listbox.Options
          className="absolute mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto z-10"
        >
          {options.map(option => (
            <Listbox.Option
              key={option.value}
              value={option.value}
              as={Fragment}
            >
              {({ active, selected }) => (
                <li
                  role="option"
                  aria-selected={selected}
                  className={`
                    cursor-pointer select-none p-2
                    ${active ? 'bg-blue-100' : ''}
                    ${selected ? 'font-semibold bg-blue-50' : 'font-normal'}
                  `}
                  data-testid="secret-type-option"
                >
                  {option.label}
                </li>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
} 