import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../src/lib/auth/sso-providers';
import NaturalLanguageWorkflowService from '../../../src/lib/services/naturalLanguageWorkflowService';
import { prisma } from '../../../src/lib/singletons/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { userDescription, context } = req.body;

    if (!userDescription || typeof userDescription !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'userDescription is required and must be a string' 
      });
    }

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

    if (connections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active API connections found. Please add at least one API connection before generating workflows.'
      });
    }

    // Initialize the natural language workflow service
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

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

    // Generate the workflow
    const result = await workflowService.generateWorkflow(request);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        alternatives: result.alternatives
      });
    }

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
    console.error('Workflow generation error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate workflow'
    });
  }
} 