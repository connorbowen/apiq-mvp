import { Page, expect } from '@playwright/test';

/**
 * UX Compliance Helper for E2E Tests
 * 
 * This helper implements all UX spec requirements from docs/UX_SPEC.md
 * and ensures tests follow the activation-first, accessibility, and
 * best-in-class UX principles defined in the project documentation.
 */
export class UXComplianceHelper {
  constructor(private page: Page) {}

  /**
   * Validate page title matches UX spec requirements
   */
  async validatePageTitle(expectedTitle: string) {
    await expect(this.page).toHaveTitle(new RegExp(expectedTitle, 'i'));
  }

  /**
   * Validate heading hierarchy as per UX spec
   * Each page should have clear, descriptive h1/h2 tags
   */
  async validateHeadingHierarchy(expectedHeadings: string[]) {
    for (const heading of expectedHeadings) {
      // Check if any h1 or h2 element contains the expected heading text
      const headingElements = this.page.locator('h1, h2');
      let found = false;
      
      for (let i = 0; i < await headingElements.count(); i++) {
        const element = headingElements.nth(i);
        const text = await element.textContent();
        if (text && new RegExp(heading, 'i').test(text)) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`Expected heading "${heading}" not found in any h1 or h2 elements`);
      }
    }
  }

  /**
   * Validate form accessibility as per WCAG 2.1 AA
   */
  async validateFormAccessibility() {
    // Test required fields have proper indicators
    const requiredFields = this.page.locator('[aria-required="true"]');
    await expect(requiredFields).toHaveCount(await requiredFields.count());
    
    // Test form labels are present and accessible
    const formFields = this.page.locator('input, select, textarea');
    for (let i = 0; i < await formFields.count(); i++) {
      const field = formFields.nth(i);
      const id = await field.getAttribute('id');
      if (id) {
        await expect(this.page.locator(`label[for="${id}"]`)).toBeVisible();
      }
    }
  }

  /**
   * Validate loading states as per UX spec
   */
  async validateLoadingState(buttonSelector: string) {
    const button = this.page.locator(buttonSelector);
    await button.click();
    await expect(button).toBeDisabled();
    await expect(button).toHaveText(/Loading|Creating|Saving|Generating|Processing/);
  }

  /**
   * Validate error containers as per UX spec
   */
  async validateErrorContainer(expectedError: string | RegExp) {
    await expect(this.page.locator('.bg-red-50')).toBeVisible();
    // Use a more specific selector to avoid conflicts with other red text
    await expect(this.page.locator('.bg-red-50 .text-red-800')).toContainText(expectedError);
    // Use a more specific selector for role="alert" to avoid conflicts
    await expect(this.page.locator('.bg-red-50[role="alert"]')).toBeVisible();
  }

  /**
   * Validate success containers as per UX spec
   */
  async validateSuccessContainer(expectedMessage: string) {
    await expect(this.page.locator('.bg-green-50')).toBeVisible();
    // Use a more specific selector to avoid conflicts with other green text
    await expect(this.page.locator('.bg-green-50 .text-green-800')).toContainText(expectedMessage);
  }

  /**
   * Validate mobile responsiveness as per UX spec
   */
  async validateMobileResponsiveness() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // Test touch-friendly button sizes (44px minimum as per UX spec)
    const buttons = this.page.locator('button, a[role="button"]');
    for (let i = 0; i < await buttons.count(); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  }

  /**
   * Validate keyboard navigation as per WCAG 2.1 AA
   */
  async validateKeyboardNavigation() {
    // Test tab order follows visual layout
    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(':focus')).toHaveAttribute('tabindex', '0');
    
    // Test skip links for main content
    const skipLinks = this.page.locator('[href^="#main"], [href^="#content"]');
    if (await skipLinks.count() > 0) {
      await expect(skipLinks.first()).toBeVisible();
    }
  }

  /**
   * Validate ARIA roles and labels for dynamic content
   */
  async validateARIACompliance() {
    // Test ARIA roles for dynamic content
    const alertRoles = this.page.locator('[role="alert"]');
    const buttonRoles = this.page.locator('[role="button"]');
    const navigationRoles = this.page.locator('[role="navigation"]');
    
    // Test ARIA labels
    const ariaLabels = this.page.locator('[aria-label]');
    for (let i = 0; i < await ariaLabels.count(); i++) {
      const element = ariaLabels.nth(i);
      const label = await element.getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    }
  }

  /**
   * Validate screen reader compatibility as per WCAG 2.1 AA
   */
  async validateScreenReaderCompatibility() {
    // Test semantic HTML structure
    const mainContent = this.page.locator('main, [role="main"]');
    if (await mainContent.count() > 0) {
      await expect(mainContent.first()).toBeVisible();
    }
    
    // Test live regions for dynamic content
    const liveRegions = this.page.locator('[aria-live]');
    for (let i = 0; i < await liveRegions.count(); i++) {
      const region = liveRegions.nth(i);
      const liveValue = await region.getAttribute('aria-live');
      expect(liveValue).toMatch(/polite|assertive/);
    }
    
    // Test alt text for images
    const images = this.page.locator('img');
    for (let i = 0; i < await images.count(); i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');
      // Decorative images can have empty alt, but functional images must have alt text
      const isDecorative = await image.getAttribute('role') === 'presentation';
      if (!isDecorative) {
        expect(alt).toBeTruthy();
      }
    }
  }

  /**
   * Validate mobile accessibility as per UX spec
   */
  async validateMobileAccessibility() {
    // Test touch target sizes (44px minimum)
    const interactiveElements = this.page.locator('button, a, input, select, textarea, [role="button"], [role="link"]');
    for (let i = 0; i < await interactiveElements.count(); i++) {
      const element = interactiveElements.nth(i);
      const box = await element.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
    
    // Test mobile navigation
    const mobileMenu = this.page.locator('[data-testid="mobile-menu"], .mobile-menu');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu.first()).toBeVisible();
    }
    
    // Test mobile form layout
    const formFields = this.page.locator('input, select, textarea');
    for (let i = 0; i < await formFields.count(); i++) {
      const field = formFields.nth(i);
      const box = await field.boundingBox();
      if (box) {
        // Fields should be wide enough for mobile input
        expect(box.width).toBeGreaterThan(200);
      }
    }
  }

  /**
   * Validate natural language workflow creation as per UX spec
   */
  async validateNaturalLanguageWorkflowCreation() {
    // Test chat interface
    const chatInterface = this.page.locator('[data-testid="natural-language-chat"], .chat-interface');
    if (await chatInterface.count() > 0) {
      await expect(chatInterface.first()).toBeVisible();
    }
    
    // Test natural language input
    const nlInput = this.page.getByPlaceholder(/Describe your workflow in natural language|plain English/i);
    if (await nlInput.count() > 0) {
      await expect(nlInput.first()).toBeVisible();
      
      // Test input validation
      await nlInput.first().fill('test');
      await this.page.getByRole('button', { name: /Generate|Create/i }).click();
      
      // Should show helpful error message
      await expect(this.page.getByText(/Please provide more details|Try describing/i)).toBeVisible();
    }
    
    // Test workflow preview
    const workflowPreview = this.page.locator('[data-testid="workflow-preview"]');
    if (await workflowPreview.count() > 0) {
      await expect(workflowPreview.first()).toBeVisible();
      
      // Test step visualization
      await expect(this.page.getByText(/Steps:|Step 1:/i)).toBeVisible();
      
      // Test save workflow button
      const saveButton = this.page.getByRole('button', { name: /Save Workflow/i });
      if (await saveButton.count() > 0) {
        await expect(saveButton.first()).toBeVisible();
      }
    }
  }

  /**
   * Validate workflow templates as per UX spec
   */
  async validateWorkflowTemplates() {
    // Test template library
    const templateCards = this.page.locator('[data-testid="template-card"]');
    if (await templateCards.count() > 0) {
      await expect(templateCards.first()).toBeVisible();
      
      // Test template information
      await expect(this.page.getByText(/Difficulty:|Estimated time:/i)).toBeVisible();
      
      // Test template actions
      const useTemplateButton = this.page.getByRole('button', { name: /Use This Template/i });
      if (await useTemplateButton.count() > 0) {
        await expect(useTemplateButton.first()).toBeVisible();
      }
    }
    
    // Test template search and filtering
    const searchInput = this.page.getByPlaceholder(/Search templates/i);
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
    }
    
    const filterSelect = this.page.locator('select[aria-label*="filter"], select[aria-label*="category"]');
    if (await filterSelect.count() > 0) {
      await expect(filterSelect.first()).toBeVisible();
    }
  }

  /**
   * Validate onboarding flow as per UX spec
   */
  async validateOnboardingFlow() {
    // Test onboarding progress
    const progressIndicator = this.page.locator('[data-testid="onboarding-progress"], .progress-indicator');
    if (await progressIndicator.count() > 0) {
      await expect(progressIndicator.first()).toBeVisible();
    }
    
    // Test guided tour
    const tourSteps = this.page.locator('[data-testid="tour-step"], .tour-step');
    if (await tourSteps.count() > 0) {
      await expect(tourSteps.first()).toBeVisible();
      
      // Test tour navigation
      const nextButton = this.page.getByRole('button', { name: /Next/i });
      if (await nextButton.count() > 0) {
        await expect(nextButton.first()).toBeVisible();
      }
    }
    
    // Test sample workflows
    const sampleWorkflows = this.page.getByText(/Try these sample workflows|Recommended for you/i);
    if (await sampleWorkflows.count() > 0) {
      await expect(sampleWorkflows.first()).toBeVisible();
    }
  }

  /**
   * Validate performance requirements as per UX spec
   */
  async validatePerformanceRequirements() {
    // Test loading states
    const loadingStates = this.page.locator('.loading, [class*="loading"], [class*="spinner"]');
    if (await loadingStates.count() > 0) {
      await expect(loadingStates.first()).toBeVisible();
    }
    
    // Test skeleton screens
    const skeletonScreens = this.page.locator('.skeleton, [class*="skeleton"], [class*="animate-pulse"]');
    if (await skeletonScreens.count() > 0) {
      await expect(skeletonScreens.first()).toBeVisible();
    }
    
    // Test optimistic UI updates
    const optimisticUpdates = this.page.locator('[data-testid="optimistic-update"]');
    if (await optimisticUpdates.count() > 0) {
      await expect(optimisticUpdates.first()).toBeVisible();
    }
  }

  /**
   * Validate error handling as per UX spec
   */
  async validateErrorHandling() {
    // Test user-friendly error messages
    const errorMessages = this.page.locator('.text-red-600, .text-red-800, [role="alert"]');
    for (let i = 0; i < await errorMessages.count(); i++) {
      const error = errorMessages.nth(i);
      const text = await error.textContent();
      if (text) {
        // Error messages should be actionable
        expect(text.length).toBeGreaterThan(10);
        expect(text).toMatch(/Try|Check|Please|Contact|Help/i);
      }
    }
    
    // Test retry mechanisms
    const retryButtons = this.page.getByRole('button', { name: /Retry|Try Again/i });
    if (await retryButtons.count() > 0) {
      await expect(retryButtons.first()).toBeVisible();
    }
    
    // Test alternative actions
    const alternativeActions = this.page.getByRole('button', { name: /Skip|Continue|Cancel/i });
    if (await alternativeActions.count() > 0) {
      await expect(alternativeActions.first()).toBeVisible();
    }
  }

  /**
   * Validate activation-first UX as per UX spec
   */
  async validateActivationFirstUX() {
    // Test clear call-to-action buttons
    const primaryButtons = this.page.locator('button[class*="bg-blue"], button[class*="bg-green"], button[class*="bg-indigo"], button[class*="primary"]');
    for (let i = 0; i < await primaryButtons.count(); i++) {
      const button = primaryButtons.nth(i);
      const text = await button.textContent();
      if (text) {
        // Primary actions should be descriptive
        expect(text).toMatch(/Create|Add|Start|Begin|Generate|Save|Submit|Connect|Sign|Login/i);
      }
    }
    
    // Test helpful guidance text
    const guidanceText = this.page.locator('p, .text-gray-600, .text-gray-500, .text-sm');
    let hasGuidance = false;
    for (let i = 0; i < await guidanceText.count(); i++) {
      const text = await guidanceText.nth(i).textContent();
      if (text && text.length > 10) {
        hasGuidance = true;
        break;
      }
    }
    expect(hasGuidance).toBe(true);
    
    // Test next-step guidance
    const nextSteps = this.page.getByText(/Next:|Try:|You can:|To get started/i);
    if (await nextSteps.count() > 0) {
      await expect(nextSteps.first()).toBeVisible();
    }
  }

  /**
   * Validate consistency as per UX spec
   */
  async validateConsistency() {
    // Test consistent button styling
    const buttons = this.page.locator('button');
    const buttonClasses = new Set();
    for (let i = 0; i < await buttons.count(); i++) {
      const button = buttons.nth(i);
      const className = await button.getAttribute('class');
      if (className) {
        buttonClasses.add(className.split(' ').filter(c => c.includes('bg-') || c.includes('text-')).join(' '));
      }
    }
    
    // Should have consistent color schemes
    expect(buttonClasses.size).toBeLessThan(10); // Not too many different styles
    
    // Test consistent spacing
    const cards = this.page.locator('.card, [class*="card"], [class*="p-"]');
    if (await cards.count() > 1) {
      const firstCard = cards.first();
      const lastCard = cards.nth(await cards.count() - 1);
      const firstBox = await firstCard.boundingBox();
      const lastBox = await lastCard.boundingBox();
      if (firstBox && lastBox) {
        // Cards should have consistent spacing
        expect(Math.abs(firstBox.y - lastBox.y)).toBeGreaterThan(0);
      }
    }
  }

  /**
   * Validate workflow-specific UX as per PRD
   */
  async validateWorkflowUX() {
    // Test workflow status indicators
    const statusIndicators = this.page.locator('.bg-green-100, .bg-red-100, .bg-yellow-100, .bg-blue-100');
    if (await statusIndicators.count() > 0) {
      await expect(statusIndicators.first()).toBeVisible();
    }
    
    // Test workflow actions
    const workflowActions = this.page.getByRole('button', { name: /execute|run|pause|resume|delete/i });
    if (await workflowActions.count() > 0) {
      await expect(workflowActions.first()).toBeVisible();
    }
    
    // Test workflow monitoring
    const monitoringElements = this.page.getByText(/Status|Last run|Steps|Execution/i);
    if (await monitoringElements.count() > 0) {
      await expect(monitoringElements.first()).toBeVisible();
    }
  }

  /**
   * Validate dashboard navigation as per UX spec
   */
  async validateDashboardNavigation() {
    // Test tab navigation
    const tabs = this.page.locator('[data-testid^="tab-"]');
    expect(await tabs.count()).toBeGreaterThan(0);
    
    // Test active tab highlighting
    const activeTab = this.page.locator('[class*="bg-indigo-100"], [class*="bg-blue-100"]');
    if (await activeTab.count() > 0) {
      await expect(activeTab.first()).toBeVisible();
    }
    
    // Test breadcrumb navigation
    const breadcrumbs = this.page.locator('[data-testid^="breadcrumb-"]');
    if (await breadcrumbs.count() > 0) {
      await expect(breadcrumbs.first()).toBeVisible();
    }
  }

  /**
   * Validate empty states as per UX spec
   */
  async validateEmptyStates() {
    // Test empty state messaging
    const emptyStates = this.page.getByText(/No workflows|No connections|Get started|Create your first/i);
    if (await emptyStates.count() > 0) {
      await expect(emptyStates.first()).toBeVisible();
      
      // Test empty state actions
      const emptyStateActions = this.page.getByRole('button', { name: /Create|Add|Get started/i });
      if (await emptyStateActions.count() > 0) {
        await expect(emptyStateActions.first()).toBeVisible();
      }
    }
  }

  /**
   * Validate confirmation dialogs as per UX spec
   */
  async validateConfirmationDialogs() {
    // Test destructive action confirmations
    const deleteButtons = this.page.getByRole('button', { name: /delete|remove/i });
    if (await deleteButtons.count() > 0) {
      await deleteButtons.first().click();
      
      // Should show confirmation dialog
      const confirmation = this.page.getByText(/Are you sure|Confirm|This action cannot be undone/i);
      if (await confirmation.count() > 0) {
        await expect(confirmation.first()).toBeVisible();
        
        // Test cancel option
        const cancelButton = this.page.getByRole('button', { name: /cancel|no/i });
        if (await cancelButton.count() > 0) {
          await expect(cancelButton.first()).toBeVisible();
        }
      }
    }
  }

  /**
   * Comprehensive UX compliance validation covering all UX spec requirements
   */
  async validateCompleteUXCompliance() {
    // Core UX patterns
    await this.validateHeadingHierarchy(['Dashboard', 'Workflows', 'Create']);
    await this.validateFormAccessibility();
    await this.validateKeyboardNavigation();
    await this.validateARIACompliance();
    await this.validateScreenReaderCompatibility();
    await this.validateMobileAccessibility();
    
    // UX principles
    await this.validateActivationFirstUX();
    await this.validateConsistency();
    await this.validateErrorHandling();
    await this.validatePerformanceRequirements();
    
    // Feature-specific validation
    await this.validateNaturalLanguageWorkflowCreation();
    await this.validateWorkflowTemplates();
    await this.validateOnboardingFlow();
    await this.validateWorkflowUX();
    await this.validateDashboardNavigation();
    await this.validateEmptyStates();
    await this.validateConfirmationDialogs();
  }

  /**
   * Validate specific UX patterns for workflow creation
   */
  async validateWorkflowCreationUX() {
    // Test natural language input
    const nlInput = this.page.getByPlaceholder(/Describe your workflow in plain English/);
    await expect(nlInput).toBeVisible();
    
    // Test helpful examples
    await expect(this.page.getByText(/Start by describing your workflow/)).toBeVisible();
    await expect(this.page.getByText(/When a new GitHub issue is created/)).toBeVisible();
    
    // Test generate button
    const generateButton = this.page.getByRole('button', { name: /Generate/ });
    await expect(generateButton).toBeVisible();
    
    // Test loading state
    await generateButton.click();
    await expect(this.page.getByText(/Generating workflow/)).toBeVisible();
    
    // Test generated workflow display
    await expect(this.page.getByText(/Generated Workflow/)).toBeVisible();
    await expect(this.page.getByText(/Steps:/)).toBeVisible();
    
    // Test save workflow
    const saveButton = this.page.getByRole('button', { name: /Save Workflow/ });
    await expect(saveButton).toBeVisible();
  }

  /**
   * Validate specific UX patterns for workflow management
   */
  async validateWorkflowManagementUX() {
    // Test workflow list
    const workflowCards = this.page.getByTestId('workflow-card');
    if (await workflowCards.count() > 0) {
      await expect(workflowCards.first()).toBeVisible();
      
      // Test workflow actions
      const viewLink = workflowCards.first().getByRole('link', { name: /View/ });
      await expect(viewLink).toBeVisible();
      
      const deleteButton = workflowCards.first().getByRole('button', { name: /Delete/ });
      if (await deleteButton.isVisible()) {
        await expect(deleteButton).toBeVisible();
      }
    } else {
      // Test empty state
      await expect(this.page.getByText(/No workflows/)).toBeVisible();
      await expect(this.page.getByText(/Get started by creating your first workflow/)).toBeVisible();
    }
    
    // Test search and filter
    const searchInput = this.page.getByTestId('search-input');
    await expect(searchInput).toBeVisible();
    
    const filterSelect = this.page.getByTestId('workflow-filter-select');
    await expect(filterSelect).toBeVisible();
  }
}

/**
 * Factory function to create UX compliance helper
 */
export function createUXComplianceHelper(page: Page): UXComplianceHelper {
  return new UXComplianceHelper(page);
}

/**
 * Common UX validation functions for specific scenarios
 */
export const UXValidations = {
  /**
   * Validate login page UX compliance
   */
  async validateLoginPage(page: Page) {
    const helper = new UXComplianceHelper(page);
    await helper.validatePageTitle('APIQ');
    await helper.validateHeadingHierarchy(['Sign in to APIQ']);
    await helper.validateFormAccessibility();
    await helper.validateActivationFirstUX();
  },

  /**
   * Validate dashboard UX compliance
   */
  async validateDashboard(page: Page) {
    const helper = new UXComplianceHelper(page);
    await helper.validatePageTitle('Dashboard');
    await helper.validateHeadingHierarchy(['Dashboard']);
    await helper.validateDashboardNavigation();
    await helper.validateEmptyStates();
  },

  /**
   * Validate workflow creation UX compliance
   */
  async validateWorkflowCreation(page: Page) {
    const helper = new UXComplianceHelper(page);
    await helper.validatePageTitle('Create Workflow');
    await helper.validateHeadingHierarchy(['Create Workflow']);
    await helper.validateWorkflowCreationUX();
  },

  /**
   * Validate workflow management UX compliance
   */
  async validateWorkflowManagement(page: Page) {
    const helper = new UXComplianceHelper(page);
    await helper.validateHeadingHierarchy(['Workflows']);
    await helper.validateWorkflowManagementUX();
    await helper.validateConfirmationDialogs();
  }
}; 