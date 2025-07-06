# APIQ E2E Test Guide

## 🎯 **Main Command: Run All Appropriate Tests**

```bash
npm run test:e2e:current
```

**This is your go-to command** - it runs all E2E tests for features that are actually implemented and working, based on your current implementation status.

## 🎨 **UX Compliance Testing**

All E2E tests validate best-in-class UX standards as defined in `docs/UX_SPEC.md`:

- **Headings & Hierarchy**: Tests assert correct `<h1>`/`<h2>` tags and descriptive text
- **Form Fields**: Tests validate proper labels, required indicators, and ARIA attributes  
- **Buttons**: Tests check descriptive button text and loading states
- **Error/Success Messaging**: Tests validate accessible error/success containers
- **Navigation**: Tests verify clear navigation links and next-step guidance
- **Accessibility**: Tests validate keyboard navigation and ARIA compliance

**UX Compliance is enforced in CI/CD** - tests must pass UX validation to be considered successful.

## 🔧 **Port Cleanup System**

All E2E test commands now include automatic port cleanup to prevent conflicts:

- **Automatic Port Management**: Tests automatically check for any process running on port 3000 before starting
- **Safe Process Handling**: The script will only kill processes on port 3000 if they are not the intended Next.js dev server or node process from the project root. If your dev/test server is running, it will be preserved and used for tests.
- **Reliable Test Execution**: No more port conflicts or tests falling back to different ports
- **Consistent Environment**: Tests always run on the expected port 3000

**How it works**:
- Each test command runs `./scripts/kill-port-3000.sh` before executing tests
- The script checks the process on port 3000. If it's your Next.js dev server or node process from the project root, it will not be killed. Otherwise, it will be terminated.
- Tests then start reliably on port 3000
- No manual intervention required

**Manual port cleanup** (if needed):
```bash
./scripts/kill-port-3000.sh
```
*Note: The script is now safe to use even if your dev server is running.*

## 📋 **Test Commands by Implementation Priority**

### **P0: Core Value Proposition** (Must Have for MVP)
```bash
npm run test:e2e:p0
```
**Tests**: Authentication, API Connections, Basic Workflow Engine, Security
**UX Compliance**: All P0 tests validate UX spec requirements for activation and conversion
**When to use**: Before any major changes to core functionality

### **P1: User Experience & Adoption** (High Priority)
```bash
npm run test:e2e:p1
```
**Tests**: UI Components, Enhanced Workflow Engine, Natural Language Workflow Creation, Workflow Templates, Onboarding, Mobile Responsiveness
**UX Compliance**: Comprehensive UX validation including accessibility and mobile responsiveness
**When to use**: When working on user interface or workflow features

### **P2: Enterprise Readiness** (Medium Priority)
```bash
npm run test:e2e:p2
```
**Tests**: Security & Compliance features, Performance & Load Testing
**When to use**: When implementing enterprise features

### **P3: Advanced AI & Optimization** (Low Priority)
```bash
npm run test:e2e:p3
```
**Status**: Not yet implemented - no tests to run
**When to use**: Will be available when P3 features are built

## 🔧 **Test Commands by Code Area**

### **Authentication Area**
```bash
npm run test:e2e:auth-area
```
**Tests**: All authentication and SSO flows (including Google OAuth2)
**UX Compliance**: Validates activation flows, clear messaging, and accessibility
**When to use**: When working on auth, login, registration, OAuth2, SSO

### **API Connections Area**
```bash
npm run test:e2e:connections-area
```
**Tests**: API connection management (excludes OAuth2 flows)
**When to use**: When working on OpenAPI integration, API connections

### **Workflow Engine Area**
```bash
npm run test:e2e:workflow-area
```
**Tests**: Basic workflow management, step execution, natural language workflow creation, workflow templates
**When to use**: When working on workflow creation, execution, step runner, AI features

### **User Interface Area**
```bash
npm run test:e2e:ui-area
```
**Tests**: All UI components, navigation, mobile responsiveness
**UX Compliance**: Comprehensive UX validation including headings, labels, accessibility, and navigation
**When to use**: When working on frontend, components, navigation, mobile

### **Security Area**
```bash
npm run test:e2e:security-area
```
**Tests**: Secrets vault, encryption, security features
**When to use**: When working on security, encryption, compliance

### **Performance Area**
```bash
npm run test:e2e:performance-area
```
**Tests**: Load testing, performance monitoring, scalability testing
**When to use**: When working on performance optimization, load testing

## ⚡ **Quick Test Commands**

### **Fast Feedback** (Under 30 seconds)
```bash
npm run test:e2e:fast
```
**Tests**: Critical UI + Basic Auth
**When to use**: During development for quick feedback

### **Smoke Test** (Under 1 minute)
```bash
npm run test:e2e:smoke
```
**Tests**: Critical UI + Auth + Security
**When to use**: Before commits, quick validation

### **Core Features** (Under 3 minutes)
```bash
npm run test:e2e:core
```
**Tests**: Auth + UI + Security + Basic Workflows
**When to use**: Before pushing to main branch

## 🐛 **Debugging Commands**

### **Interactive Debugging**
```bash
npm run test:e2e:debug
```
**Features**: Headed browser, debug mode, step-by-step execution
**When to use**: When tests are failing and you need to see what's happening

### **View Test Reports**
```bash
npm run test:e2e:report
```
**Features**: Opens HTML report with test results, screenshots, videos
**When to use**: After test runs to analyze failures

## 📊 **Test Coverage by Implementation Status**

### **✅ COMPLETED Features** (Always Run)
- **Authentication System**: JWT, OAuth2 (including Google), SSO
- **API Connection Management**: OpenAPI parsing, credential storage
- **Basic Workflow Engine**: Step runner, queue system, state management
- **Natural Language Workflow Creation**: AI-powered workflow generation
- **Workflow Templates**: Pre-built templates and customization
- **Onboarding & User Journey**: Guided experience and user adoption
- **Mobile Responsiveness**: Full mobile functionality
- **Performance & Load Testing**: System scalability validation
- **Core UI**: Navigation, basic components
- **Security**: Encrypted secrets vault

### **🚧 IN PROGRESS Features** (Run Simplified Tests)
- **Advanced Workflow Engine**: Core features work, advanced features pending
- **Enhanced UI**: Basic UI works, advanced features pending

### **❌ NOT IMPLEMENTED Features** (Skip Tests)
- **Advanced AI Features**: Skip complex AI workflow tests
- **Enterprise Features**: Skip enterprise-specific tests

## 🚀 **Recommended Workflow**

### **Daily Development**
```bash
# Quick feedback during coding
npm run test:e2e:fast

# Before committing changes
npm run test:e2e:smoke
```

### **Feature Development**
```bash
# When working on auth features
npm run test:e2e:auth-area

# When working on API connections
npm run test:e2e:connections-area

# When working on workflows
npm run test:e2e:workflow-area

# When working on UI
npm run test:e2e:ui-area

# When working on performance
npm run test:e2e:performance-area
```

### **Before Releases**
```bash
# Run all appropriate tests for current implementation
npm run test:e2e:current

# Run priority-based tests
npm run test:e2e:p0
npm run test:e2e:p1
```

### **When Tests Fail**
```bash
# Debug failing tests
npm run test:e2e:debug

# View detailed reports
npm run test:e2e:report
```

## 📝 **Test Command Summary**

| Command | Purpose | Time | When to Use |
|---------|---------|------|-------------|
| `test:e2e:current` | **Main command** - all implemented features | ~5 min | Daily, before releases |
| `test:e2e:fast` | Quick feedback | ~30 sec | During development |
| `test:e2e:smoke` | Basic validation | ~1 min | Before commits |
| `test:e2e:core` | Core features | ~3 min | Before pushing |
| `test:e2e:p0` | Priority 0 features | ~4 min | Core functionality changes |
| `test:e2e:p1` | Priority 1 features | ~3 min | UI/UX changes |
| `test:e2e:p2` | Priority 2 features | ~2 min | Enterprise features |
| `test:e2e:auth-area` | Authentication only | ~2 min | Auth changes |
| `test:e2e:connections-area` | API connections only | ~2 min | API integration changes |
| `test:e2e:workflow-area` | Workflow engine only | ~3 min | Workflow changes |
| `test:e2e:ui-area` | UI components only | ~2 min | UI changes |
| `test:e2e:security-area` | Security features only | ~1 min | Security changes |
| `test:e2e:performance-area` | Performance testing only | ~2 min | Performance changes |

## 🔧 **Infrastructure Setup**

### **SMTP Configuration for Email Testing**
For registration-verification tests, configure SMTP:

```bash
# Quick setup
npm run test:e2e:setup-smtp

# Configure in .env.local
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-test-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=noreply@apiq.com
```

**See `docs/E2E_SMTP_SETUP.md` for detailed setup instructions.**

### **UX Compliance Helper**
All tests use the `UXComplianceHelper` class for comprehensive UX validation:

```typescript
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const uxHelper = new UXComplianceHelper(page);
await uxHelper.validateCompleteUXCompliance();
```

**See `docs/UX_COMPLIANT_TESTING.md` for detailed UX compliance guide.**

## 📈 **Test Status & Results**

### **Current Test Status**
- **Total Test Files**: 24
- **Total Test Cases**: 300+
- **Test Coverage**: 100% of P0, P1, and P2 features
- **UX Compliance**: Fully compliant with UX spec requirements
- **Pass Rate**: 100% (all tests passing)

### **Test Categories**
1. **Authentication & Security** (5 files) - Core auth flows, OAuth2, password reset
2. **API Connections** (5 files) - OpenAPI integration, connection management
3. **Workflow Engine** (6 files) - Natural language creation, templates, execution
4. **User Interface** (5 files) - Navigation, mobile responsiveness, critical UI
5. **User Experience** (1 file) - Onboarding and user journey
6. **Performance & Security** (2 files) - Load testing, secrets management

### **Recent Achievements**
- ✅ Natural language workflow creation tests implemented
- ✅ Workflow templates and libraries tests implemented
- ✅ Onboarding and user journey tests implemented
- ✅ Mobile responsiveness tests implemented
- ✅ Performance and load testing implemented
- ✅ Complete UX compliance validation across all tests

**For detailed test results and status, see `docs/TEST_SUMMARY.md`.** 