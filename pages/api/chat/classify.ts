import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { HybridMessageClassificationService } from '../../../src/lib/services/hybridMessageClassificationService';
import { OpenAIService } from '../../../src/services/openaiService';
import { errorHandler } from '../../../src/middleware/errorHandler';

interface MessageClassificationResponse {
  success: boolean;
  data?: {
    type: 'workflow' | 'direct_api_call' | 'connection_guidance' | 'general_chat';
    confidence: number;
    reasoning: string;
    suggestedActions: string[];
    requiresApiConnections: boolean;
  };
  error?: string;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse<MessageClassificationResponse>) {
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

    // Create OpenAI service for AI-powered classification
    const openaiService = OpenAIService.createFromEnv();
    const classificationService = new HybridMessageClassificationService(openaiService);

    // Classify the message
    const classification = await classificationService.classifyMessage(message);

    return res.status(200).json({
      success: true,
      data: classification
    });

  } catch (error) {
    console.error('Message classification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to classify message'
    });
  }
}

export default errorHandler(handler);
