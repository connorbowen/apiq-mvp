/**
 * Event Handler Detection Test Utilities
 * 
 * Provides utilities for detecting conflicting event handlers in E2E tests
 * and ensuring proper form submission patterns.
 */

import { EventHandlerDetector, EventHandlerConflict } from '../../src/lib/utils/eventHandlerDetector';
import { Page } from '@playwright/test';

export interface TestDetectionOptions {
  failOnCritical?: boolean;
  failOnHigh?: boolean;
  warnOnMedium?: boolean;
  includeRecommendations?: boolean;
}

export class TestEventHandlerDetector {
  private detector: EventHandlerDetector;
  private options: TestDetectionOptions;

  constructor(options: TestDetectionOptions = {}) {
    this.options = {
      failOnCritical: true,
      failOnHigh: true,
      warnOnMedium: true,
      includeRecommendations: true,
      ...options
    };
    this.detector = new EventHandlerDetector({
      logLevel: 'warn',
      includeWarnings: true,
      checkPreventDefault: true,
      checkStopPropagation: true,
    });
  }

  /**
   * Detects event handler conflicts in a Playwright page
   */
  async detectPageConflicts(page: Page): Promise<EventHandlerConflict[]> {
    const conflicts = await page.evaluate(() => {
      const detector = new (window as any).EventHandlerDetector({
        logLevel: 'warn',
        includeWarnings: true,
        checkPreventDefault: true,
        checkStopPropagation: true,
      });

      return detector.detectDOMConflicts(document.body);
    });

    return conflicts;
  }

  /**
   * Validates that forms use proper submission patterns
   */
  async validateFormSubmissionPatterns(page: Page): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for forms without data-testid
    const formsWithoutTestId = await page.locator('form:not([data-testid])').count();
    if (formsWithoutTestId > 0) {
      issues.push(`${formsWithoutTestId} forms missing data-testid attributes`);
      recommendations.push('Add data-testid attributes to all forms for reliable testing');
    }

    // Check for submit buttons without proper data-testid
    const submitButtonsWithoutTestId = await page.locator('button[type="submit"]:not([data-testid*="primary-action"])').count();
    if (submitButtonsWithoutTestId > 0) {
      issues.push(`${submitButtonsWithoutTestId} submit buttons missing primary-action data-testid`);
      recommendations.push('Add data-testid="primary-action {action}-btn" to submit buttons');
    }

    // Check for forms with both onSubmit and button onClick
    const formsWithConflicts = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      let conflictCount = 0;
      
      forms.forEach(form => {
        const hasOnSubmit = (form as any).onsubmit !== null;
        const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        let hasOnClick = false;
        
        submitButtons.forEach(button => {
          if ((button as any).onclick !== null) {
            hasOnClick = true;
          }
        });
        
        if (hasOnSubmit && hasOnClick) {
          conflictCount++;
        }
      });
      
      return conflictCount;
    });

    if (formsWithConflicts > 0) {
      issues.push(`${formsWithConflicts} forms have conflicting onSubmit and onClick handlers`);
      recommendations.push('Use formSubmissionUtils to handle form submissions consistently');
    }

    // Check for forms missing proper event handling
    const formsMissingEventHandling = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      let missingCount = 0;
      
      forms.forEach(form => {
        // Check if form has proper event handling attributes
        const hasDataTestId = form.hasAttribute('data-testid');
        const hasProperSubmitButton = form.querySelector('button[data-testid*="primary-action"]');
        
        if (!hasDataTestId || !hasProperSubmitButton) {
          missingCount++;
        }
      });
      
      return missingCount;
    });

    if (formsMissingEventHandling > 0) {
      issues.push(`${formsMissingEventHandling} forms missing proper event handling setup`);
      recommendations.push('Ensure all forms use the standardized form submission pattern');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Validates that a specific form follows proper submission patterns
   */
  async validateFormSubmission(
    page: Page, 
    formSelector: string,
    expectedAction: string
  ): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if form exists
    const form = page.locator(formSelector);
    const formExists = await form.count() > 0;
    
    if (!formExists) {
      issues.push(`Form with selector "${formSelector}" not found`);
      return { valid: false, issues, recommendations };
    }

    // Check for proper data-testid
    const hasDataTestId = await form.getAttribute('data-testid');
    if (!hasDataTestId) {
      issues.push(`Form missing data-testid attribute`);
      recommendations.push(`Add data-testid="${expectedAction}-form" to the form`);
    }

    // Check for proper submit button
    const submitButton = form.locator(`[data-testid*="primary-action"][data-testid*="${expectedAction}"]`);
    const submitButtonExists = await submitButton.count() > 0;
    
    if (!submitButtonExists) {
      issues.push(`Form missing proper submit button with data-testid="primary-action ${expectedAction}-btn"`);
      recommendations.push(`Add submit button with data-testid="primary-action ${expectedAction}-btn"`);
    }

    // Check for conflicting event handlers
    const hasConflictingHandlers = await page.evaluate((selector) => {
      const form = document.querySelector(selector);
      if (!form) return false;

      const hasOnSubmit = (form as any).onsubmit !== null;
      const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
      let hasOnClick = false;
      
      submitButtons.forEach(button => {
        if ((button as any).onclick !== null) {
          hasOnClick = true;
        }
      });
      
      return hasOnSubmit && hasOnClick;
    }, formSelector);

    if (hasConflictingHandlers) {
      issues.push('Form has conflicting onSubmit and onClick handlers');
      recommendations.push('Use formSubmissionUtils.createFormSubmissionHandler() to handle form submission');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Asserts that no critical event handler conflicts exist
   */
  async assertNoCriticalConflicts(page: Page): Promise<void> {
    const conflicts = await this.detectPageConflicts(page);
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    
    if (criticalConflicts.length > 0) {
      const report = this.detector.generateReport();
      throw new Error(`Critical event handler conflicts detected:\n${report}`);
    }
  }

  /**
   * Asserts that forms follow proper submission patterns
   */
  async assertProperFormPatterns(page: Page): Promise<void> {
    const validation = await this.validateFormSubmissionPatterns(page);
    
    if (!validation.valid) {
      const message = `Form submission pattern violations detected:\n${validation.issues.join('\n')}\n\nRecommendations:\n${validation.recommendations.join('\n')}`;
      throw new Error(message);
    }
  }

  /**
   * Asserts that a specific form follows proper submission patterns
   */
  async assertFormSubmissionPattern(
    page: Page, 
    formSelector: string, 
    expectedAction: string
  ): Promise<void> {
    const validation = await this.validateFormSubmission(page, formSelector, expectedAction);
    
    if (!validation.valid) {
      const message = `Form submission pattern violations for "${formSelector}":\n${validation.issues.join('\n')}\n\nRecommendations:\n${validation.recommendations.join('\n')}`;
      throw new Error(message);
    }
  }

  /**
   * Generates a comprehensive report of all detected issues
   */
  async generateComprehensiveReport(page: Page): Promise<string> {
    const conflicts = await this.detectPageConflicts(page);
    const formValidation = await this.validateFormSubmissionPatterns(page);
    
    let report = 'Event Handler Detection Report\n';
    report += '================================\n\n';
    
    // Conflicts section
    if (conflicts.length > 0) {
      report += 'Event Handler Conflicts:\n';
      report += this.detector.generateReport();
      report += '\n';
    } else {
      report += 'No event handler conflicts detected.\n\n';
    }
    
    // Form validation section
    if (!formValidation.valid) {
      report += 'Form Submission Pattern Issues:\n';
      formValidation.issues.forEach((issue, index) => {
        report += `${index + 1}. ${issue}\n`;
      });
      report += '\nRecommendations:\n';
      formValidation.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += '\n';
    } else {
      report += 'All forms follow proper submission patterns.\n\n';
    }
    
    return report;
  }
}

/**
 * Convenience function for quick conflict detection in tests
 */
export async function detectEventConflicts(page: Page): Promise<EventHandlerConflict[]> {
  console.log('🔍 Detecting event handler conflicts...');
  
  try {
    // Inject the event handler detection script into the page
    await page.addInitScript(() => {
      // Create a global event handler detector
      (window as any).EventHandlerDetector = class {
        detectConflicts() {
          const conflicts: any[] = [];
          
          // Check for forms with conflicting event handlers
          const forms = document.querySelectorAll('form');
          forms.forEach((form, index) => {
            const hasOnSubmit = (form as any).onsubmit !== null;
            const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
            let hasOnClick = false;
            
            submitButtons.forEach(button => {
              if ((button as any).onclick !== null) {
                hasOnClick = true;
              }
            });
            
            if (hasOnSubmit && hasOnClick) {
              conflicts.push({
                element: `form[${index}]`,
                elementType: 'form',
                conflicts: [
                  { type: 'onSubmit', handler: 'onSubmit handler', hasPreventDefault: false, hasStopPropagation: false },
                  { type: 'onClick', handler: 'onClick handler', hasPreventDefault: false, hasStopPropagation: false }
                ],
                severity: 'critical',
                recommendation: 'Use formSubmissionUtils.createFormSubmissionHandler() to handle form submission consistently'
              });
            }
          });
          
          // Check for forms without proper data-testid
          const formsWithoutTestId = document.querySelectorAll('form:not([data-testid])');
          formsWithoutTestId.forEach((form, index) => {
            conflicts.push({
              element: `form[${index}]`,
              elementType: 'form',
              conflicts: [
                { type: 'onSubmit', handler: 'Missing data-testid', hasPreventDefault: false, hasStopPropagation: false }
              ],
              severity: 'medium',
              recommendation: 'Add data-testid attribute to form for reliable testing'
            });
          });
          
          // Check for submit buttons without proper data-testid
          const submitButtonsWithoutTestId = document.querySelectorAll('button[type="submit"]:not([data-testid*="primary-action"])');
          submitButtonsWithoutTestId.forEach((button, index) => {
            conflicts.push({
              element: `button[${index}]`,
              elementType: 'button',
              conflicts: [
                { type: 'onClick', handler: 'Missing primary-action data-testid', hasPreventDefault: false, hasStopPropagation: false }
              ],
              severity: 'medium',
              recommendation: 'Add data-testid="primary-action {action}-btn" to submit button'
            });
          });
          
          return conflicts;
        }
      };
    });

    const conflicts = await page.evaluate(() => {
      const detector = new (window as any).EventHandlerDetector();
      return detector.detectConflicts();
    });
    
    console.log(`✅ Detected ${conflicts.length} conflicts`);
    return conflicts;
  } catch (error) {
    console.error('❌ Error detecting conflicts:', error);
    return [];
  }
}

/**
 * Convenience function for validating form patterns in tests
 */
export async function validateFormPatterns(page: Page): Promise<boolean> {
  console.log('🔍 Validating form patterns...');
  
  try {
    // Check for forms with data-testid
    const formsWithTestId = await page.locator('form[data-testid]').count();
    const totalForms = await page.locator('form').count();
    
    // Check for submit buttons with proper data-testid
    const submitButtonsWithTestId = await page.locator('button[data-testid*="primary-action"]').count();
    const totalSubmitButtons = await page.locator('button[type="submit"]').count();
    
    const allFormsHaveTestId = formsWithTestId === totalForms;
    const allSubmitButtonsHaveTestId = submitButtonsWithTestId === totalSubmitButtons;
    
    console.log(`✅ Form validation: ${allFormsHaveTestId && allSubmitButtonsHaveTestId ? 'PASSED' : 'FAILED'}`);
    console.log(`   Forms with data-testid: ${formsWithTestId}/${totalForms}`);
    console.log(`   Submit buttons with data-testid: ${submitButtonsWithTestId}/${totalSubmitButtons}`);
    
    return allFormsHaveTestId && allSubmitButtonsHaveTestId;
  } catch (error) {
    console.error('❌ Error validating form patterns:', error);
    return false;
  }
}

/**
 * Convenience function for asserting no critical conflicts
 */
export async function assertNoCriticalConflicts(page: Page): Promise<void> {
  const detector = new TestEventHandlerDetector();
  await detector.assertNoCriticalConflicts(page);
}

/**
 * Convenience function for asserting proper form patterns
 */
export async function assertProperFormPatterns(page: Page): Promise<void> {
  const detector = new TestEventHandlerDetector();
  await detector.assertProperFormPatterns(page);
}

export default TestEventHandlerDetector;
