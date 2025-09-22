/**
 * Usage Enforcement Middleware
 * 
 * Middleware to enforce usage limits for API connections, workflow executions, and direct API calls
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { usageTrackingService } from '../services/usageTrackingService';
import { UsageType } from '../../generated/prisma';

export interface UsageEnforcementOptions {
  usageType: UsageType;
  resourceId?: string;
  resourceType?: string;
  metadata?: any;
}

export function withUsageEnforcement(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: UsageEnforcementOptions
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get user ID from session (assuming session is available)
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          timestamp: new Date()
        });
      }

      // Check if user can perform the action
      const actionType = options.usageType === UsageType.API_CONNECTION ? 'api_connection' :
                        options.usageType === UsageType.WORKFLOW_EXECUTION ? 'workflow_execution' : 'direct_api_call';
      
      const canPerform = await usageTrackingService.canPerformAction(userId, actionType);
      
      if (!canPerform.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Usage limit reached',
          details: canPerform.reason,
          code: 'USAGE_LIMIT_REACHED',
          timestamp: new Date()
        });
      }

      // Execute the original handler
      await handler(req, res);

      // Track usage after successful execution
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await usageTrackingService.trackUsage(
          userId,
          options.usageType,
          options.resourceId,
          options.resourceType,
          options.metadata
        );
      }

    } catch (error) {
      console.error('Usage enforcement error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  };
}

/**
 * Middleware specifically for API connection creation
 */
export function withApiConnectionEnforcement(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return withUsageEnforcement(handler, {
    usageType: UsageType.API_CONNECTION,
    resourceType: 'api_connection'
  });
}

/**
 * Middleware specifically for workflow execution
 */
export function withWorkflowExecutionEnforcement(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return withUsageEnforcement(handler, {
    usageType: UsageType.WORKFLOW_EXECUTION,
    resourceType: 'workflow_execution'
  });
}

/**
 * Middleware specifically for direct API calls
 */
export function withDirectApiCallEnforcement(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return withUsageEnforcement(handler, {
    usageType: UsageType.DIRECT_API_CALL,
    resourceType: 'direct_api_call'
  });
}
