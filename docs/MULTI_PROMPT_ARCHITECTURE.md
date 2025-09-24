# Multi-Prompt Architecture Implementation

## Overview

This document describes the implementation of a multi-prompt architecture that replaces monolithic AI prompts with specialized, focused services. This architecture improves performance, maintainability, and testability while reducing complexity.

## Architecture Benefits

### Before (Monolithic)
- **Single large prompt** (55+ lines) handling multiple concerns
- **Difficult to test** individual components
- **Hard to maintain** and update specific functionality
- **Poor performance** due to large context
- **Tight coupling** between different concerns

### After (Multi-Prompt)
- **Specialized services** with focused prompts (15-25 lines)
- **Easy to test** each component independently
- **Simple to maintain** and update specific functionality
- **Better performance** with smaller, focused prompts
- **Loose coupling** with clear separation of concerns

## Implementation Areas

### 1. Direct API Calls
**Services Created:**
- `EndpointSelectionService` - Selects appropriate API endpoints
- `ResponseFormattingService` - Formats API responses
- `DirectApiCallOrchestrator` - Coordinates the services

**Files Modified:**
- `src/services/openaiService.ts` - Refactored to use orchestrator
- Removed legacy monolithic prompt methods

### 2. Workflow Creation
**Services Created:**
- `WorkflowPlanningService` - Analyzes user intent and plans workflow structure
- `StepGenerationService` - Generates individual workflow steps
- `ConnectionValidationService` - Validates and maps connection IDs
- `WorkflowOrchestrator` - Coordinates all workflow services

### 3. Connection Guidance
**Services Created:**
- `IntentAnalysisService` - Analyzes what user wants to accomplish
- `ApiRequirementService` - Determines which APIs are needed
- `GuidanceGenerationService` - Generates setup instructions
- `EnhancedConnectionGuidanceOrchestrator` - Coordinates guidance services

## Service Architecture

### Core Pattern
Each specialized service follows this pattern:

```typescript
export class SpecializedService {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  async processRequest(request: RequestType): Promise<ResultType> {
    try {
      // Try AI-powered processing first
      const aiResult = await this.processWithAI(request);
      if (aiResult.success) {
        return aiResult;
      }

      // Fallback to rules-based processing
      return this.processWithRules(request);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

### Key Features
- **AI + Rules-based fallbacks** for reliability
- **Comprehensive error handling** and logging
- **Type-safe interfaces** for all requests and responses
- **Consistent patterns** across all services

## Testing Strategy

### Unit Tests
- **78 unit tests** covering all services
- **AI + Rules-based fallback testing**
- **Error handling and edge cases**
- **Mock services** for isolated testing

### Test Coverage
- ✅ **Workflow Planning Service** - 9 tests
- ✅ **Step Generation Service** - 10 tests  
- ✅ **Connection Validation Service** - 10 tests
- ✅ **Workflow Orchestrator** - 8 tests
- ✅ **Intent Analysis Service** - 11 tests
- ✅ **API Requirement Service** - 11 tests
- ✅ **Guidance Generation Service** - 11 tests
- ✅ **Enhanced Connection Guidance Orchestrator** - 8 tests

## Performance Improvements

### Prompt Size Reduction
| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| **Direct API Calls** | 55+ lines | 15-25 lines | 🚀 **73% reduction** |
| **Workflow Planning** | 55+ lines | 15 lines | 🚀 **73% reduction** |
| **Step Generation** | 55+ lines | 20 lines | 🚀 **64% reduction** |
| **Connection Validation** | 55+ lines | 18 lines | 🚀 **67% reduction** |
| **Intent Analysis** | 55+ lines | 15 lines | 🚀 **73% reduction** |
| **API Requirements** | 55+ lines | 20 lines | 🚀 **64% reduction** |
| **Guidance Generation** | 55+ lines | 18 lines | 🚀 **67% reduction** |

### Benefits Achieved
- **🚀 Performance**: Smaller, focused prompts
- **🧪 Testability**: Each service tested independently
- **♻️ Reusability**: Services can be reused across different flows
- **🔧 Maintainability**: Easy to update specific functionality
- **🐛 Debugging**: Clear separation of concerns

## File Structure

```
src/lib/services/
├── directApiCallOrchestrator.ts          # Coordinates direct API call services
├── endpointSelectionService.ts           # Selects appropriate API endpoints
├── responseFormattingService.ts         # Formats API responses
├── workflowOrchestrator.ts              # Coordinates workflow services
├── workflowPlanningService.ts           # Analyzes user intent and plans workflows
├── stepGenerationService.ts              # Generates individual workflow steps
├── connectionValidationService.ts        # Validates and maps connection IDs
├── enhancedConnectionGuidanceOrchestrator.ts # Coordinates guidance services
├── intentAnalysisService.ts             # Analyzes what user wants to accomplish
├── apiRequirementService.ts             # Determines which APIs are needed
└── guidanceGenerationService.ts         # Generates setup instructions

tests/unit/services/
├── directApiCallOrchestrator.test.ts
├── endpointSelectionService.test.ts
├── responseFormattingService.test.ts
├── workflowOrchestrator.test.ts
├── workflowPlanningService.test.ts
├── stepGenerationService.test.ts
├── connectionValidationService.test.ts
├── enhancedConnectionGuidanceOrchestrator.test.ts
├── intentAnalysisService.test.ts
├── apiRequirementService.test.ts
└── guidanceGenerationService.test.ts
```

## Integration Points

### Direct API Calls
- **Entry Point**: `OpenAIService.executeDirectApiCall()`
- **Orchestrator**: `DirectApiCallOrchestrator`
- **Services**: `EndpointSelectionService`, `ResponseFormattingService`

### Workflow Creation
- **Entry Point**: `NaturalLanguageWorkflowService` (pending integration)
- **Orchestrator**: `WorkflowOrchestrator`
- **Services**: `WorkflowPlanningService`, `StepGenerationService`, `ConnectionValidationService`

### Connection Guidance
- **Entry Point**: `ConnectionGuidanceOrchestrator` (pending integration)
- **Orchestrator**: `EnhancedConnectionGuidanceOrchestrator`
- **Services**: `IntentAnalysisService`, `ApiRequirementService`, `GuidanceGenerationService`

## Next Steps

### Pending Integrations
1. **Refactor `NaturalLanguageWorkflowService`** to use `WorkflowOrchestrator`
2. **Refactor `ConnectionGuidanceOrchestrator`** to use `EnhancedConnectionGuidanceOrchestrator`
3. **Test both implementations** with existing E2E tests

### Future Enhancements
- **Message Classification** multi-prompt refactoring
- **Error Handling** multi-prompt refactoring
- **Additional specialized services** as needed

## Usage Examples

### Direct API Call
```typescript
const orchestrator = new DirectApiCallOrchestrator(openaiService);
const result = await orchestrator.executeDirectApiCall({
  userMessage: "Get all users from my database",
  availableConnections: connections,
  userId: "user123"
});
```

### Workflow Creation
```typescript
const orchestrator = new WorkflowOrchestrator(openaiService);
const result = await orchestrator.generateWorkflow({
  userDescription: "When a new GitHub issue is created, send a Slack notification",
  userId: "user123",
  availableConnections: connections
});
```

### Connection Guidance
```typescript
const orchestrator = new EnhancedConnectionGuidanceOrchestrator(openaiService);
const result = await orchestrator.processMessage({
  message: "I want to send notifications to my team",
  availableConnections: connections,
  userId: "user123"
});
```

## Conclusion

The multi-prompt architecture provides significant improvements in:
- **Performance** through smaller, focused prompts
- **Maintainability** through specialized services
- **Testability** through isolated components
- **Reliability** through AI + rules-based fallbacks

This architecture sets the foundation for scalable, maintainable AI-powered features in the APIQ platform.
