import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { HybridMessageClassificationService } from '../../../src/lib/services/hybridMessageClassificationService';
import { NaturalLanguageWorkflowService } from '../../../src/lib/services/naturalLanguageWorkflowService';
import { ConnectionGuidanceService } from '../../../src/lib/services/connectionGuidanceService';
import { OpenAIService } from '../../../src/services/openaiService';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { prisma } from '../../../lib/database/client';

interface ProcessMessageResponse {
  success: boolean;
  data?: {
    type: 'workflow' | 'direct_api_call' | 'connection_guidance' | 'general_chat';
    content: string;
    workflow?: any;
    steps?: any[];
    apiCallResult?: any;
    connectionGuidance?: any;
    suggestedAction?: string;
  };
  error?: string;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ProcessMessageResponse>) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const user = await requireAuth(req, res);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user's API connections
    const connections = await prisma.apiConnection.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      },
      include: {
        endpoints: {
          where: { isActive: true }
        }
      }
    });

    // Create AI services
    const openaiService = OpenAIService.createFromEnv();
    const classificationService = new HybridMessageClassificationService(openaiService);
    const workflowService = new NaturalLanguageWorkflowService(process.env.OPENAI_API_KEY!);
    const connectionGuidanceService = new ConnectionGuidanceService();

    // Step 1: Classify the message
    console.log('🤖 AI Orchestrator: Classifying message');
    const classification = await classificationService.classifyMessage(message);
    console.log('🤖 AI Orchestrator: Classification result:', classification);

    // Step 2: Route to appropriate service based on AI classification
    if (classification.type === 'workflow') {
      console.log('🤖 AI Orchestrator: Processing as workflow request');
      
    // Check if connection guidance is needed first
    const connectionGuidance = await ConnectionGuidanceService.analyzeRequest(
      message,
      connections.map(conn => ({ name: conn.name, id: conn.id }))
    );

      if (connectionGuidance.requiresGuidance) {
        console.log('🤖 AI Orchestrator: Connection guidance needed');
        return res.status(200).json({
          success: true,
          data: {
            type: 'connection_guidance',
            content: connectionGuidance.guidanceMessage,
            connectionGuidance: connectionGuidance
          }
        });
      }

      // Generate workflow
      const workflowResult = await workflowService.generateWorkflow({
        userDescription: message,
        userId: user.id,
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
        context: '{}'
      });

      if (workflowResult.success) {
        return res.status(200).json({
          success: true,
          data: {
            type: 'workflow',
            content: workflowResult.workflow?.explanation || 'I\'ve created a workflow for you!',
            workflow: workflowResult.workflow,
            steps: workflowResult.workflow?.steps || []
          }
        });
      } else {
        throw new Error(workflowResult.error || 'Failed to generate workflow');
      }

    } else if (classification.type === 'direct_api_call') {
      console.log('🤖 AI Orchestrator: Processing as direct API call');
      
      // For now, return a message that direct API calls need to be implemented
      // This could be expanded to actually execute API calls
      return res.status(200).json({
        success: true,
        data: {
          type: 'general_chat',
          content: 'Direct API calls are not yet implemented. Please use workflow creation instead.'
        }
      });

    } else {
      console.log('🤖 AI Orchestrator: Processing as general chat');
      return res.status(200).json({
        success: true,
        data: {
          type: 'general_chat',
          content: "I'm here to help you with API automation and workflow creation. You can ask me to create workflows, execute API calls, or help you connect to different services."
        }
      });
    }

  } catch (error) {
    console.error('AI Orchestrator error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
}

export default errorHandler(handler);
