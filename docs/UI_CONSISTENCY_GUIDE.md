# UI Consistency Guide

## Overview

This guide ensures consistent UI throughout the APIQ application by providing a comprehensive component system, design tokens, and implementation patterns. The system includes 13 component categories covering every UI pattern in the application.

## 🎯 Core Principles

1. **Consistency First**: All UI elements follow the same patterns and styling
2. **Accessibility**: WCAG 2.1 AA compliance for all components
3. **Responsive Design**: Mobile-first approach with consistent breakpoints
4. **Performance**: Optimized components with minimal re-renders
5. **Maintainability**: Centralized design tokens and reusable components
6. **Complete Coverage**: Every UI pattern in the application has a standardized component

## 🏗️ Architecture

### Design System Layers

```
┌─────────────────────────────────────┐
│           Design Tokens             │ ← Colors, spacing, typography
├─────────────────────────────────────┤
│         Base Components             │ ← Button, Input, Card, etc.
├─────────────────────────────────────┤
│        Layout Components            │ ← Container, Grid, Flex
├─────────────────────────────────────┤
│        Modal Components             │ ← Modal, ModalHeader, ModalBody
├─────────────────────────────────────┤
│        Status Components            │ ← StatusBadge, StatusIndicator
├─────────────────────────────────────┤
│        Empty State Components       │ ← EmptyState, specific states
├─────────────────────────────────────┤
│        Navigation Components        │ ← TabNavigation, Dropdown
├─────────────────────────────────────┤
│        Search & Filter Components   │ ← Search, FilterSelect
├─────────────────────────────────────┤
│        Progress & Loading Components│ ← ProgressBar, Skeleton, Spinner
├─────────────────────────────────────┤
│        Data Display Components      │ ← Table, List, Stats, Badge
├─────────────────────────────────────┤
│        Form Components              │ ← FormGroup, FormSection, FormActions
├─────────────────────────────────────┤
│        Icon Components              │ ← Complete icon library
├─────────────────────────────────────┤
│        Hero & Welcome Components     │ ← Hero, WelcomeSection, GradientBackground
├─────────────────────────────────────┤
│        Tooltip & Popover Components │ ← Tooltip, Popover, HelpText
├─────────────────────────────────────┤
│        Onboarding Components        │ ← ProgressIndicator, FeatureUnlock
├─────────────────────────────────────┤
│        Feature Components           │ ← ChatInterface, WorkflowsTab
├─────────────────────────────────────┤
│           Pages/Views               │ ← Dashboard, Settings
└─────────────────────────────────────┘
```

## 🎨 Design Tokens

### Color System

```typescript
// Primary brand colors
primary: {
  500: '#3b82f6',  // Main brand color
  600: '#2563eb',  // Hover states
  700: '#1d4ed8',  // Active states
}

// Enhanced text colors for accessibility
text: {
  primary: '#111827',    // Maximum contrast
  secondary: '#374151',  // Good contrast
  tertiary: '#6b7280',  // Sufficient contrast
}
```

### Spacing Scale

```typescript
spacing: {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
}
```

### Typography

```typescript
fontSize: {
  sm: '0.875rem',   // 14px - Small text
  base: '1rem',     // 16px - Body text
  lg: '1.125rem',   // 18px - Large text
  xl: '1.25rem',    // 20px - Headings
}
```

## 🧩 Complete Component System

### **1. Base Components** ✅
- **`Button.tsx`** - Standardized buttons with variants, sizes, loading states
- **`Card.tsx`** - Card layouts with header, content, footer
- **`Layout.tsx`** - Container, Grid, Flex, Spacing, Section utilities
- **`FormElements.tsx`** - Enhanced Input, Textarea, Select, Label components

### **2. Modal Components** ✅
- **`Modal.tsx`** - Modal with overlay, escape handling, focus management
- **`ModalHeader`**, **`ModalBody`**, **`ModalFooter`** - Composable modal parts

### **3. Status Components** ✅
- **`Status.tsx`** - StatusBadge, StatusIndicator, ConnectionStatus
- **`Alert.tsx`** - Alert, Toast, Banner notifications

### **4. Empty State Components** ✅
- **`EmptyState.tsx`** - Generic and specific empty states
- **`ConnectionsEmptyState`**, **`WorkflowsEmptyState`**, **`SecretsEmptyState`**

### **5. Navigation Components** ✅
- **`Navigation.tsx`** - TabNavigation, MobileTabNavigation, Breadcrumb, Pagination
- **`Dropdown.tsx`** - Dropdown, UserDropdown, DropdownItem, DropdownDivider

### **6. Search & Filter Components** ✅
- **`Search.tsx`** - Search, FilterSelect, SearchFilterBar

### **7. Progress & Loading Components** ✅
- **`Progress.tsx`** - ProgressBar, Skeleton, LoadingState, Spinner, LoadingOverlay, StepProgress

### **8. Data Display Components** ✅
- **`DataDisplay.tsx`** - Table, List, Stats, Badge

### **9. Form Components** ✅
- **`Form.tsx`** - FormGroup, FormSection, FormActions, FormError, FormSuccess, FormGrid

### **10. Icon Components** ✅
- **`Icon.tsx`** - Complete icon library with consistent sizing

### **11. Hero & Welcome Components** ✅
- **`Hero.tsx`** - Hero, WelcomeSection, FeatureHighlight, GradientBackground

### **12. Tooltip & Popover Components** ✅
- **`Tooltip.tsx`** - Tooltip, Popover, HelpText

### **13. Onboarding Components** ✅
- **`Onboarding.tsx`** - ProgressIndicator, StepNavigation, FeatureUnlock, OnboardingStage, OnboardingProgress, WelcomeBanner

## 🎯 Component Usage Examples

### **Primary Action Button:**
```tsx
import { PrimaryActionButton } from '@/components/ui/Button';

<PrimaryActionButton
  action="create-connection"
  onClick={handleCreate}
  loading={isLoading}
>
  Create Connection
</PrimaryActionButton>
```

### **Complete Form with Modal:**
```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { FormSection, FormGrid, FormActions } from '@/components/ui/Form';
import { PrimaryActionButton } from '@/components/ui/Button';

<Modal isOpen={showModal} onClose={handleClose} title="Create Connection">
  <ModalBody>
    <FormSection title="Connection Details">
      <FormGrid columns={2}>
        <FormField>
          <FormLabel htmlFor="name" required>Connection Name</FormLabel>
          <Input id="name" name="name" required />
        </FormField>
      </FormGrid>
    </FormSection>
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <PrimaryActionButton action="submit-connection" onClick={handleSubmit}>
      Create Connection
    </PrimaryActionButton>
  </ModalFooter>
</Modal>
```

### 2. Form Components

**Enhanced Input:**
```tsx
import { Input } from '@/components/ui/FormElements';

<Input
  label="Email Address"
  type="email"
  required
  error={emailError}
  placeholder="Enter your email"
/>
```

**Form Field with Validation:**
```tsx
<Input
  label="API Key"
  type="password"
  required
  error={apiKeyError}
  helperText="Keep this secure and private"
/>
```

### 3. Layout Components

**Container:**
```tsx
import { Container } from '@/components/ui/Layout';

<Container size="lg" padding>
  <h1>Dashboard</h1>
  {/* Content */}
</Container>
```

**Grid Layout:**
```tsx
import { Grid } from '@/components/ui/Layout';

<Grid cols={3} gap="md">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

**Flex Layout:**
```tsx
import { Flex } from '@/components/ui/Layout';

<Flex justify="between" align="center" gap="md">
  <h2>Title</h2>
  <Button>Action</Button>
</Flex>
```

### 4. Card Components

**Basic Card:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

<Card>
  <CardHeader>
    <CardTitle>Connection Details</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

## 📱 Responsive Design

### Breakpoint Strategy

```typescript
breakpoints: {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
}
```

### Mobile-First Approach

```tsx
// Mobile-first responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>

// Responsive text sizing
<h1 className="text-xl md:text-2xl lg:text-3xl">
  Responsive Heading
</h1>
```

## ♿ Accessibility Standards

### Required Attributes

```tsx
// All interactive elements need proper labeling
<button
  aria-label="Close modal"
  aria-describedby="modal-description"
>
  <CloseIcon />
</button>

// Form inputs with proper associations
<Input
  label="Email"
  aria-describedby="email-help"
  aria-invalid={!!error}
/>
```

### Focus Management

```tsx
// Focus indicators for keyboard navigation
className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"

// Skip links for screen readers
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

## 🎯 Primary Action Patterns

### Data Test ID Standards

```tsx
// Primary actions follow this pattern
data-testid="primary-action {action}-btn"

// Examples:
data-testid="primary-action create-connection-btn"
data-testid="primary-action save-workflow-btn"
data-testid="primary-action execute-workflow-btn"
```

### Button Hierarchy

1. **Primary Actions**: Main user actions (Create, Save, Submit)
2. **Secondary Actions**: Supporting actions (Cancel, Edit, Delete)
3. **Tertiary Actions**: Less important actions (View, Info)

## 🧪 Testing Standards

### Component Testing

```tsx
// Test component rendering and props
describe('Button Component', () => {
  it('renders with correct variant', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-indigo-600');
  });
});
```

### E2E Testing

```tsx
// Test user interactions with primary actions
test('user can create connection', async ({ page }) => {
  await page.click('[data-testid="primary-action create-connection-btn"]');
  await expect(page.locator('[data-testid="connection-form"]')).toBeVisible();
});
```

## 📋 Implementation Checklist

### New Component Development

- [ ] Use design tokens from `src/lib/styles/designTokens.ts`
- [ ] Follow component patterns from `src/components/ui/`
- [ ] Include proper TypeScript interfaces
- [ ] Add accessibility attributes
- [ ] Include responsive design classes
- [ ] Add data-testid for testing
- [ ] Write unit tests
- [ ] Update component documentation

### Existing Component Updates

- [ ] Migrate to new design tokens
- [ ] Update to use standardized components
- [ ] Ensure accessibility compliance
- [ ] Update tests to use new patterns
- [ ] Verify responsive behavior

## 🔧 Development Tools

### VS Code Extensions

- **Tailwind CSS IntelliSense**: Autocomplete for Tailwind classes
- **Headwind**: Sort Tailwind classes automatically
- **ES7+ React/Redux/React-Native snippets**: Component shortcuts

### Linting Rules

```json
// .eslintrc.js
{
  "rules": {
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "tailwindcss/classnames-order": "warn"
  }
}
```

## 📚 Resources

### Documentation

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Accessibility](https://reactjs.org/docs/accessibility.html)

### Design System Files

- `src/lib/styles/designTokens.ts` - Design tokens
- `src/components/ui/` - Base components
- `docs/UX_SPEC.md` - UX specifications
- `docs/PRIMARY_ACTION_PATTERNS.md` - Action patterns

## 🚀 Best Practices

### 1. Component Composition

```tsx
// Compose complex components from simple ones
const DashboardCard = ({ title, children, actions }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {actions && (
        <Flex gap="sm">
          {actions}
        </Flex>
      )}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);
```

### 2. Consistent Spacing

```tsx
// Use spacing scale consistently
<div className="space-y-4">  {/* md spacing */}
  <Section padding="md">
    <Container size="lg">
      {/* Content */}
    </Container>
  </Section>
</div>
```

### 3. Performance Optimization

```tsx
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handle click
}, [dependency]);
```

## 🔄 Complete Implementation Strategy

### **Phase 1: Foundation** ✅ COMPLETED
- ✅ Design tokens established
- ✅ Base components created
- ✅ Enhanced styling system active
- ✅ All 13 component categories implemented

### **Phase 2: Component Migration** 🚀 READY TO START
- ✅ **New Features**: Use new components for all new development
- 🔄 **Existing Components**: Gradually migrate existing patterns
- ✅ **Consistency**: Maintain exact styling and behavior
- ✅ **Testing**: All components include proper data-testid attributes

## 🎯 Migration Priority

### **High Priority (Start Immediately)**
1. **New Features** - Use new components for all new development
2. **Forms** - Replace form patterns with Form components
3. **Modals** - Replace modal patterns with Modal components
4. **Buttons** - Replace button patterns with Button components

### **Medium Priority (Next Sprint)**
1. **Search/Filter** - Replace search patterns with Search components
2. **Loading States** - Replace loading patterns with Progress components
3. **Empty States** - Replace empty state patterns with EmptyState components
4. **Data Display** - Replace table/list patterns with DataDisplay components

### **Low Priority (Future Sprints)**
1. **Navigation** - Replace navigation patterns with Navigation components
2. **Status Indicators** - Replace status patterns with Status components
3. **Tooltips** - Replace tooltip patterns with Tooltip components
4. **Onboarding** - Replace onboarding patterns with Onboarding components

## 🚀 Quick Start Guide

### **1. Import Components**
```tsx
// Base components
import { Button, PrimaryActionButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';

// Layout components
import { Container, Grid, Flex } from '@/components/ui/Layout';

// Form components
import { FormSection, FormGrid, FormActions } from '@/components/ui/Form';

// Modal components
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
```

### **2. Replace Existing Patterns**
```tsx
// OLD: Inline button styling
<button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
  Create Connection
</button>

// NEW: Standardized component
<PrimaryActionButton action="create-connection" onClick={handleCreate}>
  Create Connection
</PrimaryActionButton>
```

### **3. Use Complete Patterns**
```tsx
// Complete form with all components
<Modal isOpen={showModal} onClose={handleClose} title="Create Connection">
  <ModalBody>
    <FormSection title="Connection Details" description="Configure your API connection">
      <FormGrid columns={2}>
        <FormField>
          <FormLabel htmlFor="name" required>Connection Name</FormLabel>
          <Input id="name" name="name" required />
        </FormField>
        <FormField>
          <FormLabel htmlFor="type">API Type</FormLabel>
          <FilterSelect
            value={apiType}
            onChange={setApiType}
            options={apiTypeOptions}
          />
        </FormField>
      </FormGrid>
    </FormSection>
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <PrimaryActionButton action="submit-connection" onClick={handleSubmit}>
      Create Connection
    </PrimaryActionButton>
  </ModalFooter>
</Modal>
```

## 📊 Component Coverage Status

### **✅ Complete Coverage Achieved**
- **13 Component Categories** - All UI patterns covered
- **Perfect Pattern Matching** - Matches existing design exactly
- **TypeScript Safety** - Full type coverage
- **Accessibility Compliance** - WCAG 2.1 AA standards
- **Enhanced Styling Integration** - Works with existing system

### **🎯 Next Steps**
1. **Start using** new components in new features immediately
2. **Gradually migrate** existing components following priority order
3. **Maintain consistency** as application grows
4. **Document patterns** as they're implemented

---

**Last Updated**: January 2025  
**Next Review**: March 2025  
**Maintainer**: Development Team  
**Status**: ✅ COMPLETE - Ready for implementation
