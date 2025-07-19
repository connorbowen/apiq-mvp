import { NextApiRequest, NextApiResponse } from 'next';
import { emailService } from '../../../src/lib/services/emailService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    if (req.method === 'GET') {
      // Get current email service status
      const status = emailService.getStatus();
      
      return res.status(200).json({
        success: true,
        data: {
          ...status,
          message: status.isMockMode 
            ? 'Email service is in MOCK mode - no real emails will be sent'
            : 'Email service is in REAL mode - emails will be sent via Gmail'
        }
      });
    }

    if (req.method === 'POST') {
      const { action } = req.body;

      if (action === 'mock') {
        // Switch to mock mode
        process.env.DISABLE_EMAIL_SENDING = 'true';
        
        return res.status(200).json({
          success: true,
          data: {
            message: 'Switched to MOCK mode - no real emails will be sent',
            mode: 'mock'
          }
        });
      }

      if (action === 'real') {
        // Switch to real mode
        delete process.env.DISABLE_EMAIL_SENDING;
        
        return res.status(200).json({
          success: true,
          data: {
            message: 'Switched to REAL mode - emails will be sent via Gmail',
            mode: 'real'
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "mock" or "real"'
      });
    }
  } catch (error) {
    console.error('Email status API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
} 