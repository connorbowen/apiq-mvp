# APIQ E2E Test Guide

## 🎯 **Main Command: Run All Appropriate Tests**

```bash
npm run test:e2e:current
```

**This is your go-to command** - it runs all E2E tests for features that are actually implemented and working, based on your current implementation status.

## 🔧 **Port Cleanup System**

All E2E test commands now include automatic port cleanup to prevent conflicts:

- **Automatic Port Management**: Tests automatically kill any process running on port 3000 before starting
- **Reliable Test Execution**: No more port conflicts or tests falling back to different ports
- **Consistent Environment**: Tests always run on the expected port 3000

**How it works**:
- Each test command runs `./scripts/kill-port-3000.sh` before executing tests
- The script finds and kills any process using port 3000
- Tests then start reliably on port 3000
- No manual intervention required

**Manual port cleanup** (if needed):
```bash
./scripts/kill-port-3000.sh
```

## 📋 **Test Commands by Implementation Priority**

### **P0: Core Value Proposition** (Must Have for MVP)
```bash
npm run test:e2e:p0
```
**Tests**: Authentication, API Connections, Basic Workflow Engine, Security
**When to use**: Before any major changes to core functionality

### **P1: User Experience & Adoption** (High Priority)
```bash
npm run test:e2e:p1
```
**Tests**: UI Components, Enhanced Workflow Engine
**When to use**: When working on user interface or workflow features

### **P2: Enterprise Readiness** (Medium Priority)
```bash
npm run test:e2e:p2
```
**Tests**: Security & Compliance features
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
**Tests**: Basic workflow management and step execution (excludes advanced features)
**When to use**: When working on workflow creation, execution, step runner

### **User Interface Area**
```bash
npm run test:e2e:ui-area
```
**Tests**: All UI components and navigation
**When to use**: When working on frontend, components, navigation

### **Security Area**
```bash
npm run test:e2e:security-area
```
**Tests**: Secrets vault, encryption, security features
**When to use**: When working on security, encryption, compliance

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
- **Core UI**: Navigation, basic components
- **Security**: Encrypted secrets vault

### **🚧 IN PROGRESS Features** (Run Simplified Tests)
- **Natural Language Workflow Creation**: Basic OpenAI integration exists
- **Advanced Workflow Engine**: Core features work, advanced features pending
- **Enhanced UI**: Basic UI works, advanced features pending

### **❌ NOT IMPLEMENTED Features** (Skip Tests)
- **OAuth2 API Integration**: Skip OAuth2 flow tests
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

## 🔄 **Updating Test Commands**

As you implement new features, update the test commands:

### **When P0.1 (Natural Language Workflow Creation) is Complete**
```bash
# Add to test:e2e:current
npm run test:e2e:current -- tests/e2e/workflow-engine/natural-language.test.ts

# Add to test:e2e:p0
npm run test:e2e:p0 -- tests/e2e/workflow-engine/natural-language.test.ts
```

### **When P1.1 (Chat Interface) is Complete**
```bash
# Add to test:e2e:current
npm run test:e2e:current -- tests/e2e/ui/chat-interface.test.ts

# Add to test:e2e:p1
npm run test:e2e:p1 -- tests/e2e/ui/chat-interface.test.ts
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
| `test:e2e:auth-area` | Authentication only | ~2 min | Auth changes |
| `test:e2e:connections-area` | API connections only | ~2 min | API integration changes |
| `test:e2e:workflow-area` | Workflow engine only | ~2 min | Workflow changes |
| `test:e2e:ui-area` | UI components only | ~2 min | Frontend changes |
| `test:e2e:debug` | Interactive debugging | Variable | When tests fail |

## 🎯 **Key Principle**

**Always use `npm run test:e2e:current` as your main command** - it's designed to run only the tests for features that are actually implemented and working, based on your current implementation status.

This ensures you get fast, reliable feedback without the noise from tests for features that aren't built yet.

## 🛠️ Troubleshooting Google OAuth2
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in your environment
- Make sure your Google Cloud Console OAuth2 credentials have the correct redirect URIs
- Restart the dev server after changing environment variables 