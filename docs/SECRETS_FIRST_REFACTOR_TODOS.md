# Secrets-First Refactor TODO Summary

This document provides a comprehensive overview of all the TODO comments added throughout the codebase for the secrets-first refactor implementation.

## Overview

The secrets-first refactor aims to consolidate all credential storage into the secrets vault, eliminating duplication between the `ApiCredential` table and the secrets system. This will improve security, user experience, and maintainability.

## Files with TODO Comments

### Phase 1: Database Schema
- **`prisma/schema.prisma`** - Database schema changes for secrets-first approach

### Phase 2: Frontend Components
- **`src/components/dashboard/CreateConnectionModal.tsx`** - Connection creation flow updates
- **`src/components/dashboard/ConnectionsTab.tsx`** - Connection display and management
- **`src/components/dashboard/SecretsTab.tsx`** - Secrets management interface
- **`src/components/OAuth2Manager.tsx`** - OAuth2 management component updates

### Phase 3: API Client & Types
- **`src/lib/api/client.ts`** - API client methods for secret management
- **`src/types/index.ts`** - Type system updates for secrets-first approach

### Phase 4: Backend API Endpoints
- **`pages/api/connections/index.ts`** - Connection creation and management
- **`pages/api/secrets/index.ts`** - Secrets API enhancements
- **`pages/api/connections/[id]/credentials.ts`** - Credentials API migration
- **`pages/api/connections/refresh-token.ts`** - Token refresh API migration
- **`pages/api/connections/oauth2/callback.ts`** - OAuth2 callback API migration

### Phase 5: Core Services
- **`src/lib/secrets/secretsVault.ts`** - Secrets vault enhancements
- **`src/lib/services/connectionService.ts`** - Connection service updates
- **`src/services/openaiService.ts`** - OpenAI service updates
- **`src/lib/auth/oauth2.ts`** - OAuth2 service migration
- **`src/lib/workflow/stepRunner.ts`** - Workflow step runner updates

### Phase 6: Utilities & Infrastructure
- **`src/utils/encryption.ts`** - Encryption service updates
- **`src/middleware.ts`** - Middleware updates for secrets validation
- **`next.config.js`** - Configuration updates for secrets management

### Phase 7: Tests
- **`tests/integration/api/connections/connections-management.integration.test.ts`** - Integration tests
- **`tests/integration/api/connections.test.ts`** - Connection API tests
- **`tests/e2e/connections/connections-management.test.ts`** - E2E tests
- **`tests/integration/api/secrets.integration.test.ts`** - Secrets integration tests

### Phase 8: Documentation
- **`docs/SECRETS_FIRST_REFACTOR_PLAN.md`** - Comprehensive implementation plan
- **`docs/SECRETS_FIRST_REFACTOR_TODOS.md`** - Summary of all TODO comments

## TODO Categories

### Database Changes
- Add connection reference fields to secrets
- Update connection schema to reference secrets
- Add migration scripts for existing data

### Frontend Updates
- Update connection creation to use secrets
- Add secret management UI components
- Update connection display to show secret information
- Add secret creation during connection setup
- Update OAuth2 management to use secrets

### API Enhancements
- Add secret management endpoints
- Update connection APIs to use secrets
- Add migration endpoints for existing credentials
- Add connection-secret validation
- Update OAuth2 callback to use secrets

### Service Layer Updates
- Update authentication to use secrets
- Add connection-secret relationship management
- Add secret rotation handling
- Add connection status tracking based on secrets
- Update encryption service for secrets

### Infrastructure Updates
- Add middleware for secrets validation
- Update configuration for secrets management
- Add environment variables for secrets vault
- Add security headers for secrets routes

### Testing Updates
- Add tests for secret-based connections
- Add migration test scenarios
- Add rollback test scenarios
- Update existing tests to use secrets

## Implementation Phases

### Phase 1: Foundation (Database & Types)
- Update database schema
- Add new type definitions
- Create migration scripts

### Phase 2: Core Services
- Enhance secrets vault
- Update connection service
- Update OAuth2 service
- Update encryption service

### Phase 3: API Layer
- Update API endpoints
- Add new secret endpoints
- Add migration endpoints
- Update OAuth2 callback

### Phase 4: Frontend
- Update UI components
- Add secret management
- Update connection flows
- Update OAuth2 manager

### Phase 5: Infrastructure
- Update middleware
- Update configuration
- Add environment variables
- Add security headers

### Phase 6: Testing & Validation
- Update all tests
- Add migration tests
- Add rollback tests

### Phase 7: Migration & Cleanup
- Migrate existing data
- Remove old credential storage
- Update documentation

## Benefits

1. **Improved Security**: Centralized credential management with encryption
2. **Better UX**: Clear separation between connections and credentials
3. **Reduced Duplication**: Single source of truth for credentials
4. **Enhanced Audit**: Better tracking of credential usage
5. **Easier Management**: Unified interface for all secrets

## Risks & Mitigation

1. **Data Migration**: Risk of data loss during migration
   - Mitigation: Comprehensive backup and rollback procedures

2. **Breaking Changes**: Potential API compatibility issues
   - Mitigation: Gradual migration with backward compatibility

3. **Performance Impact**: Additional lookups for secrets
   - Mitigation: Caching and optimization strategies

## Success Metrics

1. All connections use secrets for credential storage
2. No duplicate credential storage in the system
3. All tests pass with secrets-first approach
4. Zero data loss during migration
5. Improved user experience metrics

## Next Steps

1. Review and prioritize TODO items
2. Create detailed implementation plan
3. Set up development environment for testing
4. Begin with Phase 1 (Database & Types)
5. Implement comprehensive testing strategy

---

*This document should be updated as the refactor progresses to track completion status and any additional requirements discovered during implementation.* 