/**
 * Event Handler Conflict Detection System
 * 
 * This module provides automated detection of conflicting event handlers
 * that can cause form submission issues, particularly onSubmit conflicts.
 * 
 * Features:
 * - Detects multiple event handlers on the same element
 * - Identifies conflicting onSubmit and onClick handlers
 * - Warns about missing preventDefault/stopPropagation
 * - Provides recommendations for fixes
 * - Integrates with development and testing environments
 */

import React from 'react';

export interface EventHandlerConflict {
  element: string;
  elementType: 'form' | 'button' | 'input' | 'other';
  conflicts: {
    type: 'onSubmit' | 'onClick' | 'onKeyDown' | 'onKeyPress';
    handler: string;
    hasPreventDefault: boolean;
    hasStopPropagation: boolean;
    lineNumber?: number;
    filePath?: string;
  }[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface DetectionOptions {
  includeWarnings?: boolean;
  checkPreventDefault?: boolean;
  checkStopPropagation?: boolean;
  includeFileInfo?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class EventHandlerDetector {
  private conflicts: EventHandlerConflict[] = [];
  private options: DetectionOptions;

  constructor(options: DetectionOptions = {}) {
    this.options = {
      includeWarnings: true,
      checkPreventDefault: true,
      checkStopPropagation: true,
      includeFileInfo: false,
      logLevel: 'warn',
      ...options
    };
  }

  /**
   * Detects conflicting event handlers in a React component tree
   */
  detectConflicts(component: React.ReactElement): EventHandlerConflict[] {
    this.conflicts = [];
    this.analyzeComponent(component, '');
    return this.conflicts;
  }

  /**
   * Detects conflicts in DOM elements (for runtime detection)
   */
  detectDOMConflicts(rootElement: HTMLElement): EventHandlerConflict[] {
    this.conflicts = [];
    this.analyzeDOMElement(rootElement);
    return this.conflicts;
  }

  /**
   * Analyzes a React component for event handler conflicts
   */
  private analyzeComponent(element: React.ReactElement, path: string): void {
    if (!element || typeof element !== 'object') return;

    const elementType = this.getElementType(element);
    const elementPath = path ? `${path} > ${elementType}` : elementType;

    // Check for event handler conflicts
    this.checkEventHandlers(element, elementPath);

    // Recursively analyze children
    if (element.props?.children) {
      React.Children.forEach(element.props.children, (child) => {
        if (React.isValidElement(child)) {
          this.analyzeComponent(child, elementPath);
        }
      });
    }
  }

  /**
   * Analyzes DOM elements for event handler conflicts
   */
  private analyzeDOMElement(element: HTMLElement): void {
    const elementType = this.getDOMElementType(element);
    const elementPath = element.tagName.toLowerCase();

    // Check for event handler conflicts
    this.checkDOMEventHandlers(element, elementPath);

    // Recursively analyze children
    Array.from(element.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        this.analyzeDOMElement(child);
      }
    });
  }

  /**
   * Checks for event handler conflicts in React elements
   */
  private checkEventHandlers(element: React.ReactElement, path: string): void {
    const handlers: EventHandlerConflict['conflicts'][0][] = [];
    const props = element.props || {};

    // Check for onSubmit conflicts
    if (props.onSubmit) {
      handlers.push({
        type: 'onSubmit',
        handler: this.getHandlerName(props.onSubmit),
        hasPreventDefault: this.hasPreventDefault(props.onSubmit),
        hasStopPropagation: this.hasStopPropagation(props.onSubmit),
      });
    }

    // Check for onClick conflicts on form elements
    if (props.onClick && this.isFormElement(element)) {
      handlers.push({
        type: 'onClick',
        handler: this.getHandlerName(props.onClick),
        hasPreventDefault: this.hasPreventDefault(props.onClick),
        hasStopPropagation: this.hasStopPropagation(props.onClick),
      });
    }

    // Check for keyboard event conflicts
    if (props.onKeyDown || props.onKeyPress) {
      if (props.onKeyDown) {
        handlers.push({
          type: 'onKeyDown',
          handler: this.getHandlerName(props.onKeyDown),
          hasPreventDefault: this.hasPreventDefault(props.onKeyDown),
          hasStopPropagation: this.hasStopPropagation(props.onKeyDown),
        });
      }
      if (props.onKeyPress) {
        handlers.push({
          type: 'onKeyPress',
          handler: this.getHandlerName(props.onKeyPress),
          hasPreventDefault: this.hasPreventDefault(props.onKeyPress),
          hasStopPropagation: this.hasStopPropagation(props.onKeyPress),
        });
      }
    }

    // Check for conflicts
    if (handlers.length > 1) {
      const severity = this.calculateSeverity(handlers, element);
      const recommendation = this.generateRecommendation(handlers, element);

      this.conflicts.push({
        element: path,
        elementType: this.getElementType(element),
        conflicts: handlers,
        severity,
        recommendation,
      });

      this.logConflict(severity, path, handlers, recommendation);
    }
  }

  /**
   * Checks for event handler conflicts in DOM elements
   */
  private checkDOMEventHandlers(element: HTMLElement, path: string): void {
    const handlers: EventHandlerConflict['conflicts'][0][] = [];

    // Check for form submission conflicts
    if (element.tagName === 'FORM') {
      // Check if form has both onSubmit and button onClick
      const submitButtons = element.querySelectorAll('button[type="submit"], input[type="submit"]');
      submitButtons.forEach((button) => {
        if (button instanceof HTMLElement) {
          // Check for onClick on submit buttons
          const hasClickHandler = this.hasDOMEventHandler(button, 'click');
          if (hasClickHandler) {
            handlers.push({
              type: 'onClick',
              handler: 'DOM click handler',
              hasPreventDefault: false, // Can't easily detect from DOM
              hasStopPropagation: false,
            });
          }
        }
      });
    }

    // Check for conflicting keyboard handlers
    const hasKeyDown = this.hasDOMEventHandler(element, 'keydown');
    const hasKeyPress = this.hasDOMEventHandler(element, 'keypress');
    
    if (hasKeyDown && hasKeyPress) {
      handlers.push(
        {
          type: 'onKeyDown',
          handler: 'DOM keydown handler',
          hasPreventDefault: false,
          hasStopPropagation: false,
        },
        {
          type: 'onKeyPress',
          handler: 'DOM keypress handler',
          hasPreventDefault: false,
          hasStopPropagation: false,
        }
      );
    }

    // Check for conflicts
    if (handlers.length > 1) {
      const severity = this.calculateSeverity(handlers, element);
      const recommendation = this.generateRecommendation(handlers, element);

      this.conflicts.push({
        element: path,
        elementType: this.getDOMElementType(element),
        conflicts: handlers,
        severity,
        recommendation,
      });

      this.logConflict(severity, path, handlers, recommendation);
    }
  }

  /**
   * Determines the type of React element
   */
  private getElementType(element: React.ReactElement): EventHandlerConflict['elementType'] {
    const type = element.type;
    if (typeof type === 'string') {
      switch (type.toLowerCase()) {
        case 'form': return 'form';
        case 'button': return 'button';
        case 'input': return 'input';
        default: return 'other';
      }
    }
    return 'other';
  }

  /**
   * Determines the type of DOM element
   */
  private getDOMElementType(element: HTMLElement): EventHandlerConflict['elementType'] {
    switch (element.tagName.toLowerCase()) {
      case 'form': return 'form';
      case 'button': return 'button';
      case 'input': return 'input';
      default: return 'other';
    }
  }

  /**
   * Checks if element is a form-related element
   */
  private isFormElement(element: React.ReactElement): boolean {
    const type = element.type;
    if (typeof type === 'string') {
      return ['form', 'button', 'input', 'select', 'textarea'].includes(type.toLowerCase());
    }
    return false;
  }

  /**
   * Gets a readable name for a handler function
   */
  private getHandlerName(handler: Function): string {
    if (handler.name) return handler.name;
    if (handler.toString().includes('=>')) return 'Arrow function';
    if (handler.toString().includes('function')) return 'Function expression';
    return 'Anonymous function';
  }

  /**
   * Checks if handler calls preventDefault
   */
  private hasPreventDefault(handler: Function): boolean {
    const handlerString = handler.toString();
    return handlerString.includes('preventDefault()') || handlerString.includes('preventDefault');
  }

  /**
   * Checks if handler calls stopPropagation
   */
  private hasStopPropagation(handler: Function): boolean {
    const handlerString = handler.toString();
    return handlerString.includes('stopPropagation()') || handlerString.includes('stopPropagation');
  }

  /**
   * Checks if DOM element has an event handler
   */
  private hasDOMEventHandler(element: HTMLElement, eventType: string): boolean {
    // This is a simplified check - in reality, you'd need to check
    // the element's event listeners more thoroughly
    return element.hasAttribute(`on${eventType}`) || 
           element.getAttribute('data-testid')?.includes(eventType) ||
           false;
  }

  /**
   * Calculates the severity of a conflict
   */
  private calculateSeverity(handlers: EventHandlerConflict['conflicts'], element: any): EventHandlerConflict['severity'] {
    const hasOnSubmit = handlers.some(h => h.type === 'onSubmit');
    const hasOnClick = handlers.some(h => h.type === 'onClick');
    const hasFormElement = this.isFormElement(element) || element?.tagName?.toLowerCase() === 'form';

    // Critical: onSubmit + onClick on form elements without proper event handling
    if (hasOnSubmit && hasOnClick && hasFormElement) {
      const hasProperHandling = handlers.every(h => h.hasPreventDefault && h.hasStopPropagation);
      if (!hasProperHandling) return 'critical';
    }

    // High: Multiple handlers on form elements
    if (hasFormElement && handlers.length > 1) return 'high';

    // Medium: Multiple handlers on interactive elements
    if (handlers.length > 2) return 'medium';

    // Low: Multiple handlers on non-interactive elements
    return 'low';
  }

  /**
   * Generates a recommendation for fixing the conflict
   */
  private generateRecommendation(handlers: EventHandlerConflict['conflicts'], element: any): string {
    const hasOnSubmit = handlers.some(h => h.type === 'onSubmit');
    const hasOnClick = handlers.some(h => h.type === 'onClick');
    const hasFormElement = this.isFormElement(element) || element?.tagName?.toLowerCase() === 'form';

    if (hasOnSubmit && hasOnClick && hasFormElement) {
      return 'Use formSubmissionUtils.createFormSubmissionHandler() to properly handle form submission with preventDefault and stopPropagation. Remove conflicting onClick handlers on submit buttons.';
    }

    if (handlers.length > 1) {
      return 'Consider consolidating event handlers or using event delegation to avoid conflicts.';
    }

    return 'Review event handler implementation to ensure proper event handling.';
  }

  /**
   * Logs a conflict based on the configured log level
   */
  private logConflict(severity: EventHandlerConflict['severity'], path: string, handlers: any[], recommendation: string): void {
    const message = `Event Handler Conflict [${severity.toUpperCase()}]: ${path} has ${handlers.length} conflicting handlers: ${handlers.map(h => h.type).join(', ')}. ${recommendation}`;
    
    switch (this.options.logLevel) {
      case 'debug':
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
        if (severity === 'critical' || severity === 'high') {
          console.error(message);
        }
        break;
    }
  }

  /**
   * Gets all detected conflicts
   */
  getConflicts(): EventHandlerConflict[] {
    return this.conflicts;
  }

  /**
   * Gets conflicts by severity
   */
  getConflictsBySeverity(severity: EventHandlerConflict['severity']): EventHandlerConflict[] {
    return this.conflicts.filter(conflict => conflict.severity === severity);
  }

  /**
   * Clears all detected conflicts
   */
  clearConflicts(): void {
    this.conflicts = [];
  }

  /**
   * Generates a summary report of all conflicts
   */
  generateReport(): string {
    if (this.conflicts.length === 0) {
      return 'No event handler conflicts detected.';
    }

    const critical = this.getConflictsBySeverity('critical').length;
    const high = this.getConflictsBySeverity('high').length;
    const medium = this.getConflictsBySeverity('medium').length;
    const low = this.getConflictsBySeverity('low').length;

    let report = `Event Handler Conflict Report:\n`;
    report += `Total conflicts: ${this.conflicts.length}\n`;
    report += `Critical: ${critical}\n`;
    report += `High: ${high}\n`;
    report += `Medium: ${medium}\n`;
    report += `Low: ${low}\n\n`;

    this.conflicts.forEach((conflict, index) => {
      report += `${index + 1}. [${conflict.severity.toUpperCase()}] ${conflict.element}\n`;
      report += `   Handlers: ${conflict.conflicts.map(h => h.type).join(', ')}\n`;
      report += `   Recommendation: ${conflict.recommendation}\n\n`;
    });

    return report;
  }
}

/**
 * React hook for detecting event handler conflicts in components
 */
export function useEventHandlerDetection(options: DetectionOptions = {}) {
  const detector = React.useMemo(() => new EventHandlerDetector(options), []);
  const [conflicts, setConflicts] = React.useState<EventHandlerConflict[]>([]);

  const detectConflicts = React.useCallback((component: React.ReactElement) => {
    const detectedConflicts = detector.detectConflicts(component);
    setConflicts(detectedConflicts);
    return detectedConflicts;
  }, [detector]);

  const detectDOMConflicts = React.useCallback((rootElement: HTMLElement) => {
    const detectedConflicts = detector.detectDOMConflicts(rootElement);
    setConflicts(detectedConflicts);
    return detectedConflicts;
  }, [detector]);

  const clearConflicts = React.useCallback(() => {
    detector.clearConflicts();
    setConflicts([]);
  }, [detector]);

  return {
    conflicts,
    detectConflicts,
    detectDOMConflicts,
    clearConflicts,
    getConflictsBySeverity: detector.getConflictsBySeverity.bind(detector),
    generateReport: detector.generateReport.bind(detector),
  };
}

/**
 * Development-only event handler conflict detection
 * Automatically detects conflicts in development mode
 */
export function enableDevelopmentDetection(options: DetectionOptions = {}) {
  if (process.env.NODE_ENV !== 'development') return;

  const detector = new EventHandlerDetector({
    logLevel: 'warn',
    ...options
  });

  // Override console methods to detect conflicts in component renders
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Check if this is a React error that might be related to event handlers
    const message = args.join(' ');
    if (message.includes('onSubmit') || message.includes('onClick') || message.includes('form')) {
      console.warn('🚨 Potential event handler conflict detected:', message);
    }
    originalConsoleError.apply(console, args);
  };

  return detector;
}

export default EventHandlerDetector;
