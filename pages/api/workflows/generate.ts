import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { prisma } from '../../../lib/database/client';
import { NaturalLanguageWorkflowService } from '../../../src/lib/services/naturalLanguageWorkflowService';
import { ConnectionGuidanceService } from '../../../src/lib/services/connectionGuidanceService';
import { EnhancedErrorHandler } from '../../../src/lib/services/enhancedErrorHandler';
import { OpenAIService } from '../../../src/services/openaiService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 WORKFLOW GENERATION API CALLED');
  console.log('→ Method:', req.method);
  console.log('→ Headers:', JSON.stringify(req.headers, null, 2));
  console.log('→ Body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Declare variables at function scope
  let userDescription: string;
  let context: any;

  try {
    console.log('→ Request body:', JSON.stringify(req.body, null, 2));
    
    // Authenticate user using custom JWT authentication
    console.log('→ Starting authentication...');
    const authenticatedReq = req as AuthenticatedRequest;
    console.log('→ Calling requireAuth...');
    const user = await requireAuth(authenticatedReq, res);
    console.log('→ requireAuth result:', user ? 'Success' : 'Failed');
    const userId = user.id;
    
    console.log('→ Authenticated user ID:', userId);

    const body = req.body;
    userDescription = body.userDescription;
    context = body.context;

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

    // Check if connection guidance is needed
    let connectionGuidance;
    try {
      console.log('→ Calling ConnectionGuidanceService.analyzeRequest with:', {
        userDescription,
        connections: connections.map(conn => ({ name: conn.name, id: conn.id }))
      });
      
      connectionGuidance = await ConnectionGuidanceService.analyzeRequest(
        userDescription,
        connections.map(conn => ({ name: conn.name, id: conn.id }))
      );

      console.log('→ Connection guidance result:', {
        requiresGuidance: connectionGuidance.requiresGuidance,
        missingApis: connectionGuidance.missingApis?.map(api => api.displayName) || [],
        guidanceMessage: connectionGuidance.guidanceMessage
      });

      if (connectionGuidance.requiresGuidance) {
        console.log('→ Connection guidance needed for:', connectionGuidance.missingApis.map(api => api.displayName));
        console.log('→ Returning connection guidance response');
        return res.status(200).json({
          success: true,
          data: {
            workflow: null,
            steps: [],
            explanation: connectionGuidance.guidanceMessage,
            connectionGuidance: connectionGuidance
          }
        });
      }
    } catch (error) {
      console.error('→ Connection guidance error:', error);
      return res.status(500).json({
        success: false,
        error: 'Connection guidance service error'
      });
    }

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
          parameters: Array.isArray(endpoint.parameters) ? endpoint.parameters : []
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
        explanation: result.workflow?.explanation || 'Workflow generated successfully'
      }
    });

  } catch (error) {
    console.log('🚀 ERROR IN API:', error);
    
    // Use enhanced error handling if possible
    try {
      const openaiService = OpenAIService.createFromEnv();
      const enhancedErrorHandler = new EnhancedErrorHandler(openaiService);
      
      const enhancedError = await enhancedErrorHandler.handleWorkflowError(
        error as Error,
        {
          workflowId: 'unknown'
        }
      );
      
      return res.status(500).json(enhancedError);
    } catch (enhanceError) {
      console.error('Enhanced error handling failed:', enhanceError);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}