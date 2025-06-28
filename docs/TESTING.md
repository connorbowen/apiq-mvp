# APIQ Testing Guide

This document describes the testing strategy, coverage, and how to run tests for the APIQ project.

---

## 🧪 Test Types & Coverage

### 1. **Unit Tests**
- **Location:** `tests/unit/`
- **Purpose:** Test individual functions/utilities in isolation (e.g., OpenAPI parser, endpoint extraction, RBAC utils).
- **Examples:**
  - `tests/unit/lib/api/parser.test.ts` — OpenAPI spec parsing, error handling, hash generation
  - `tests/unit/lib/api/endpoints.test.ts` — Endpoint extraction, filtering, and DB logic

### 2. **Integration Tests**
- **Location:** `tests/integration/`
- **Purpose:** Test API routes and flows with mocked DB and service dependencies.
- **Examples:**
  - `tests/integration/api/connections.test.ts` — API connection creation, OpenAPI ingestion, endpoint extraction, error handling

### 3. **End-to-End (e2e) Tests**
- **Location:** `tests/e2e/`
- **Purpose:** Simulate real user/API flows across the stack (planned for Phase 3+).
- **Examples:**
  - `tests/e2e/app.test.ts` — (Planned) Full user journey: create connection → ingest spec → list endpoints → delete endpoints

## Authentication & Integration Testing

### Authentication Demo Script

- File: `scripts/test-auth.js`
- Requires: Node.js 18+ (for fetch)
- Usage:
  1. Start the dev server: `npm run dev`
  2. In another terminal: `node scripts/test-auth.js`
- The script will:
  - Log in as each test user (admin, user, super admin)
  - Test protected endpoints (listing, creating, deleting API connections/endpoints)
  - Demonstrate RBAC (e.g., only admins can delete endpoints)
  - Show error handling for invalid credentials and tokens

#### Test Users
- `admin@example.com` / `admin123` (ADMIN)
- `user@example.com` / `user123` (USER)
- `super@example.com` / `super123` (SUPER_ADMIN)

### Integration Tests

- Run all integration tests:
  ```bash
  npm test
  ```
- Run only authentication tests:
  ```bash
  npm test -- --testPathPattern=auth.test.ts
  ```
- Tests are located in `tests/integration/api/`.
- These tests cover login, token refresh, current user, and RBAC logic.

See also: `docs/QUICK_START.md` for a quick overview.

---

## 🟢 How to Run Tests

### **All Tests**
```bash
npm test
```

### **Unit Tests Only**
```bash
npm run test:unit
```

### **Integration Tests Only**
```bash
npm run test:integration
```

### **End-to-End (e2e) Tests**
```bash
npm run test:e2e
```

---

## 📝 Test Coverage Status
- [x] Unit tests for OpenAPI parser and endpoint extraction
- [x] Integration tests for API connection and endpoint flows
- [ ] e2e tests for full user journey (planned)
- [x] RBAC logic tested at unit/integration level

---

## 🛠️ Notes
- All tests use Jest (unit/integration) or Playwright (e2e)
- DB is mocked for unit/integration tests; e2e tests use a test DB
- See `package.json` scripts for more test commands

---

For any issues, see `docs/TROUBLESHOOTING.md` or ask in the project chat. 