/**
 * Usage Tracking Service
 * 
 * Handles tracking of user usage against plan limits for the SaaS freemium billing system.
 * Tracks API connections, workflow executions, and direct API calls.
 */

import { PrismaClient } from '../../generated/prisma';
import { PlanType, UsageType, PlanStatus } from '../../generated/prisma';

const prisma = new PrismaClient();

export interface UsageLimits {
  apiConnections: { used: number; limit: number };
  workflowExecutions: { used: number; limit: number };
  directApiCalls: { used: number; limit: number };
  totalExecutions: { used: number; limit: number };
}

export interface UsageSummary {
  planType: PlanType;
  limits: UsageLimits;
  current: {
    apiConnections: number;
    workflowExecutions: number;
    directApiCalls: number;
    totalExecutions: number;
  };
  remaining: {
    apiConnections: number;
    workflowExecutions: number;
    directApiCalls: number;
    totalExecutions: number;
  };
  resetDate: Date;
}

export class UsageTrackingService {
  /**
   * Get current usage summary for a user
   */
  async getUserUsageSummary(userId: string): Promise<UsageSummary> {
    const userPlan = await prisma.userPlan.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });

    if (!userPlan) {
      throw new Error('User plan not found');
    }

    const limits: UsageLimits = {
      apiConnections: {
        used: userPlan.currentConnections,
        limit: userPlan.apiConnectionsLimit
      },
      workflowExecutions: {
        used: userPlan.currentWorkflowExecutions,
        limit: userPlan.workflowExecutionsLimit
      },
      directApiCalls: {
        used: userPlan.currentDirectApiCalls,
        limit: userPlan.directApiCallsLimit
      },
      totalExecutions: {
        used: userPlan.currentTotalExecutions,
        limit: userPlan.totalExecutionsLimit
      }
    };

    const current = {
      apiConnections: userPlan.currentConnections,
      workflowExecutions: userPlan.currentWorkflowExecutions,
      directApiCalls: userPlan.currentDirectApiCalls,
      totalExecutions: userPlan.currentTotalExecutions
    };

    const remaining = {
      apiConnections: Math.max(0, userPlan.apiConnectionsLimit - userPlan.currentConnections),
      workflowExecutions: Math.max(0, userPlan.workflowExecutionsLimit - userPlan.currentWorkflowExecutions),
      directApiCalls: Math.max(0, userPlan.directApiCallsLimit - userPlan.currentDirectApiCalls),
      totalExecutions: Math.max(0, userPlan.totalExecutionsLimit - userPlan.currentTotalExecutions)
    };

    // Calculate reset date (next month)
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);

    return {
      planType: userPlan.planType,
      limits,
      current,
      remaining,
      resetDate
    };
  }

  /**
   * Check if user can perform an action based on their plan limits
   */
  async canPerformAction(
    userId: string, 
    actionType: 'api_connection' | 'workflow_execution' | 'direct_api_call'
  ): Promise<{ allowed: boolean; reason?: string }> {
    const userPlan = await prisma.userPlan.findUnique({
      where: { userId }
    });

    if (!userPlan) {
      return { allowed: false, reason: 'User plan not found' };
    }

    if (userPlan.status !== PlanStatus.ACTIVE) {
      return { allowed: false, reason: 'Plan is not active' };
    }

    // Check specific limits
    switch (actionType) {
      case 'api_connection':
        if (userPlan.currentConnections >= userPlan.apiConnectionsLimit) {
          return { 
            allowed: false, 
            reason: `API connection limit reached (${userPlan.currentConnections}/${userPlan.apiConnectionsLimit})` 
          };
        }
        break;

      case 'workflow_execution':
        if (userPlan.currentWorkflowExecutions >= userPlan.workflowExecutionsLimit) {
          return { 
            allowed: false, 
            reason: `Workflow execution limit reached (${userPlan.currentWorkflowExecutions}/${userPlan.workflowExecutionsLimit})` 
          };
        }
        break;

      case 'direct_api_call':
        if (userPlan.currentDirectApiCalls >= userPlan.directApiCallsLimit) {
          return { 
            allowed: false, 
            reason: `Direct API call limit reached (${userPlan.currentDirectApiCalls}/${userPlan.directApiCallsLimit})` 
          };
        }
        break;
    }

    // Check total execution limit for workflow and direct API calls
    if (actionType === 'workflow_execution' || actionType === 'direct_api_call') {
      if (userPlan.currentTotalExecutions >= userPlan.totalExecutionsLimit) {
        return { 
          allowed: false, 
          reason: `Total execution limit reached (${userPlan.currentTotalExecutions}/${userPlan.totalExecutionsLimit})` 
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Track usage for a specific action
   */
  async trackUsage(
    userId: string,
    usageType: UsageType,
    resourceId?: string,
    resourceType?: string,
    metadata?: any
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Create usage record
      await tx.usageRecord.create({
        data: {
          userId,
          usageType,
          resourceId,
          resourceType,
          metadata
        }
      });

      // Update user plan usage counters
      const updateData: any = {};
      
      switch (usageType) {
        case UsageType.API_CONNECTION:
          updateData.currentConnections = { increment: 1 };
          break;
        case UsageType.WORKFLOW_EXECUTION:
          updateData.currentWorkflowExecutions = { increment: 1 };
          updateData.currentTotalExecutions = { increment: 1 };
          break;
        case UsageType.DIRECT_API_CALL:
          updateData.currentDirectApiCalls = { increment: 1 };
          updateData.currentTotalExecutions = { increment: 1 };
          break;
      }

      await tx.userPlan.update({
        where: { userId },
        data: updateData
      });

      // Update monthly usage summary
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      await tx.usageSummary.upsert({
        where: {
          userId_year_month: {
            userId,
            year,
            month
          }
        },
        update: {
          [usageType === UsageType.API_CONNECTION ? 'apiConnections' : 
           usageType === UsageType.WORKFLOW_EXECUTION ? 'workflowExecutions' : 'directApiCalls']: {
            increment: 1
          },
          totalExecutions: usageType === UsageType.API_CONNECTION ? undefined : { increment: 1 }
        },
        create: {
          userId,
          year,
          month,
          planType: (await tx.userPlan.findUnique({ where: { userId } }))!.planType,
          apiConnections: usageType === UsageType.API_CONNECTION ? 1 : 0,
          workflowExecutions: usageType === UsageType.WORKFLOW_EXECUTION ? 1 : 0,
          directApiCalls: usageType === UsageType.DIRECT_API_CALL ? 1 : 0,
          totalExecutions: usageType === UsageType.API_CONNECTION ? 0 : 1,
          apiConnectionsLimit: (await tx.userPlan.findUnique({ where: { userId } }))!.apiConnectionsLimit,
          workflowExecutionsLimit: (await tx.userPlan.findUnique({ where: { userId } }))!.workflowExecutionsLimit,
          directApiCallsLimit: (await tx.userPlan.findUnique({ where: { userId } }))!.directApiCallsLimit,
          totalExecutionsLimit: (await tx.userPlan.findUnique({ where: { userId } }))!.totalExecutionsLimit
        }
      });
    });
  }

  /**
   * Create or update user plan for a user
   */
  async createOrUpdateUserPlan(
    userId: string,
    planType: PlanType = PlanType.FREE,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<void> {
    const planLimits = await prisma.planLimits.findUnique({
      where: { planType }
    });

    if (!planLimits) {
      throw new Error(`Plan limits not found for plan type: ${planType}`);
    }

    await prisma.userPlan.upsert({
      where: { userId },
      update: {
        planType,
        status: PlanStatus.ACTIVE,
        apiConnectionsLimit: planLimits.apiConnectionsLimit,
        workflowExecutionsLimit: planLimits.workflowExecutionsLimit,
        directApiCallsLimit: planLimits.directApiCallsLimit,
        totalExecutionsLimit: planLimits.totalExecutionsLimit,
        stripeCustomerId,
        stripeSubscriptionId
      },
      create: {
        userId,
        planType,
        status: PlanStatus.ACTIVE,
        apiConnectionsLimit: planLimits.apiConnectionsLimit,
        workflowExecutionsLimit: planLimits.workflowExecutionsLimit,
        directApiCallsLimit: planLimits.directApiCallsLimit,
        totalExecutionsLimit: planLimits.totalExecutionsLimit,
        stripeCustomerId,
        stripeSubscriptionId
      }
    });
  }

  /**
   * Reset monthly usage counters (called by cron job)
   */
  async resetMonthlyUsage(): Promise<void> {
    await prisma.userPlan.updateMany({
      data: {
        currentConnections: 0,
        currentWorkflowExecutions: 0,
        currentDirectApiCalls: 0,
        currentTotalExecutions: 0
      }
    });
  }

  /**
   * Get usage statistics for admin dashboard
   */
  async getUsageStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalConnections: number;
    totalExecutions: number;
    planDistribution: Record<PlanType, number>;
  }> {
    const [
      totalUsers,
      activeUsers,
      totalConnections,
      totalExecutions,
      planDistribution
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.apiConnection.count(),
      prisma.usageRecord.count({
        where: {
          usageType: { in: [UsageType.WORKFLOW_EXECUTION, UsageType.DIRECT_API_CALL] }
        }
      }),
      prisma.userPlan.groupBy({
        by: ['planType'],
        _count: { planType: true }
      })
    ]);

    const planDist = planDistribution.reduce((acc, item) => {
      acc[item.planType] = item._count.planType;
      return acc;
    }, {} as Record<PlanType, number>);

    return {
      totalUsers,
      activeUsers,
      totalConnections,
      totalExecutions,
      planDistribution: planDist
    };
  }
}

export const usageTrackingService = new UsageTrackingService();
