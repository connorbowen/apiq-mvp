import { createTestUser, cleanupTestUser, createAuthenticatedRequest } from '../../helpers/testUtils';
import { prisma } from '../../../lib/database/client';
import type { TestUser } from '../../helpers/testUtils';
import workflowsHandler from '../../../pages/api/workflows';
import workflowHandler from '../../../pages/api/workflows/[id]';
import executeHandler from '../../../pages/api/workflows/[id]/execute';

describe('Workflow API Integration', () => {
  let user: TestUser;
  let workflowId: string;

  beforeAll(async () => {
    user = await createTestUser();
  });

  afterAll(async () => {
    await cleanupTestUser(user);
  });

  afterEach(async () => {
    // Clean up workflows for this user
    await prisma.workflow.deleteMany({ where: { userId: user.id } });
  });

  it('should create a workflow', async () => {
    const { req, res } = createAuthenticatedRequest('POST', user, {
      body: { name: 'Test Workflow', description: 'A test workflow' },
    });
    
    await workflowsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test Workflow');
    workflowId = data.data.id;
  });

  it('should not allow duplicate workflow names for the same user', async () => {
    await prisma.workflow.create({ data: { userId: user.id, name: 'Dup Workflow', status: 'DRAFT', isPublic: false } });
    const { req, res } = createAuthenticatedRequest('POST', user, {
      body: { name: 'Dup Workflow' },
    });
    
    await workflowsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(409);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
  });

  it('should list workflows', async () => {
    await prisma.workflow.create({ data: { userId: user.id, name: 'List Workflow', status: 'DRAFT', isPublic: false } });
    const { req, res } = createAuthenticatedRequest('GET', user);
    
    await workflowsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.workflows)).toBe(true);
    expect(data.data.workflows.length).toBeGreaterThan(0);
  });

  it('should get a workflow by ID', async () => {
    const wf = await prisma.workflow.create({ data: { userId: user.id, name: 'Get Workflow', status: 'DRAFT', isPublic: false } });
    const { req, res } = createAuthenticatedRequest('GET', user, {
      query: { id: wf.id },
    });
    
    await workflowHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(wf.id);
  });

  it('should update a workflow', async () => {
    const wf = await prisma.workflow.create({ data: { userId: user.id, name: 'Update Workflow', status: 'DRAFT', isPublic: false } });
    const { req, res } = createAuthenticatedRequest('PUT', user, {
      query: { id: wf.id },
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
    const wf1 = await prisma.workflow.create({ data: { userId: user.id, name: 'WF1', status: 'DRAFT', isPublic: false } });
    const wf2 = await prisma.workflow.create({ data: { userId: user.id, name: 'WF2', status: 'DRAFT', isPublic: false } });
    const { req, res } = createAuthenticatedRequest('PUT', user, {
      query: { id: wf2.id },
      body: { name: 'WF1' },
    });
    
    await workflowHandler(req, res);
    
    expect(res._getStatusCode()).toBe(409);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
  });

  it('should delete a workflow', async () => {
    const wf = await prisma.workflow.create({ data: { userId: user.id, name: 'Delete Workflow', status: 'DRAFT', isPublic: false } });
    const { req, res } = createAuthenticatedRequest('DELETE', user, {
      query: { id: wf.id },
    });
    
    await workflowHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    const check = await prisma.workflow.findUnique({ where: { id: wf.id } });
    expect(check).toBeNull();
  });

  it('should return 404 for non-existent workflow', async () => {
    const { req, res } = createAuthenticatedRequest('GET', user, {
      query: { id: 'nonexistent-id' },
    });
    
    await workflowHandler(req, res);
    
    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
  });

  describe('Workflow Execution', () => {
    let wfId: string;
    beforeEach(async () => {
      const wf = await prisma.workflow.create({ data: { userId: user.id, name: 'Exec Workflow', status: 'ACTIVE', isPublic: false } });
      wfId = wf.id;
      // Add a dummy step so execution is allowed
      await prisma.workflowStep.create({
        data: {
          workflowId: wfId,
          stepOrder: 1,
          name: 'Step 1',
          action: 'noop',
          parameters: {},
          isActive: true,
        },
      });
    });
    afterEach(async () => {
      await prisma.workflowExecution.deleteMany({ where: { workflowId: wfId } });
      await prisma.workflowStep.deleteMany({ where: { workflowId: wfId } });
      await prisma.workflow.deleteMany({ where: { id: wfId } });
    });
    it('should execute a workflow', async () => {
      const { req, res } = createAuthenticatedRequest('POST', user, {
        query: { id: wfId },
        body: { parameters: { foo: 'bar' } },
      });
      
      await executeHandler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('completed');
      expect(data.data.workflow.id).toBe(wfId);
    });
    it('should not execute a workflow with no steps', async () => {
      // Remove steps
      await prisma.workflowStep.deleteMany({ where: { workflowId: wfId } });
      const { req, res } = createAuthenticatedRequest('POST', user, {
        query: { id: wfId },
        body: {},
      });
      
      await executeHandler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/no steps/i);
    });
    it('should not execute a workflow that is not active', async () => {
      await prisma.workflow.update({ where: { id: wfId }, data: { status: 'DRAFT' } });
      const { req, res } = createAuthenticatedRequest('POST', user, {
        query: { id: wfId },
        body: {},
      });
      
      await executeHandler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/not active/i);
    });
    it('should return 404 for non-existent workflow execution', async () => {
      const { req, res } = createAuthenticatedRequest('POST', user, {
        query: { id: 'nonexistent-id' },
        body: {},
      });
      
      await executeHandler(req, res);
      
      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });
  });
}); 