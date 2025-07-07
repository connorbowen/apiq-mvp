import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import NaturalLanguageWorkflowService from '../../../src/lib/services/naturalLanguageWorkflowService';
import { prisma } from '../../../src/lib/singletons/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('=== API ENDPOINT DEBUG ===');
    console.log('→ Request body:', JSON.stringify(req.body, null, 2));
    
    // Authenticate user using custom JWT authentication
    const authenticatedReq = req as AuthenticatedRequest;
    const user = await requireAuth(authenticatedReq, res);
    const userId = user.id;
    
    console.log('→ Authenticated user ID:', userId);

    const { userDescription, context } = req.body;

    if (!userDescription || typeof userDescription !== 'string') {
      console.log('→ Validation failed: userDescription missing or invalid');
      return res.status(400).json({ 
        success: false, 
        error: 'userDescription is required and must be a string' 
      });
    }

    console.log('→ User description:', userDescription);

    // Get user's available API connections
    const connections = await prisma.apiConnection.findMany({
      where: {
        userId: userId,
        status: 'ACTIVE'
      },
      include: {
        endpoints: {
          where: {
            isActive: true
          },
          select: {
            path: true,
            method: true,
            summary: true,
            parameters: true
          }
        }
      }
    });

    console.log('→ Found connections:', connections.length);
    console.log('→ Connection details:', JSON.stringify(connections.map(c => ({
      name: c.name,
      endpoints: c.endpoints.length
    })), null, 2));

    if (connections.length === 0) {
      console.log('→ No active connections found');
      return res.status(400).json({
        success: false,
        error: 'No active API connections found. Please add at least one API connection before generating workflows.'
      });
    }

    // Initialize the natural language workflow service
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.log('→ OpenAI API key not configured');
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    console.log('→ OpenAI API key configured');

    const workflowService = new NaturalLanguageWorkflowService(openaiApiKey, prisma);

    // Prepare the request
    const request = {
      userDescription,
      userId: userId,
      availableConnections: connections.map(conn => ({
        id: conn.id,
        name: conn.name,
        baseUrl: conn.baseUrl,
        endpoints: conn.endpoints.map((endpoint: any) => ({
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
          parameters: endpoint.parameters || []
        }))
      })),
      context
    };

    console.log('→ Prepared request for service');
    console.log('→ Request structure:', JSON.stringify({
      userDescription: request.userDescription,
      connectionsCount: request.availableConnections.length,
      totalEndpoints: request.availableConnections.reduce((sum, conn) => sum + conn.endpoints.length, 0)
    }, null, 2));

    // Generate the workflow
    console.log('→ Calling workflow service...');
    const result = await workflowService.generateWorkflow(request);
    console.log('→ Service result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.log('→ Service returned failure');
      return res.status(400).json({
        success: false,
        error: result.error,
        alternatives: result.alternatives
      });
    }

    console.log('→ Service returned success');

    // Validate the generated workflow
    const validation = await workflowService.validateWorkflow(result.workflow!);

    // Return the result
    return res.status(200).json({
      success: true,
      data: {
        workflow: result.workflow,
        validation,
        alternatives: result.alternatives || []
      }
    });

  } catch (error) {
    console.error('=== API ENDPOINT ERROR ===');
    console.error('Workflow generation error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate workflow'
    });
  }
} 