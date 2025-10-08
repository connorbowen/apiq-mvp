import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  disabled?: boolean;
  className?: string;
  maxWidth?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  trigger = 'hover',
  disabled = false,
  className = '',
  maxWidth = 'max-w-xs'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollTop - tooltipRect.height - 8;
        left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollTop + 8;
        left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left + scrollLeft - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + scrollLeft + 8;
        break;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    if (trigger === 'hover' && !disabled) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click' && !disabled) {
      setIsVisible(!isVisible);
    }
  };

  const handleFocus = () => {
    if (trigger === 'focus' && !disabled) {
      setIsVisible(true);
    }
  };

  const handleBlur = () => {
    if (trigger === 'focus') {
      setIsVisible(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
          tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    if (isVisible && trigger === 'click') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, trigger]);

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 bg-gray-900 text-white text-sm rounded-lg shadow-lg px-3 py-2 ${maxWidth} pointer-events-none`}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
          role="tooltip"
        >
          {content}
          
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1' :
              'right-full top-1/2 -translate-y-1/2 translate-x-1'
            }`}
          />
        </div>
      )}
    </div>
  );
};

// Popover Component (more complex than tooltip)
interface PopoverProps {
  content: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  maxWidth?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  content,
  children,
  isOpen,
  onClose,
  position = 'bottom',
  className = '',
  maxWidth = 'max-w-sm'
}) => {
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollTop - popoverRect.height - 8;
        left = triggerRect.left + scrollLeft + (triggerRect.width - popoverRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollTop + 8;
        left = triggerRect.left + scrollLeft + (triggerRect.width - popoverRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollTop + (triggerRect.height - popoverRect.height) / 2;
        left = triggerRect.left + scrollLeft - popoverRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollTop + (triggerRect.height - popoverRect.height) / 2;
        left = triggerRect.right + scrollLeft + 8;
        break;
    }

    setPopoverPosition({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, position]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
          popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <div className={`relative inline-block ${className}`}>
      <div ref={triggerRef} className="inline-block">
        {children}
      </div>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 ${maxWidth} pointer-events-auto`}
          style={{
            top: popoverPosition.top,
            left: popoverPosition.left,
          }}
          role="dialog"
          aria-modal="true"
        >
          {content}
          
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-white border border-gray-200 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1' :
              'right-full top-1/2 -translate-y-1/2 translate-x-1'
            }`}
          />
        </div>
      )}
    </div>
  );
};

// Help Text Component (simpler tooltip for form fields)
interface HelpTextProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const HelpText: React.FC<HelpTextProps> = ({
  content,
  children,
  className = ''
}) => (
  <Tooltip
    content={content}
    position="top"
    trigger="hover"
    className={className}
    maxWidth="max-w-xs"
  >
    {children}
  </Tooltip>
);
