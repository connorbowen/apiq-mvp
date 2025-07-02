import { stepRunner, ApiCallStepExecutor, DataTransformStepExecutor, ConditionStepExecutor, CustomStepExecutor } from '../../../../src/lib/workflow/stepRunner';
import { ExecutionContext } from '../../../../src/lib/workflow/stepRunner';

// Type for test steps
type TestStep = any;

// Mock the API client
jest.mock('../../../../src/lib/api/client', () => ({
  apiClient: {
    getConnection: jest.fn().mockResolvedValue({
      success: false,
      data: null
    })
  }
}));

// Mock the database
jest.mock('../../../../lib/database/client', () => ({
  prisma: {
    executionLog: {
      create: jest.fn()
    }
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('Step Runner Engine', () => {
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockExecutionContext = {
      executionId: 'test-execution-id',
      workflowId: 'test-workflow-id',
      userId: 'test-user-id',
      parameters: { testParam: 'testValue' },
      stepResults: {},
      globalVariables: {}
    };
  });

  describe('CustomStepExecutor', () => {
    let executor: CustomStepExecutor;

    beforeEach(() => {
      executor = new CustomStepExecutor();
    });

    it('should execute noop action successfully', async () => {
      const step = {
        id: 'step-1',
        name: 'Noop Step',
        action: 'noop',
        parameters: {}
      };

      const result = await executor.execute(step, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'No operation performed' });
      expect(result.duration).toBeGreaterThanOrEqual(0); // Duration can be 0 for very fast operations
      expect(result.retryCount).toBe(0);
    });

    it('should execute wait action successfully', async () => {
      const step = {
        id: 'step-1',
        name: 'Wait Step',
        action: 'wait',
        parameters: { waitTime: 100 }
      };

      const startTime = Date.now();
      const result = await executor.execute(step, mockExecutionContext);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'Waited for 100ms' });
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should execute log action successfully', async () => {
      const step = {
        id: 'step-1',
        name: 'Log Step',
        action: 'log',
        parameters: { message: 'Custom log message' }
      };

      const result = await executor.execute(step, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'Custom log message' });
    });

    it('should handle unknown action', async () => {
      const step = {
        id: 'step-1',
        name: 'Unknown Step',
        action: 'unknown',
        parameters: {}
      };

      const result = await executor.execute(step, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'Custom action: unknown' });
    });

    it('should validate step with action', () => {
      const validStep = { action: 'noop' };
      const invalidStep = { name: 'test' };

      expect(executor.validate(validStep)).toBe(true);
      expect(executor.validate(invalidStep)).toBe(false);
    });
  });

  describe('DataTransformStepExecutor', () => {
    let executor: DataTransformStepExecutor;

    beforeEach(() => {
      executor = new DataTransformStepExecutor();
    });

    it('should execute map operation successfully', async () => {
      const step = {
        id: 'step-1',
        name: 'Map Step',
        parameters: {
          operation: 'map',
          input: { data: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] },
          output: { userId: '{{id}}', userName: '{{name}}' }
        }
      };

      const result = await executor.execute(step, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        { userId: '1', userName: 'John' },
        { userId: '2', userName: 'Jane' }
      ]);
    });

    it('should execute filter operation successfully', async () => {
      const step = {
        id: 'step-1',
        name: 'Filter Step',
        parameters: {
          operation: 'filter',
          input: { data: [{ id: 1, active: true }, { id: 2, active: false }] },
          output: { condition: { field: 'active', operator: 'equals', value: true } }
        }
      };

      const result = await executor.execute(step, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, active: true }]);
    });

    it('should execute aggregate operation successfully', async () => {
      const step = {
        id: 'step-1',
        name: 'Aggregate Step',
        parameters: {
          operation: 'aggregate',
          input: { data: [{ value: 10 }, { value: 20 }, { value: 30 }] },
          output: { field: 'value', operation: 'sum' }
        }
      };

      const result = await executor.execute(step, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe(60);
    });

    it('should handle unsupported operation', async () => {
      const step = {
        id: 'step-1',
        name: 'Invalid Step',
        parameters: {
          operation: 'invalid',
          input: {},
          output: {}
        }
      };

      const result = await executor.execute(step, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported transform operation');
    });

    it('should validate step with required parameters', () => {
      const validStep = {
        parameters: {
          operation: 'map',
          input: {},
          output: {}
        }
      };
      const invalidStep = {
        parameters: {}
      };

      expect(executor.validate(validStep)).toBe(true);
      expect(executor.validate(invalidStep)).toBe(false);
    });
  });

  describe('ConditionStepExecutor', () => {
    let executor: ConditionStepExecutor;

    beforeEach(() => {
      executor = new ConditionStepExecutor();
    });

    it('should evaluate equals condition successfully', async () => {
      const step = {
        id: 'step-1',
        name: 'Condition Step',
        parameters: {
          condition: {
            field: 'param.testParam',
            operator: 'equals',
            value: 'testValue'
          },
          trueStep: 'step-2',
          falseStep: 'step-3'
        }
      };

      const result = await executor.execute(step, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data.condition).toBe(true);
      expect(result.data.nextStep).toBe('step-2');
    });

    it('should evaluate false condition', async () => {
      const step = {
        id: 'step-1',
        name: 'Condition Step',
        parameters: {
          condition: {
            field: 'param.testParam',
            operator: 'equals',
            value: 'wrongValue'
          },
          trueStep: 'step-2',
          falseStep: 'step-3'
        }
      };

      const result = await executor.execute(step, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data.condition).toBe(false);
      expect(result.data.nextStep).toBe('step-3');
    });

    it('should validate step with condition', () => {
      const validStep = {
        parameters: {
          condition: { field: 'test', operator: 'equals', value: 'test' }
        }
      };
      const invalidStep = {
        parameters: {}
      };

      expect(executor.validate(validStep)).toBe(true);
      expect(executor.validate(invalidStep)).toBe(false);
    });
  });

  describe('StepRunner', () => {
    it('should determine step type correctly', async () => {
      const customStep = { action: 'noop' };

      // Test step type determination through execution
      const customResult = await stepRunner.executeStep(customStep, mockExecutionContext);
      expect(customResult.success).toBe(true);
    }, 10000); // Increase timeout for this test

    it('should handle step execution errors gracefully', async () => {
      const invalidStep = {
        id: 'step-1',
        name: 'Invalid Step',
        action: 'invalid-action'
      };

      const result = await stepRunner.executeStep(invalidStep, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid step configuration for API_CALL');
    });

    it('should log step execution', async () => {
      const step = {
        id: 'step-1',
        name: 'Test Step',
        action: 'noop',
        stepOrder: 1
      };

      await stepRunner.executeStep(step, mockExecutionContext);

      // Verify that execution log was created
      const { prisma } = require('../../../../lib/database/client');
      expect(prisma.executionLog.create).toHaveBeenCalled();
    });
  });
}); 