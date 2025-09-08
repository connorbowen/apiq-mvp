import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { prisma } from '../../../lib/database/client';
import { NaturalLanguageWorkflowService } from '../../../src/lib/services/naturalLanguageWorkflowService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 WORKFLOW GENERATION API CALLED');
  console.log('→ Method:', req.method);
  console.log('→ Headers:', JSON.stringify(req.headers, null, 2));
  console.log('→ Body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('=== API ENDPOINT DEBUG ===');
    console.log('→ Request body:', JSON.stringify(req.body, null, 2));
    
    // Authenticate user using custom JWT authentication
    console.log('→ Starting authentication...');
    const authenticatedReq = req as AuthenticatedRequest;
    console.log('→ Calling requireAuth...');
    const user = await requireAuth(authenticatedReq, res);
    console.log('→ requireAuth result:', user ? 'Success' : 'Failed');
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
          }
        }
      }
    });

    console.log('→ User ID for workflow generation:', userId);
    console.log('→ Found connections:', connections.length);
    console.log('→ Connection details:', JSON.stringify(connections.map(c => ({
      id: c.id,
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
      console.log('→ OpenAI API key not found');
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }
    
    const workflowService = new NaturalLanguageWorkflowService(openaiApiKey);
    
    console.log('→ Available connections for workflow generation:', JSON.stringify(connections.map(conn => ({ id: conn.id, name: conn.name, baseUrl: conn.baseUrl })), null, 2));
    console.log('→ Calling workflow service...');
    const result = await workflowService.generateWorkflow({
      userDescription,
      userId,
      availableConnections: connections.map(conn => ({
        id: conn.id,
        name: conn.name,
        baseUrl: conn.baseUrl,
        endpoints: conn.endpoints.map(endpoint => ({
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary || '',
          parameters: endpoint.parameters || []
        }))
      })),
      context
    });
    console.log('→ Workflow service result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.log('→ Workflow generation failed:', result.error);
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to generate workflow'
      });
    }

    console.log('→ Workflow generation successful');
    return res.status(200).json({
      success: true,
      data: {
        workflow: result.workflow,
        steps: result.workflow?.steps || [],
        explanation: result.explanation
      }
    });

  } catch (error) {
    console.log('🚀 ERROR IN API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}