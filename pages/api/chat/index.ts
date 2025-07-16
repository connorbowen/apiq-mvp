import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { logError, logInfo } from '../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { OpenAIService } from '../../../src/services/openaiService';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);
    const userId = user.id;

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    return await handleChatRequest(req, res, userId);
  } catch (error) {
    logError('Chat API error', error as Error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function handleChatRequest(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Get user's API connections
    const apiConnections = await prisma.apiConnection.findMany({
      where: { userId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        description: true,
        baseUrl: true,
        authType: true
      }
    }) as any[];

    if (apiConnections.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No active API connections found. Please add some API connections first.' 
      });
    }

    logInfo('Chat request received', { 
      userId, 
      messageLength: message.length,
      apiConnectionsCount: apiConnections.length 
    });

    try {
      // Create OpenAI service instance
      const openaiService = await OpenAIService.create(userId);
      
      // Generate workflow using OpenAI
      const workflowResponse = await openaiService.generateWorkflow({
        description: message,
        apiConnections,
        parameters: context.parameters || {}
      });

      logInfo('Workflow generated successfully', { 
        userId, 
        workflowName: workflowResponse.workflow.name,
        stepsCount: workflowResponse.steps.length 
      });

      return res.status(200).json({
        success: true,
        data: {
          workflow: workflowResponse.workflow,
          steps: workflowResponse.steps,
          explanation: workflowResponse.explanation,
          confidence: 0.95, // Placeholder confidence score
          availableApis: apiConnections.map((conn: any) => ({
            id: conn.id,
            name: conn.name
          }))
        },
        message: 'Workflow generated successfully'
      });
    } catch (aiError) {
      logError('AI workflow generation failed', aiError as Error);
      
      // Return a helpful error message
      return res.status(500).json({
        success: false,
        error: 'Failed to generate workflow. Please try rephrasing your request or check your API connections.',
        details: aiError instanceof Error ? aiError.message : 'Unknown AI error'
      });
    }
  } catch (error) {
    logError('Failed to handle chat request', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to process chat request' });
  }
}

export default errorHandler(handler); 