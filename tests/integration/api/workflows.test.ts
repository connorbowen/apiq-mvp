import { createTestUser, cleanupTestUsers, createAuthenticatedRequest } from '../../helpers/testUtils';
import { prisma } from '../../../lib/database/client';
import type { TestUser } from '../../helpers/testUtils';
import workflowsHandler from '../../../pages/api/workflows';
import workflowHandler from '../../../pages/api/workflows/[id]';
import executeHandler from '../../../pages/api/workflows/[id]/execute';
import { createWorkflowTestData } from '../../helpers/createTestData';

describe('Workflow API Integration', () => {
  let createdUserIds: string[] = [];
  let createdWorkflowIds: string[] = [];
  let createdStepIds: string[] = [];
  let createdExecutionIds: string[] = [];
  let testUser: TestUser;
  let testWorkflow: any;

  afterEach(async () => {
    // Clean up in reverse dependency order
    await prisma.executionLog.deleteMany({
      where: { executionId: { in: createdExecutionIds } }
    });
    await prisma.workflowExecution.deleteMany({
      where: { id: { in: createdExecutionIds } }
    });
    await prisma.workflowStep.deleteMany({
      where: { id: { in: createdStepIds } }
    });
    await prisma.workflow.deleteMany({
      where: { id: { in: createdWorkflowIds } }
    });
    await cleanupTestUsers(createdUserIds);
    
    // Reset tracking arrays
    createdUserIds = [];
    createdWorkflowIds = [];
    createdStepIds = [];
    createdExecutionIds = [];
  });

  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createWorkflowTestData();
    testUser = testData.user;
    testWorkflow = testData.workflow;
  });

  it('should create a workflow', async () => {
    const { req, res } = createAuthenticatedRequest('POST', testUser, {
      body: { name: 'Test Workflow', description: 'A test workflow' },
    });
    
    await workflowsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test Workflow');
    createdWorkflowIds.push(data.data.id);
  });

  it('should not allow duplicate workflow names for the same user', async () => {
    const workflow = await prisma.workflow.create({ 
      data: { userId: testUser.id, name: 'Dup Workflow', status: 'DRAFT', isPublic: false } 
    });
    createdWorkflowIds.push(workflow.id);
    
    const { req, res } = createAuthenticatedRequest('POST', testUser, {
      body: { name: 'Dup Workflow' },
    });
    
    await workflowsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(409);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
  });

  it('should list workflows', async () => {
    const workflow = await prisma.workflow.create({ 
      data: { userId: testUser.id, name: 'List Workflow', status: 'DRAFT', isPublic: false } 
    });
    createdWorkflowIds.push(workflow.id);
    
    const { req, res } = createAuthenticatedRequest('GET', testUser);
    
    await workflowsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.workflows)).toBe(true);
    expect(data.data.workflows.length).toBeGreaterThan(0);
  });

  it('should get a workflow by ID', async () => {
    const workflow = await prisma.workflow.create({ 
      data: { userId: testUser.id, name: 'Get Workflow', status: 'DRAFT', isPublic: false } 
    });
    createdWorkflowIds.push(workflow.id);
    
    const { req, res } = createAuthenticatedRequest('GET', testUser, {
      query: { id: workflow.id },
    });
    
    await workflowHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(workflow.id);
  });

  it('should update a workflow', async () => {
    const workflow = await prisma.workflow.create({ 
      data: { userId: testUser.id, name: 'Update Workflow', status: 'DRAFT', isPublic: false } 
    });
    createdWorkflowIds.push(workflow.id);
    
    const { req, res } = createAuthenticatedRequest('PUT', testUser, {
      query: { id: workflow.id },
      body: { name: 'Updated Name', description: 'Updated desc', status: 'ACTIVE' },
    });
    
    await workflowHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Updated Name');
    expect(data.data.status).toBe('ACTIVE');
  });

  it('should not update to a duplicate name', async () => {
    const wf1 = await prisma.workflow.create({ 
      data: { userId: testUser.id, name: 'WF1', status: 'DRAFT', isPublic: false } 
    });
    const wf2 = await prisma.workflow.create({ 
      data: { userId: testUser.id, name: 'WF2', status: 'DRAFT', isPublic: false } 
    });
    createdWorkflowIds.push(wf1.id, wf2.id);
    
    const { req, res } = createAuthenticatedRequest('PUT', testUser, {
      query: { id: wf2.id },
      body: { name: 'WF1' },
    });
    
    await workflowHandler(req, res);
    
    expect(res._getStatusCode()).toBe(409);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
  });

  it('should delete a workflow', async () => {
    const workflow = await prisma.workflow.create({ 
      data: { userId: testUser.id, name: 'Delete Workflow', status: 'DRAFT', isPublic: false } 
    });
    createdWorkflowIds.push(workflow.id);
    
    const { req, res } = createAuthenticatedRequest('DELETE', testUser, {
      query: { id: workflow.id },
    });
    
    await workflowHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    const check = await prisma.workflow.findUnique({ where: { id: workflow.id } });
    expect(check).toBeNull();
  });

  it('should return 404 for non-existent workflow', async () => {
    const { req, res } = createAuthenticatedRequest('GET', testUser, {
      query: { id: 'nonexistent-id' },
    });
    
    await workflowHandler(req, res);
    
    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
  });

  describe('Workflow Execution', () => {
    it('should execute a workflow', async () => {
      const workflow = await prisma.workflow.create({ 
        data: { userId: testUser.id, name: 'Exec Workflow', status: 'ACTIVE', isPublic: false } 
      });
      createdWorkflowIds.push(workflow.id);
      
      // Add a dummy step so execution is allowed
      const step = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          stepOrder: 1,
          name: 'Step 1',
          action: 'noop',
          parameters: {},
          isActive: true,
        },
      });
      createdStepIds.push(step.id);
      
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        query: { id: workflow.id },
        body: { parameters: { foo: 'bar' } },
      });
      
      await executeHandler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('completed');
      expect(data.data.workflow.id).toBe(workflow.id);
      
      // Track the execution
      const executions = await prisma.workflowExecution.findMany({ where: { workflowId: workflow.id } });
      if (executions.length > 0) {
        createdExecutionIds.push(executions[0].id);
      }
    });

    it('should not execute a workflow with no steps', async () => {
      const workflow = await prisma.workflow.create({ 
        data: { userId: testUser.id, name: 'No Steps Workflow', status: 'ACTIVE', isPublic: false } 
      });
      createdWorkflowIds.push(workflow.id);
      
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        query: { id: workflow.id },
        body: {},
      });
      
      await executeHandler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/no steps/i);
    });

    it('should not execute a workflow that is not active', async () => {
      const workflow = await prisma.workflow.create({ 
        data: { userId: testUser.id, name: 'Draft Workflow', status: 'DRAFT', isPublic: false } 
      });
      createdWorkflowIds.push(workflow.id);
      
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        query: { id: workflow.id },
        body: {},
      });
      
      await executeHandler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/not active/i);
    });

    it('should return 404 for non-existent workflow execution', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        query: { id: 'nonexistent-id' },
        body: {},
      });
      
      await executeHandler(req, res);
      
      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });
  });

  describe('End-to-End Workflow Execution', () => {
    it('should execute a multi-step workflow and track state/logs', async () => {
      // Create workflow
      const workflow = await prisma.workflow.create({ 
        data: { userId: testUser.id, name: 'E2E Workflow', status: 'ACTIVE', isPublic: false } 
      });
      createdWorkflowIds.push(workflow.id);
      
      // Add steps: noop, data transform, condition
      const steps = await prisma.workflowStep.createMany({
        data: [
          {
            workflowId: workflow.id,
            stepOrder: 1,
            name: 'Noop Step',
            action: 'noop',
            parameters: {},
            isActive: true,
          },
          {
            workflowId: workflow.id,
            stepOrder: 2,
            name: 'Transform Step',
            action: 'transform',
            parameters: { operation: 'map', input: { foo: 1 }, output: { bar: 2 } },
            isActive: true,
          },
          {
            workflowId: workflow.id,
            stepOrder: 3,
            name: 'Condition Step',
            action: 'condition',
            parameters: { 
              condition: { field: 'param.test', operator: 'exists', value: null },
              trueStep: null, 
              falseStep: null 
            },
            isActive: true,
          },
        ],
      });
      
      // Get the created step IDs
      const createdSteps = await prisma.workflowStep.findMany({ where: { workflowId: workflow.id } });
      createdSteps.forEach(step => createdStepIds.push(step.id));
      
      // Execute workflow
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        query: { id: workflow.id },
        body: { parameters: { foo: 'bar' } },
      });
      await executeHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('completed');
      expect(data.data.workflow.id).toBe(workflow.id);
      
      // Track the execution
      const executions = await prisma.workflowExecution.findMany({ where: { workflowId: workflow.id } });
      if (executions.length > 0) {
        createdExecutionIds.push(executions[0].id);
      }
      
      // Check execution state
      expect(executions.length).toBe(1);
      const execution = executions[0];
      expect(execution.status).toBe('COMPLETED');
      expect(execution.completedSteps).toBe(3);
      expect(execution.failedSteps).toBe(0);
      
      // Check logs
      const logs = await prisma.executionLog.findMany({ where: { executionId: execution.id } });
      expect(logs.length).toBeGreaterThanOrEqual(3);
      
      // Check step results
      expect(execution.stepResults).toBeDefined();
      if (execution.stepResults) {
        expect(Object.keys(execution.stepResults).length).toBe(3);
      }
    });

    it('should retry a failed step and eventually succeed', async () => {
      // Create workflow
      const workflow = await prisma.workflow.create({ 
        data: { userId: testUser.id, name: 'Retry Workflow', status: 'ACTIVE', isPublic: false } 
      });
      createdWorkflowIds.push(workflow.id);
      
      // Add a step that will fail once, then succeed
      let failFirst = true;
      const step = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          stepOrder: 1,
          name: 'Flaky Step',
          action: 'noop',
          parameters: {},
          isActive: true,
        },
      });
      createdStepIds.push(step.id);
      
      // Create a custom step that will fail once, then succeed
      await prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          action: 'custom',
          parameters: { 
            action: 'flaky',
            failCount: 1,
            currentFailures: 0
          }
        }
      });
      
      // Execute workflow
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        query: { id: workflow.id },
        body: {},
      });
      await executeHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('completed');
      
      // Track the execution
      const executions = await prisma.workflowExecution.findMany({ where: { workflowId: workflow.id } });
      if (executions.length > 0) {
        createdExecutionIds.push(executions[0].id);
      }
      
      // Check execution state
      expect(executions.length).toBe(1);
      const execution = executions[0];
      expect(execution.status).toBe('COMPLETED');
      expect(execution.completedSteps).toBe(1);
      expect(execution.failedSteps).toBe(0);
      
      // Test completed successfully
    });
  });
}); 