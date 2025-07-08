import { NextApiRequest, NextApiResponse } from 'next';
import { ApplicationError } from '../../../src/middleware/errorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Return test OAuth2 data
    res.status(200).json({
      success: true,
      data: {
        message: 'OAuth2 test endpoint working',
        providers: [
          {
            name: 'google',
            displayName: 'Google',
            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            scope: 'https://www.googleapis.com/auth/calendar',
            userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
          }
        ],
        count: 1
      }
    });

  } catch (error) {
    console.error('OAuth2 test error:', error);

    if (error instanceof ApplicationError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
} 