/**
 * Event Handler Detection Setup
 * 
 * Global setup for event handler conflict detection in E2E tests.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔍 Setting up Event Handler Detection...');
  
  // Set up environment variables for detection
  process.env.EVENT_HANDLER_DETECTION = 'true';
  process.env.FAIL_ON_CRITICAL_CONFLICTS = 'true';
  process.env.FAIL_ON_HIGH_CONFLICTS = 'true';
  process.env.WARN_ON_MEDIUM_CONFLICTS = 'true';
  process.env.EVENT_HANDLER_LOG_LEVEL = 'warn';
  
  // Launch browser for detection setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to the application
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(baseURL);
    
    // Inject event handler detection script
    await page.addInitScript(() => {
      // Create a global event handler detector
      (window as any).eventHandlerDetector = {
        conflicts: [],
        
        detectConflicts: () => {
          const conflicts: any[] = [];
          
          // Check for forms with conflicting event handlers
          const forms = document.querySelectorAll('form');
          forms.forEach((form, index) => {
            const hasOnSubmit = form.onsubmit !== null;
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
        },
        
        clearConflicts: () => {
          (window as any).eventHandlerDetector.conflicts = [];
        }
      };
    });
    
    console.log('✅ Event Handler Detection setup complete');
    
  } catch (error) {
    console.error('❌ Event Handler Detection setup failed:', error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
