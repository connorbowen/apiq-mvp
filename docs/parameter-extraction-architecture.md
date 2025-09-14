# Parameter Extraction Architecture

## Overview

Parameter extraction is now a **centralized, reusable service** that enhances API ingestion and provides intelligent parameter understanding across all features.

## Architecture Components

### 1. ParameterExtractionService (`src/lib/services/parameterExtractionService.ts`)

**Core service** that provides:
- Parameter schema extraction from OpenAPI specs
- Natural language mapping generation
- AI-powered parameter extraction from user input
- Parameter validation and examples
- Enhanced endpoint descriptions

### 2. Enhanced API Ingestion

**During API ingestion** (`src/lib/api/endpoints.ts`):
- Raw OpenAPI parameters are processed through `ParameterExtractionService`
- Enhanced parameter schemas are stored with natural language mappings
- Parameter examples and validation rules are extracted
- Natural language descriptions are generated

### 3. Reusable Across Features

**Used by**:
- **Direct API Calls (Chat)** - Intelligent parameter extraction from natural language
- **Workflow Generation** - Parameter understanding for workflow steps
- **API Explorer** - Enhanced parameter forms with examples
- **Any future API interaction feature**

## Key Benefits

### 1. **Centralized Intelligence**
- Single source of truth for parameter extraction logic
- Consistent behavior across all features
- Easy to maintain and enhance

### 2. **Enhanced API Ingestion**
- Parameters are processed and enhanced during ingestion
- Natural language mappings are pre-computed
- Examples and validation rules are extracted
- Better API documentation and user experience

### 3. **Reusable Service**
- Same parameter extraction logic for chat, workflows, and API explorer
- Consistent user experience across features
- Easy to add new features that need parameter understanding

### 4. **AI-Powered Extraction**
- Uses OpenAI to extract parameters from natural language
- Handles complex parameter scenarios
- Learns from parameter schemas and examples

## Implementation Details

### Parameter Schema Structure

```typescript
interface ParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  location: 'query' | 'path' | 'header' | 'body';
  examples?: string[];
  naturalLanguageMappings?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}
```

### Natural Language Mappings

The service automatically generates natural language mappings for common parameter patterns:

- `id` → ['id', 'identifier', 'key', 'primary key']
- `status` → ['status', 'state', 'condition']
- `name` → ['name', 'title', 'label']
- `email` → ['email', 'email address', 'e-mail']
- `date` → ['date', 'time', 'timestamp', 'created', 'updated']
- `limit` → ['limit', 'count', 'size', 'max', 'maximum']
- `offset` → ['offset', 'skip', 'page', 'start']
- `search` → ['search', 'query', 'filter', 'find']
- `sort` → ['sort', 'order', 'order by']
- `tags` → ['tags', 'categories', 'labels', 'keywords']

### AI-Powered Extraction

When users provide natural language input, the service:
1. Enhances the endpoint with parameter intelligence
2. Uses OpenAI to extract parameters from the message
3. Maps natural language terms to correct parameter names
4. Returns structured parameter values

## Usage Examples

### 1. API Ingestion Enhancement

```typescript
// During API ingestion
const enhancedParameters = ParameterExtractionService.extractParameterSchemas(operation);
// Stores enhanced parameters with natural language mappings
```

### 2. Chat Parameter Extraction

```typescript
// In chat service
const enhancedEndpoint = ParameterExtractionService.enhanceEndpoint(endpoint);
const parameters = await ParameterExtractionService.extractParametersFromNaturalLanguage(
  userMessage,
  enhancedEndpoint,
  openaiService
);
```

### 3. Workflow Generation

```typescript
// In workflow generation
const enhancedEndpoint = ParameterExtractionService.enhanceEndpoint(endpoint);
// Use enhanced parameters for workflow step generation
```

## Testing

### E2E Tests (`tests/e2e/api-operations/parameter-extraction.test.ts`)

Comprehensive tests covering:
- **API Ingestion Enhancement** - Parameters are enhanced during ingestion
- **Direct API Calls** - Parameter extraction in chat
- **Workflow Generation** - Parameter integration in workflows
- **API Explorer** - Enhanced parameters in UI
- **Consistency** - Same behavior across all features

### Test Coverage

- Parameter schema extraction and enhancement
- Natural language mapping generation
- AI-powered parameter extraction
- Cross-feature consistency
- Error handling and edge cases

## Migration Path

### Phase 1: Core Service ✅
- [x] Create `ParameterExtractionService`
- [x] Update API ingestion to use enhanced parameters
- [x] Create comprehensive E2E tests

### Phase 2: Feature Integration
- [ ] Update chat service to use centralized extraction
- [ ] Update workflow generation to use enhanced parameters
- [ ] Update API Explorer to show enhanced parameters

### Phase 3: UI Enhancements
- [ ] Show natural language descriptions in API Explorer
- [ ] Display parameter examples and validation
- [ ] Improve parameter input forms

## Future Enhancements

### 1. **Learning from Usage**
- Track successful parameter extractions
- Improve natural language mappings based on user behavior
- A/B test different extraction strategies

### 2. **Advanced Validation**
- Real-time parameter validation
- Smart suggestions based on context
- Parameter dependency handling

### 3. **Multi-language Support**
- Support for different languages in natural language input
- Localized parameter descriptions
- Cultural context for parameter names

### 4. **Integration with External APIs**
- Learn from other API documentation
- Share parameter intelligence across APIs
- Community-driven parameter mappings

## Conclusion

This architecture makes parameter extraction a **first-class capability** that enhances the entire API interaction experience. By centralizing this intelligence and making it reusable, we ensure consistent, intelligent behavior across all features while making it easy to maintain and enhance.

The result is a more intelligent, user-friendly API platform that understands natural language and makes API interactions more intuitive and powerful.
