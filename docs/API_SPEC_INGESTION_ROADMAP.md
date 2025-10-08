# API Spec Ingestion Implementation Roadmap

## Overview
This document outlines the prioritized implementation plan for expanding API spec ingestion capabilities beyond OpenAPI, addressing the critical need for endpoint discovery in our chat system.

## Current State
- ✅ OpenAPI URL import (manual)
- ✅ OpenAPI spec paste (manual) 
- ✅ API Catalog with pre-configured endpoints
- ❌ Auto-discovery of OpenAPI specs
- ❌ Alternative spec format support
- ❌ Manual endpoint creation

## Implementation Priority Order

### Phase 1: Quick Wins (High Impact, Low Effort)

#### 1. Auto-Discovery of OpenAPI Specs
**Priority: P0 - Critical**
**Effort: Low**
**Impact: High**

**Implementation:**
- Add "Auto-discover" button in CreateConnectionModal
- Try common paths: `/swagger.json`, `/openapi.json`, `/api-docs`, `/docs/swagger.json`
- Add discovery logic in openApiService
- Add validation and error handling for discovered specs
- Add E2E tests for auto-discovery functionality
- Add caching of successful discoveries
- Add timeout and fallback handling
- Add loading state during discovery process
- Add auto-fill of discovered URL in form
- Add success/error feedback for discovery attempts

**Files to modify:**
- `src/components/dashboard/CreateConnectionModal.tsx` (add auto-discover button)
- `src/services/openApiService.ts` (add discovery logic)
- `src/lib/api/parser.ts` (enhance parsing)
- `tests/e2e/connections/` (add discovery tests)

**Acceptance Criteria:**
- [ ] Auto-discover button appears in connection form
- [ ] System tries common OpenAPI paths automatically
- [ ] Successfully discovered specs are auto-filled
- [ ] Clear error messages for failed discoveries
- [ ] Discovery results are cached
- [ ] E2E tests cover happy path and error cases

---

### Phase 2: Import Solutions (Medium Impact, Medium Effort)

#### 2. Postman + Insomnia Import
**Priority: P1 - High**
**Effort: Medium**
**Impact: High**

**Implementation:**
- Add import options in CreateConnectionModal
- Parse Postman collection v2.1 format
- Parse Insomnia collection format
- Convert collections to endpoint format
- Map collection requests to API endpoints
- Preserve authentication and headers
- Add validation for collection format

**Files to create:**
- `src/lib/importers/postmanImporter.ts`
- `src/lib/importers/insomniaImporter.ts`
- `src/components/ImportCollectionModal.tsx`

**Files to modify:**
- `src/components/dashboard/CreateConnectionModal.tsx`
- `pages/api/connections/index.ts` (add import endpoints)

**Acceptance Criteria:**
- [ ] Import buttons for Postman/Insomnia in connection form
- [ ] File upload for collection files
- [ ] Parse and validate collection formats
- [ ] Convert to internal endpoint format
- [ ] Preserve request methods, paths, and parameters
- [ ] Handle authentication from collections
- [ ] Error handling for invalid collections

#### 3. cURL/HAR Import (Tiny Build, Huge Catch-All)
**Priority: P1 - High**
**Effort: Low**
**Impact: Very High**

**Implementation:**
- Add cURL import textarea in connection form
- Parse cURL commands to extract endpoints
- Parse HAR files to extract API calls
- Convert to endpoint format
- Support multiple cURL commands
- Extract authentication from cURL headers
- Generate endpoint summaries from cURL

**Files to create:**
- `src/lib/importers/curlImporter.ts`
- `src/lib/importers/harImporter.ts`

**Files to modify:**
- `src/components/dashboard/CreateConnectionModal.tsx`
- `src/lib/api/endpoints.ts` (add cURL conversion)

**Acceptance Criteria:**
- [ ] cURL import textarea in connection form
- [ ] HAR file upload support
- [ ] Parse cURL commands to extract endpoints
- [ ] Parse HAR files to extract API calls
- [ ] Convert to internal endpoint format
- [ ] Extract authentication from headers
- [ ] Support multiple requests per import
- [ ] Generate meaningful endpoint names

---

### Phase 3: Long-tail Solutions (High Impact, High Effort)

#### 4. Manual Endpoint Builder (Non-Spec Teams)
**Priority: P2 - Medium**
**Effort: High**
**Impact: Medium**

**Implementation:**
- Create endpoint builder UI component
- Add/remove endpoints dynamically
- Configure method, path, parameters
- Add request/response schemas
- Save endpoints to connection
- Validate endpoint configuration
- Preview endpoint documentation

**Files to create:**
- `src/components/EndpointBuilder.tsx`
- `src/components/EndpointEditor.tsx`
- `src/lib/endpointBuilder.ts`

**Files to modify:**
- `src/components/dashboard/CreateConnectionModal.tsx`
- `pages/api/connections/index.ts`
- `pages/api/endpoints/` (new endpoints)

**Acceptance Criteria:**
- [ ] Endpoint builder UI in connection form
- [ ] Add/remove endpoints dynamically
- [ ] Configure method, path, parameters
- [ ] Add request/response schemas
- [ ] Save endpoints to connection
- [ ] Validate endpoint configuration
- [ ] Preview generated documentation

#### 5. GraphQL Introspection (Modern Backends)
**Priority: P2 - Medium**
**Effort: High**
**Impact: Medium**

**Implementation:**
- Add GraphQL introspection support
- Parse GraphQL schema
- Convert queries/mutations to REST-like endpoints
- Generate endpoint documentation
- Support GraphQL subscriptions
- Handle GraphQL authentication

**Files to create:**
- `src/lib/importers/graphqlImporter.ts`
- `src/lib/graphql/introspection.ts`
- `src/components/GraphQLIntrospectionModal.tsx`

**Files to modify:**
- `src/components/dashboard/CreateConnectionModal.tsx`
- `src/lib/api/endpoints.ts`

**Acceptance Criteria:**
- [ ] GraphQL introspection option in connection form
- [ ] Parse GraphQL schema from introspection
- [ ] Convert queries to GET endpoints
- [ ] Convert mutations to POST endpoints
- [ ] Generate endpoint documentation
- [ ] Handle GraphQL authentication
- [ ] Support subscription endpoints

#### 6. Doc Scraping (Last Resort, Supervised)
**Priority: P3 - Low**
**Effort: Very High**
**Impact: Low**

**Implementation:**
- Add supervised documentation scraping
- Parse HTML documentation pages
- Extract API endpoint information
- Use AI to identify endpoint patterns
- Manual review and approval process
- Support common documentation formats

**Files to create:**
- `src/lib/scrapers/docScraper.ts`
- `src/lib/scrapers/htmlParser.ts`
- `src/components/DocScrapingModal.tsx`

**Files to modify:**
- `src/components/dashboard/CreateConnectionModal.tsx`
- `src/lib/api/endpoints.ts`

**Acceptance Criteria:**
- [ ] Doc scraping option in connection form
- [ ] Parse HTML documentation
- [ ] Extract endpoint information
- [ ] AI-assisted endpoint identification
- [ ] Manual review interface
- [ ] Approval workflow for scraped endpoints

---

## Implementation Timeline

### Week 1-2: Phase 1
- [ ] Auto-discovery of OpenAPI specs
- [ ] Testing and validation

### Week 3-4: Phase 2 (Part 1)
- [ ] cURL/HAR import (quick win)
- [ ] Basic Postman import

### Week 5-6: Phase 2 (Part 2)
- [ ] Complete Postman import
- [ ] Insomnia import
- [ ] Testing and validation

### Week 7-8: Phase 3 (Part 1)
- [ ] Manual endpoint builder
- [ ] Basic GraphQL introspection

### Week 9-10: Phase 3 (Part 2)
- [ ] Complete GraphQL support
- [ ] Doc scraping (if needed)

## Success Metrics

### Phase 1 Success:
- 80% of common APIs auto-discover OpenAPI specs
- 50% reduction in manual spec entry

### Phase 2 Success:
- 90% of Postman collections import successfully
- 95% of cURL commands parse correctly
- 70% of HAR files extract meaningful endpoints

### Phase 3 Success:
- 60% of non-spec teams use manual endpoint builder
- 40% of GraphQL APIs successfully introspected
- 30% of documentation pages yield useful endpoints

## Technical Considerations

### Database Schema Updates
```sql
-- Add import source tracking
ALTER TABLE endpoints ADD COLUMN import_source VARCHAR(50);
ALTER TABLE endpoints ADD COLUMN import_metadata JSON;

-- Add collection import tracking
CREATE TABLE collection_imports (
  id VARCHAR(255) PRIMARY KEY,
  connection_id VARCHAR(255),
  import_type VARCHAR(50),
  original_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints to Add
```
POST /api/connections/{id}/import/curl
POST /api/connections/{id}/import/postman
POST /api/connections/{id}/import/insomnia
POST /api/connections/{id}/import/har
POST /api/connections/{id}/import/graphql
POST /api/connections/{id}/discover
```

### Error Handling
- Graceful fallback for failed imports
- Clear error messages for users
- Retry mechanisms for network failures
- Validation of imported data

### Performance Considerations
- Async processing for large collections
- Caching of parsed specifications
- Rate limiting for discovery requests
- Progress indicators for long operations

## Dependencies

### External Libraries
- `curl-parser` for cURL command parsing
- `har-validator` for HAR file validation
- `postman-collection` for Postman format
- `graphql` for GraphQL introspection
- `cheerio` for HTML parsing

### Internal Dependencies
- Enhanced error handling system
- Improved logging for import operations
- Extended testing framework for importers
- Updated API client for new endpoints

## Risk Mitigation

### Data Quality
- Validation of imported endpoints
- Manual review for complex imports
- Rollback capability for failed imports

### Security
- Sanitization of imported data
- Validation of external URLs
- Rate limiting for discovery requests

### Performance
- Async processing for large imports
- Caching of successful discoveries
- Progress indicators for long operations
- Timeout handling for network requests
