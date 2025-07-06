# APIQ Development Tools & Scripts

## Overview

This document provides comprehensive documentation for all development tools and scripts available in the APIQ project. These tools help with testing, debugging, performance optimization, and development workflow automation.

## Table of Contents

1. [Test Analysis & Optimization Tools](#test-analysis--optimization-tools)
2. [Database & Infrastructure Tools](#database--infrastructure-tools)
3. [Development Workflow Tools](#development-workflow-tools)
4. [Debugging & Troubleshooting Tools](#debugging--troubleshooting-tools)
5. [Environment Management Tools](#environment-management-tools)
6. [Performance Testing Tools](#performance-testing-tools)
7. [Script Usage Guidelines](#script-usage-guidelines)

## Test Analysis & Optimization Tools

### 1. Test Failure Analysis

**Script**: `analyze-test-failures.js`

**Purpose**: Analyzes Jest test results to identify failing test suites and their failure patterns.

**Usage**:
```bash
# Analyze test failures from jest-int-summary.json
node analyze-test-failures.js
```

**Features**:
- Ranks failing test suites by failure count
- Shows failure rates and error messages
- Provides optimization recommendations
- Color-coded output for easy reading
- Identifies patterns in test failures

**Output Example**:
```
Test Failure Analysis
Found 3 failing test suites

Rank │ Suite Name                    │ Failed │ Passed │ Total │ Failure % │ First Error
─────┼───────────────────────────────┼────────┼────────┼───────┼───────────┼─────────────────────
1    │ auth-flow.test.ts             │ 5      │ 15     │ 20    │ 25.0%     │ Database connection failed
2    │ oauth2.test.ts                │ 3      │ 12     │ 15    │ 20.0%     │ OAuth2 provider not configured
3    │ secrets.test.ts               │ 2      │ 8      │ 10    │ 20.0%     │ Encryption key missing

Summary:
  • Total failing tests: 10
  • Overall failure rate: 22.2%
  • Top 15 suites shown (3 total failing suites)

Recommended Action Order:
  1. Fix suites with highest failure counts first (Pareto principle)
  2. Address timeout/deadlock issues (likely transaction problems)
  3. Replace raw Prisma calls with test utilities
  4. Fix hardcoded test data violations
```

**Prerequisites**:
- Jest test results in `jest-int-summary.json`
- Run tests with `--json` flag to generate summary

### 2. Test Pattern Application

**Script**: `scripts/apply-test-pattern.js`

**Purpose**: Codemod script that applies consistent test data patterns to integration tests.

**Usage**:
```bash
# Apply to all integration tests
node scripts/apply-test-pattern.js

# Apply to specific test file
node scripts/apply-test-pattern.js tests/integration/api/auth.test.ts
```

**Features**:
- Automatically adds `createTestData` imports
- Converts `beforeAll` to `beforeEach` for test isolation
- Removes redundant `afterAll` cleanup blocks
- Detects test data types based on file content
- Ensures proper test isolation and cleanup

**Supported Test Data Types**:
- `createConnectionTestData` - For API connection tests
- `createOAuth2TestData` - For OAuth2 authentication tests
- `createWorkflowTestData` - For workflow tests
- `createCommonTestData` - For general user tests

**Example Transformation**:
```typescript
// Before
describe('API Connections', () => {
  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: { email: 'test@example.com', name: 'Test User' }
    });
  });
  
  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUser.id } });
  });
});

// After
import { createConnectionTestData } from '../../helpers/createTestData';

describe('API Connections', () => {
  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createConnectionTestData();
    testUser = testData.user;
    testConnection = testData.connection;
  });
});
```

### 3. Slow Test Identification

**Script**: `scripts/identify-slow-tests.sh`

**Purpose**: Identifies tests that are taking too long to run and need optimization.

**Usage**:
```bash
# Identify slow tests
./scripts/identify-slow-tests.sh
```

**Features**:
- Measures execution time for each test
- Identifies tests taking >5 seconds
- Detects tests that timeout
- Provides optimization recommendations
- Generates performance report

**Output Example**:
```
🔍 Identifying Slow Integration Tests
=====================================

📊 Performance Summary
=====================
Test File | Duration | Status
---------|----------|--------
auth-flow.test.ts    | 8.5s     | ✅ PASS
oauth2.test.ts       | 6.2s     | ✅ PASS
secrets.test.ts      | 4.1s     | ✅ PASS

🎯 Optimization Recommendations:

🚨 Tests taking >5 seconds (need optimization):
   - auth-flow.test.ts
   - oauth2.test.ts

⏰ Tests that timed out (critical optimization needed):
   - workflow.test.ts
```

**Results File**: `test-results/performance-results.txt`

## Database & Infrastructure Tools

### 1. Secrets Vault Key Rotation

**Script**: `scripts/rotate-secrets.js`

**Purpose**: Securely rotates the master encryption key for the secrets vault.

**Usage**:
```bash
# Rotate secrets vault master key
npm run rotate-secrets
```

**Features**:
- Re-encrypts all secrets with new master key
- Maintains data integrity during rotation
- Updates environment configuration
- Provides rollback capabilities

**Security Notes**:
- Only run in production environments
- Ensure backup of old master key
- Test in staging environment first
- Coordinate with team for deployment

**Process**:
1. Generates new master key
2. Re-encrypts all existing secrets
3. Updates database with new key ID
4. Updates environment configuration
5. Provides rollback instructions

### 2. Database Health Check

**Script**: `scripts/check-db-health.js`

**Purpose**: Verifies database connectivity and health status.

**Usage**:
```bash
# Test database connection and health
npm run db:health
```

**Features**:
- Tests database connection
- Validates schema integrity
- Checks migration status
- Reports database health metrics

**Health Checks**:
- Connection test
- Schema validation
- Migration status
- Performance metrics
- Connection pool status

## Development Workflow Tools

### 1. Smart Development Server

**Script**: `scripts/smart-dev.sh`

**Purpose**: Intelligent development server that handles setup automatically.

**Usage**:
```bash
# Start development server with automatic setup
npm run smart-dev
```

**Features**:
- Automatically runs database migrations
- Generates Prisma client if needed
- Checks environment configuration
- Provides helpful error messages
- Optimized for development workflow

**Automated Steps**:
1. Environment validation
2. Database connection test
3. Migration check and run
4. Prisma client generation
5. Development server start

### 2. Test Orchestration

**Script**: `scripts/run-tests.sh`

**Purpose**: Orchestrates the complete testing workflow.

**Usage**:
```bash
# Run comprehensive test suite with proper setup
./scripts/run-tests.sh
```

**Features**:
- Runs all test types in proper order
- Handles test environment setup
- Provides detailed test reports
- Optimizes test execution
- Generates coverage reports

**Test Sequence**:
1. Environment setup
2. Database preparation
3. Unit tests
4. Integration tests
5. E2E tests
6. Coverage report generation

## Debugging & Troubleshooting Tools

### 1. Server Health Monitoring

**Script**: `scripts/check-server-health.js`

**Purpose**: Verifies that the development server is running and responding correctly.

**Usage**:
```bash
# Check default server (localhost:3000)
node scripts/check-server-health.js

# Check custom server
BASE_URL=http://localhost:3001 node scripts/check-server-health.js
```

**Features**:
- Checks server health endpoint
- Provides helpful error messages
- Suggests next steps if server is down
- Used by E2E tests to ensure server is ready

**Health Check Process**:
1. HTTP request to `/api/health`
2. Status code validation
3. Response time measurement
4. Error handling and reporting

### 2. Test Isolation Helper

**Script**: `tests/helpers/testIsolation.js`

**Purpose**: Helps create unique test data to prevent test conflicts.

**Usage**:
```bash
# Generate unique test identifiers
node tests/helpers/testIsolation.js
```

**Features**:
- Generates unique emails and identifiers
- Ensures test isolation
- Prevents test data conflicts
- Improves test reliability

**Generated Data**:
- Unique email addresses
- Unique user names
- Unique API connection names
- Timestamp-based identifiers

## Environment Management Tools

### 1. Environment Validation

**Script**: `scripts/validate-env.js`

**Purpose**: Validates that all required environment variables are set correctly.

**Usage**:
```bash
# Validate environment configuration
npm run validate-env
```

**Features**:
- Checks required environment variables
- Validates variable formats
- Provides helpful error messages
- Ensures proper configuration

**Validation Checks**:
- Required variables present
- Variable format validation
- Database URL format
- API key formats
- Security key requirements

### 2. Development Environment Setup

**Script**: `scripts/setup-dev.sh`

**Purpose**: Automates the complete development environment setup process.

**Usage**:
```bash
# Complete development environment setup
npm run setup-dev
```

**Features**:
- Installs dependencies
- Sets up database
- Configures environment
- Runs initial migrations
- Validates setup

**Setup Steps**:
1. Dependency installation
2. Environment file creation
3. Database setup
4. Migration execution
5. Validation tests

## Performance Testing Tools

### 1. Health Endpoint Performance Test

**Script**: `scripts/run-performance-test.sh`

**Purpose**: Tests the performance and reliability of health endpoints under load.

**Usage**:
```bash
# Run performance tests for health endpoints
./scripts/run-performance-test.sh
```

**Features**:
- Load tests health endpoints
- Measures response times
- Identifies performance bottlenecks
- Generates performance reports

**Test Scenarios**:
- Single request baseline
- Concurrent request testing
- Sustained load testing
- Error rate monitoring

### 2. Server Health Performance Test

**Script**: `scripts/test-health-performance.sh`

**Purpose**: Tests server health endpoints under various load conditions.

**Usage**:
```bash
# Test server health under load
./scripts/test-health-performance.sh
```

**Features**:
- Load tests health endpoints
- Measures response times
- Identifies performance issues
- Generates performance metrics

**Performance Metrics**:
- Response time (min, max, avg)
- Throughput (requests/second)
- Error rate
- Resource utilization

## Script Usage Guidelines

### When to Use Each Tool

#### **During Development**
1. **Smart Development Server** - For daily development work
2. **Environment Validation** - Before starting new features
3. **Server Health Check** - When debugging server issues

#### **During Testing**
1. **Test Pattern Application** - When adding new integration tests
2. **Test Failure Analysis** - When tests are failing
3. **Slow Test Identification** - When test suite is slow

#### **During Debugging**
1. **Server Health Monitoring** - To verify server status
2. **Test Isolation Helper** - To prevent test conflicts
3. **Performance Testing** - To identify bottlenecks

#### **During Deployment**
1. **Secrets Vault Key Rotation** - For production security updates
2. **Database Health Check** - To verify database status
3. **Environment Validation** - To ensure proper configuration

### Best Practices

#### **Test Tools**
- Run test analysis tools regularly
- Address slow tests promptly
- Use test pattern application for consistency
- Monitor test performance trends

#### **Performance Tools**
- Run performance tests before deployments
- Monitor performance metrics over time
- Set performance baselines
- Document performance improvements

#### **Security Tools**
- Rotate keys regularly in production
- Test key rotation in staging first
- Keep backup keys secure
- Document rotation procedures

#### **Development Tools**
- Use smart development server for daily work
- Validate environment before starting
- Run health checks when debugging
- Keep tools updated and maintained

### Troubleshooting

#### **Common Issues**

**Test Analysis Tools**:
- Ensure `jest-int-summary.json` exists
- Check file permissions for scripts
- Verify Node.js version compatibility

**Performance Tools**:
- Ensure server is running for health checks
- Check network connectivity
- Verify endpoint availability

**Database Tools**:
- Check database connection
- Verify environment variables
- Ensure proper permissions

#### **Error Resolution**

**Permission Denied**:
```bash
chmod +x scripts/*.sh
```

**Node.js Version Issues**:
```bash
nvm use 18
```

**Database Connection Issues**:
```bash
npm run db:health
```

**Environment Issues**:
```bash
npm run validate-env
```

### Integration with CI/CD

#### **Automated Testing**
- Include test analysis in CI pipeline
- Run performance tests on staging
- Validate environment in deployment
- Monitor test performance trends

#### **Quality Gates**
- Test failure analysis as quality gate
- Performance benchmarks as requirements
- Environment validation before deployment
- Security checks in CI pipeline

---

**Development Tools Summary**
- **Test Tools**: 5 tools for test analysis and optimization
- **Database Tools**: 2 tools for database management
- **Workflow Tools**: 2 tools for development automation
- **Debugging Tools**: 2 tools for troubleshooting
- **Environment Tools**: 2 tools for environment management
- **Performance Tools**: 2 tools for performance testing

*Last Updated: July 2025*
*Document Owner: Engineering Team* 