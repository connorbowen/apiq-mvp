# APIQ Commit Checklist

## 🚨 **PRE-COMMIT REQUIREMENTS** (Must Pass All)

### **1. Code Quality & Standards**
- [ ] **Linting passes**: `npm run lint` - No ESLint errors or warnings
- [ ] **Type checking passes**: `npm run type-check` - No TypeScript errors
- [ ] **No mock data in production code**: `npm run check:no-mock-data` - No test data in dev/prod
- [ ] **Code follows project patterns**: Consistent with existing codebase style
- [ ] **No console.log statements**: Remove or replace with proper logging
- [ ] **No TODO comments without context**: All TODOs have clear descriptions and assignees

### **2. Test Requirements**
- [ ] **Unit tests pass**: `npm run test:unit` - All unit tests passing
- [ ] **Integration tests pass**: `npm run test:integration` - All integration tests passing
- [ ] **E2E tests pass for implemented features**: `npm run test:e2e:current` - All current E2E tests passing
  - **Note**: Some E2E tests may fail due to UI refresh issues unrelated to backend changes
  - **Acceptable**: E2E failures that are confirmed to be UI-only issues (backend API working correctly)
- [ ] **No flaky tests**: All tests are deterministic and reliable
- [ ] **Test coverage maintained**: No significant decrease in test coverage
- [ ] **New features have tests**: All new functionality has corresponding tests
- [ ] **UX compliance tests pass**: All tests validate UX spec requirements (headings, labels, accessibility)

### **3. Security & Data Protection**
- [ ] **No secrets in code**: No API keys, passwords, or tokens in source code
- [ ] **No sensitive data in logs**: Sensitive information is properly masked
- [ ] **Input validation**: All user inputs are validated and sanitized
- [ ] **Authentication checks**: All protected routes have proper auth validation
- [ ] **No SQL injection risks**: All database queries use parameterized queries
- [ ] **No XSS vulnerabilities**: User inputs are properly escaped

### **4. Implementation Status**
- [ ] **Feature is complete**: Feature works end-to-end, not partially implemented
- [ ] **No broken functionality**: Existing features still work correctly
- [ ] **Error handling implemented**: Proper error handling for all new code paths
- [ ] **User experience is polished**: No obvious UX issues or broken flows
- [ ] **UX compliance validated**: Feature complies with UX spec requirements
- [ ] **Documentation updated**: README, API docs, or user guides updated if needed

### **5. Database & Infrastructure**
- [ ] **Database migrations work**: `npm run db:migrate` - No migration errors
- [ ] **No breaking schema changes**: Database changes are backward compatible
- [ ] **Environment variables set**: All required env vars are documented and set
- [ ] **No hardcoded URLs**: All URLs use environment variables or config
- [ ] **Build passes**: `npm run build` - No build errors

## 🔍 **PRE-COMMIT CHECKS** (Run These Commands)

```bash
# 1. Code Quality
npm run lint
npm run type-check
npm run check:no-mock-data

# 2. Tests
npm run test:unit
npm run test:integration
npm run test:e2e:current

# 3. Build
npm run build

# 4. Database
npm run db:migrate
```

## 🚫 **COMMIT BLOCKERS** (Do NOT Commit If Any Are True)

### **Critical Blockers**
- [ ] **Any tests are failing** - Fix all failing tests before committing
- [ ] **Build is broken** - Fix build errors before committing
- [ ] **Linting errors exist** - Fix all linting issues before committing
- [ ] **TypeScript errors exist** - Fix all type errors before committing
- [ ] **Security vulnerabilities detected** - Address all security issues before committing
- [ ] **Feature is incomplete** - Complete the feature before committing
- [ ] **Breaking changes without migration** - Provide migration path for breaking changes

### **Quality Blockers**
- [ ] **No tests for new functionality** - Write tests for all new features
- [ ] **Mock data in production code** - Remove all test data from dev/prod code
- [ ] **Console.log statements** - Remove or replace with proper logging
- [ ] **Hardcoded secrets or URLs** - Use environment variables for all config
- [ ] **Poor error handling** - Implement proper error handling for all code paths
- [ ] **Unclear code or comments** - Code should be self-documenting with clear comments
- [ ] **UX compliance violations** - Feature must comply with UX spec requirements
- [ ] **Accessibility issues** - Must meet WCAG 2.1 AA standards

## ✅ **COMMIT READINESS CHECKLIST**

### **Before Every Commit**
- [ ] **All pre-commit checks pass** (run the commands above)
- [ ] **No commit blockers exist** (check the blocker lists above)
- [ ] **Code is ready for review** (clean, tested, documented)
- [ ] **Commit message follows conventions** (see below)

### **Commit Message Format**
```
type(scope): description

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
**Scope**: `auth`, `workflow`, `ui`, `api`, `security`, `database`

**Examples**:
```
feat(workflow): add natural language workflow generation

fix(auth): resolve OAuth2 callback redirect issue

test(ui): add E2E tests for chat interface

docs(api): update API documentation for new endpoints
```

## 🎯 **FEATURE-SPECIFIC CHECKLISTS**

### **Authentication Features**
- [ ] **OAuth2 flows tested**: All OAuth2 providers work correctly
- [ ] **Session management tested**: Sessions persist and expire correctly
- [ ] **Security headers set**: Proper security headers for auth endpoints
- [ ] **Error handling tested**: Auth errors are handled gracefully
- [ ] **Logout functionality tested**: Users can log out properly

### **API Integration Features**
- [ ] **OpenAPI parsing tested**: API specs are parsed correctly
- [ ] **Credential storage tested**: API credentials are encrypted and stored securely
- [ ] **Connection testing works**: API connections can be tested and validated
- [ ] **Error handling tested**: API failures are handled gracefully
- [ ] **Rate limiting implemented**: API calls respect rate limits

### **Workflow Engine Features**
- [ ] **Step execution tested**: Workflow steps execute correctly
- [ ] **Error handling tested**: Failed steps are handled properly
- [ ] **State management tested**: Workflow state is tracked correctly
- [ ] **Queue system tested**: Workflows are queued and processed correctly
- [ ] **Retry logic tested**: Failed steps are retried appropriately

### **UI/UX Features**
- [ ] **Responsive design tested**: UI works on different screen sizes
- [ ] **Accessibility tested**: UI meets WCAG 2.1 AA standards
- [ ] **Error states tested**: Error messages are clear and helpful
- [ ] **Loading states tested**: Loading indicators work correctly
- [ ] **Navigation tested**: All navigation flows work correctly
- [ ] **UX compliance tested**: Feature validates UX spec requirements
- [ ] **Activation flows tested**: Onboarding and conversion paths work smoothly

## 🔄 **CONTINUOUS INTEGRATION**

### **CI/CD Pipeline Requirements**
- [ ] **All tests pass in CI**: Tests run successfully in automated environment
- [ ] **Build succeeds in CI**: Application builds successfully in CI
- [ ] **No environment-specific code**: Code works in all environments
- [ ] **Database migrations work in CI**: Migrations run successfully in CI
- [ ] **Security scans pass**: No security vulnerabilities detected

## 📊 **QUALITY METRICS**

### **Maintain Quality Standards**
- [ ] **Test coverage >80%**: Maintain high test coverage
- [ ] **No flaky tests**: All tests are reliable and deterministic
- [ ] **Fast test execution**: Tests complete in reasonable time
- [ ] **Clean code**: Code follows best practices and is maintainable
- [ ] **Documentation**: Code is well-documented and self-explanatory
- [ ] **UX compliance**: All features comply with UX spec requirements
- [ ] **Accessibility**: All features meet WCAG 2.1 AA standards

## 🚨 **EMERGENCY COMMIT PROCEDURE**

### **Only for Critical Fixes**
If you need to commit a critical fix that doesn't pass all checks:

1. **Document the issue**: Create a detailed issue describing what's broken
2. **Create a hotfix branch**: Use `hotfix/` prefix for emergency fixes
3. **Minimal changes**: Only fix the critical issue, no additional changes
4. **Add TODO comments**: Mark incomplete work with clear TODOs
5. **Create follow-up issue**: Document what needs to be completed
6. **Review immediately**: Get immediate review and approval

**Example**:
```bash
git checkout -b hotfix/critical-auth-fix
# Make minimal fix
git commit -m "hotfix(auth): fix critical authentication bypass

- Fixes critical security vulnerability
- TODO: Add comprehensive tests in follow-up
- TODO: Improve error handling in follow-up"
```

## 📝 **POST-COMMIT VERIFICATION**

### **After Committing**
- [ ] **CI pipeline passes**: Verify all CI checks pass
- [ ] **Deployment succeeds**: Verify deployment to staging/production
- [ ] **Feature works in environment**: Test the feature in target environment
- [ ] **No regressions**: Verify existing functionality still works
- [ ] **Documentation updated**: Update any relevant documentation

## 🎯 **KEY PRINCIPLES**

1. **Never commit broken code** - Fix all issues before committing
2. **Test everything** - All new code must have tests
3. **Maintain quality** - Don't let quality slip for speed
4. **Document changes** - Clear commit messages and documentation
5. **Security first** - Never commit security vulnerabilities
6. **User experience** - Ensure features work end-to-end
7. **UX compliance** - All features must comply with UX spec requirements
8. **Accessibility** - All features must meet WCAG 2.1 AA standards

## 🎨 **UX COMPLIANCE CHECKLIST**

### **Required UX Validations**
- [x] **Headings & Hierarchy**: Proper h1/h2 structure, clear page titles ✅ **COMPLETED**
- [x] **Form Fields**: Proper labels, required indicators, ARIA attributes ✅ **COMPLETED** (Create Connection modal)
- [x] **Buttons & Actions**: Descriptive text, loading states, clear primary actions ✅ **COMPLETED**
- [x] **Error & Success Messaging**: Accessible containers, actionable messages ✅ **COMPLETED** (Create Connection modal)
- [x] **Navigation & Links**: Clear navigation, next-step guidance, back navigation ✅ **COMPLETED**
- [x] **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support ✅ **COMPLETED** (Create Connection modal, ConnectionsTab)
- [x] **Mobile Responsiveness**: Touch targets, adaptive layout, mobile navigation ✅ **COMPLETED**
- [x] **Search & Filter**: Real-time search, keyboard navigation, accessible filtering ✅ **COMPLETED** (ConnectionsTab)
- [ ] **Activation & Adoption**: Optimized onboarding, clear conversion paths

### **UX Testing Requirements**
- [ ] **E2E tests validate UX**: All tests check headings, labels, accessibility
- [ ] **Unit tests validate components**: Component tests check accessibility
- [ ] **Integration tests validate flows**: API tests check user experience
- [ ] **Mobile testing**: Test responsive behavior on different screen sizes
- [ ] **Accessibility testing**: Validate keyboard navigation and ARIA compliance
- [ ] **Activation testing**: Test onboarding and conversion flows

---

**Remember**: It's better to delay a commit than to commit broken code. Quality over speed! 