import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { logInfo, logError } from '../../../src/utils/logger';
import axios from 'axios';

interface TestConnectionRequest {
  apiName: string;
  authType: 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2' | 'BASIC_AUTH' | 'NONE';
  credentials: Record<string, string>;
}

interface TestConnectionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<TestConnectionResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req as AuthenticatedRequest, res);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { apiName, authType, credentials }: TestConnectionRequest = req.body;

    if (!apiName || !authType) {
      return res.status(400).json({ 
        success: false, 
        error: 'apiName and authType are required' 
      });
    }

    logInfo('Testing connection', { 
      apiName, 
      authType, 
      userId: user.id,
      hasCredentials: Object.keys(credentials).length > 0,
      credentials: credentials
    });

    // For testing purposes, we'll simulate different API responses based on the API name
    // In a real implementation, you would make actual API calls to test the connection
    
    let testResult: TestConnectionResponse;

    switch (apiName.toLowerCase()) {
      case 'slack':
        testResult = await testSlackConnection(credentials);
        break;
      case 'github':
        testResult = await testGitHubConnection(credentials);
        break;
      case 'stripe':
        testResult = await testStripeConnection(credentials);
        break;
      case 'openai':
        testResult = await testOpenAIConnection(credentials);
        break;
      default:
        // For unknown APIs, we'll do a basic validation
        testResult = await testGenericConnection(apiName, authType, credentials);
    }

    if (testResult.success) {
      logInfo('Connection test successful', { apiName, userId: user.id });
    } else {
      logError('Connection test failed', new Error(testResult.error || 'Unknown error'), { 
        apiName, 
        userId: user.id 
      });
    }

    return res.status(200).json(testResult);

  } catch (error) {
    logError('Connection test error', error as Error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

// Individual API test functions
async function testSlackConnection(credentials: Record<string, string>): Promise<TestConnectionResponse> {
  const { clientId, clientSecret } = credentials;
  
  if (!clientId || !clientSecret) {
    return { success: false, error: 'Client ID and Client Secret are required for Slack' };
  }

  // Simulate Slack OAuth2 validation
  if (clientId.length < 10 || clientSecret.length < 10) {
    return { success: false, error: 'Invalid Slack credentials format' };
  }

  return { success: true, message: 'Slack connection test successful' };
}

async function testGitHubConnection(credentials: Record<string, string>): Promise<TestConnectionResponse> {
  const { bearerToken } = credentials;
  
  if (!bearerToken) {
    return { success: false, error: 'Bearer token is required for GitHub' };
  }

  // Simulate GitHub API call
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'User-Agent': 'APIQ-Connection-Test'
      },
      timeout: 10000
    });

    if (response.status === 200) {
      return { success: true, message: 'GitHub connection test successful' };
    } else {
      return { success: false, error: 'GitHub API returned an error' };
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      return { success: false, error: 'Invalid GitHub token' };
    }
    return { success: false, error: 'GitHub API is not accessible' };
  }
}

async function testStripeConnection(credentials: Record<string, string>): Promise<TestConnectionResponse> {
  const { apiKey } = credentials;
  
  if (!apiKey) {
    return { success: false, error: 'API key is required for Stripe' };
  }

  // Simulate Stripe API call
  try {
    const response = await axios.get('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    if (response.status === 200) {
      return { success: true, message: 'Stripe connection test successful' };
    } else {
      return { success: false, error: 'Stripe API returned an error' };
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      return { success: false, error: 'Invalid Stripe API key' };
    }
    return { success: false, error: 'Stripe API is not accessible' };
  }
}

async function testOpenAIConnection(credentials: Record<string, string>): Promise<TestConnectionResponse> {
  const { apiKey } = credentials;
  
  if (!apiKey) {
    return { success: false, error: 'API key is required for OpenAI' };
  }

  // Simulate OpenAI API call
  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    if (response.status === 200) {
      return { success: true, message: 'OpenAI connection test successful' };
    } else {
      return { success: false, error: 'OpenAI API returned an error' };
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      return { success: false, error: 'Invalid OpenAI API key' };
    }
    return { success: false, error: 'OpenAI API is not accessible' };
  }
}

async function testGenericConnection(apiName: string, authType: string, credentials: Record<string, string>): Promise<TestConnectionResponse> {
  // Basic validation for unknown APIs
  const requiredFields = getRequiredFieldsForAuthType(authType);
  
  for (const field of requiredFields) {
    if (!credentials[field]) {
      return { 
        success: false, 
        error: `${field} is required for ${apiName} ${authType} authentication` 
      };
    }
  }

  // Basic format validation
  for (const [key, value] of Object.entries(credentials)) {
    if (value.length < 5) {
      return { 
        success: false, 
        error: `Invalid ${key} format for ${apiName}` 
      };
    }
  }

  return { success: true, message: `${apiName} connection test successful` };
}

function getRequiredFieldsForAuthType(authType: string): string[] {
  switch (authType) {
    case 'API_KEY':
      return ['apiKey'];
    case 'BEARER_TOKEN':
      return ['bearerToken'];
    case 'OAUTH2':
      return ['clientId', 'clientSecret'];
    case 'BASIC_AUTH':
      return ['username', 'password'];
    case 'NONE':
      return [];
    default:
      return ['apiKey'];
  }
}