# Multi-Prompt Implementation Guide

## Overview

This guide provides detailed instructions for implementing and maintaining the multi-prompt architecture in the APIQ platform. It covers service creation, testing, integration, and best practices.

## Service Creation Pattern

### 1. Service Structure

Each specialized service follows this consistent pattern:

```typescript
/**
 * Service Name
 * 
 * Brief description of what this service does.
 * This service focuses specifically on [specific concern].
 * 
 * Features:
 * - AI-powered [specific functionality]
 * - Rules-based fallback for common patterns
 * - [Other key features]
 */

import { OpenAIService } from '../../services/openaiService';
import { logInfo, logError } from '../../utils/logger';

export interface ServiceRequest {
  // Request interface
}

export interface ServiceResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class ServiceName {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  async processRequest(request: ServiceRequest): Promise<ServiceResult> {
    logInfo('🔍 ServiceName: Starting processing', { /* context */ });

    try {
      // Try AI-powered processing first
      const aiResult = await this.processWithAI(request);
      if (aiResult.success) {
        logInfo('🔍 ServiceName: AI processing successful', { /* results */ });
        return aiResult;
      }

      // Fallback to rules-based processing
      logInfo('🔍 ServiceName: Falling back to rules-based processing');
      return this.processWithRules(request);

    } catch (error) {
      logError('🔍 ServiceName: Processing failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      };
    }
  }

  private async processWithAI(request: ServiceRequest): Promise<ServiceResult> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(request);

      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500
      });

      const result = JSON.parse(response);
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('🔍 ServiceName: AI processing failed:', error);
      return {
        success: false,
        error: 'AI processing failed'
      };
    }
  }

  private processWithRules(request: ServiceRequest): ServiceResult {
    // Rules-based fallback logic
    return {
      success: true,
      data: this.generateRulesBasedResult(request)
    };
  }

  private buildSystemPrompt(): string {
    return `You are an expert [domain] specialist. Your job is to [specific task].

[Detailed instructions and rules]

Respond with JSON in this format:
{
  "field1": "value1",
  "field2": "value2"
}`;
  }

  private buildUserPrompt(request: ServiceRequest): string {
    return `[User prompt with request details]`;
  }

  private generateRulesBasedResult(request: ServiceRequest): any {
    // Rules-based logic
    return {};
  }
}
```

### 2. Key Implementation Principles

#### AI + Rules-based Fallbacks
- **Always try AI first** for best results
- **Fallback to rules** when AI fails
- **Log all transitions** for debugging
- **Handle errors gracefully**

#### Consistent Logging
```typescript
logInfo('🔍 ServiceName: Starting processing', { context });
logInfo('🔍 ServiceName: AI processing successful', { results });
logInfo('🔍 ServiceName: Falling back to rules-based processing');
logError('🔍 ServiceName: Processing failed', error as Error);
```

#### Type Safety
- **Define clear interfaces** for all requests and responses
- **Use TypeScript strictly** for type safety
- **Validate inputs** and handle edge cases
- **Return consistent result structures**

## Testing Strategy

### 1. Unit Test Structure

Each service should have comprehensive unit tests:

```typescript
import { ServiceName } from '../../../src/lib/services/serviceName';
import { OpenAIService } from '../../../src/services/openaiService';

// Mock OpenAIService
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

describe('ServiceName', () => {
  let service: ServiceName;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    mockOpenAIService = {
      chatCompletion: jest.fn()
    } as any;

    service = new ServiceName(mockOpenAIService);
  });

  describe('processRequest', () => {
    it('should successfully process request using AI', async () => {
      // Test AI processing
    });

    it('should fallback to rules-based processing when AI fails', async () => {
      // Test fallback
    });

    it('should handle errors gracefully', async () => {
      // Test error handling
    });

    // Additional test cases...
  });
});
```

### 2. Test Coverage Requirements

- ✅ **AI processing success**
- ✅ **AI processing failure and fallback**
- ✅ **Rules-based processing**
- ✅ **Error handling**
- ✅ **Edge cases**
- ✅ **Input validation**
- ✅ **Output validation**

### 3. Mock Strategy

```typescript
// Mock OpenAIService
jest.mock('../../../src/services/openaiService');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

// Mock other services
jest.mock('../../../src/lib/services/otherService');
```

## Orchestrator Pattern

### 1. Orchestrator Structure

```typescript
export class ServiceOrchestrator {
  private openaiService: OpenAIService;
  private service1: Service1;
  private service2: Service2;
  private service3: Service3;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
    this.service1 = new Service1(openaiService);
    this.service2 = new Service2(openaiService);
    this.service3 = new Service3(openaiService);
  }

  async processRequest(request: OrchestratorRequest): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    logInfo('🔍 ServiceOrchestrator: Starting multi-prompt processing', {
      // context
    });

    try {
      // Step 1: First service
      const step1Result = await this.service1.processRequest(request);
      if (!step1Result.success) {
        return this.createErrorResponse(step1Result.error);
      }

      // Step 2: Second service
      const step2Result = await this.service2.processRequest(request, step1Result.data);
      if (!step2Result.success) {
        return this.createErrorResponse(step2Result.error);
      }

      // Step 3: Third service
      const step3Result = await this.service3.processRequest(request, step2Result.data);
      if (!step3Result.success) {
        return this.createErrorResponse(step3Result.error);
      }

      // Build final result
      const finalResult = this.buildFinalResult(step1Result.data, step2Result.data, step3Result.data);

      logInfo('🔍 ServiceOrchestrator: Multi-prompt processing completed successfully', {
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        data: finalResult,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logError('🔍 ServiceOrchestrator: Processing failed', error as Error);
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private createErrorResponse(error: string): OrchestratorResult {
    return {
      success: false,
      error,
      data: null
    };
  }
}
```

### 2. Orchestrator Testing

```typescript
describe('ServiceOrchestrator', () => {
  let orchestrator: ServiceOrchestrator;
  let mockOpenAIService: jest.Mocked<OpenAIService>;
  let mockService1: jest.Mocked<Service1>;
  let mockService2: jest.Mocked<Service2>;
  let mockService3: jest.Mocked<Service3>;

  beforeEach(() => {
    // Setup mocks
  });

  describe('processRequest', () => {
    it('should successfully process request using all services', async () => {
      // Mock all services to succeed
      // Test successful flow
    });

    it('should handle service failures gracefully', async () => {
      // Mock service failures
      // Test error handling
    });

    it('should track processing time', async () => {
      // Test timing
    });
  });
});
```

## Integration Guidelines

### 1. Service Integration

When integrating new services into existing flows:

1. **Maintain backward compatibility**
2. **Update entry points gradually**
3. **Test thoroughly with existing E2E tests**
4. **Monitor performance and reliability**

### 2. Legacy Code Migration

```typescript
// Before: Monolithic approach
async function processRequest(request: Request): Promise<Response> {
  const prompt = buildLargePrompt(request);
  const response = await openaiService.chatCompletion(prompt);
  return parseResponse(response);
}

// After: Multi-prompt approach
async function processRequest(request: Request): Promise<Response> {
  const orchestrator = new ServiceOrchestrator(openaiService);
  return await orchestrator.processRequest(request);
}
```

### 3. Error Handling

```typescript
try {
  const result = await orchestrator.processRequest(request);
  if (!result.success) {
    // Handle orchestrator-level errors
    return this.handleError(result.error);
  }
  return result.data;
} catch (error) {
  // Handle unexpected errors
  return this.handleUnexpectedError(error);
}
```

## Best Practices

### 1. Service Design

- **Single Responsibility**: Each service handles one specific concern
- **Focused Prompts**: Keep prompts small and focused (15-25 lines)
- **Consistent Interfaces**: Use consistent request/response patterns
- **Error Handling**: Always provide fallbacks and error handling

### 2. Testing

- **Comprehensive Coverage**: Test all code paths
- **Mock Dependencies**: Isolate services for testing
- **Edge Cases**: Test error conditions and edge cases
- **Performance**: Monitor processing times

### 3. Maintenance

- **Clear Documentation**: Document all services and their purposes
- **Consistent Patterns**: Follow established patterns for new services
- **Regular Testing**: Run tests frequently during development
- **Monitoring**: Log and monitor service performance

### 4. Performance

- **Prompt Optimization**: Keep prompts as small as possible
- **Caching**: Consider caching for frequently used data
- **Parallel Processing**: Use parallel processing where possible
- **Monitoring**: Track performance metrics

## Troubleshooting

### Common Issues

1. **AI Processing Failures**
   - Check prompt format and content
   - Verify JSON response parsing
   - Ensure proper error handling

2. **Rules-based Fallback Issues**
   - Test fallback logic thoroughly
   - Ensure fallback provides reasonable results
   - Log fallback usage for monitoring

3. **Integration Issues**
   - Verify service interfaces match
   - Check error propagation
   - Test with real data

4. **Performance Issues**
   - Monitor prompt sizes
   - Check processing times
   - Optimize prompts if needed

### Debugging

```typescript
// Add detailed logging
logInfo('🔍 ServiceName: Processing step', {
  step: 'ai_processing',
  input: request,
  timestamp: Date.now()
});

// Log AI responses
logInfo('🔍 ServiceName: AI response', {
  response: aiResponse,
  parsed: parsedResponse
});

// Log fallback usage
logInfo('🔍 ServiceName: Using rules-based fallback', {
  reason: 'ai_failed',
  fallbackResult: rulesResult
});
```

## Conclusion

The multi-prompt architecture provides a robust, maintainable foundation for AI-powered features. By following these guidelines, you can create reliable, testable services that improve performance and maintainability.

For questions or issues, refer to the existing service implementations as examples, or consult the team for guidance.
