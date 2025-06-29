import { Role } from '../../../src/generated/prisma';
import { prisma } from '../../../lib/database/client';

export interface UserContext {
  userId: string;
  role: Role;
  email?: string;
}

/**
 * Check if user has required role for operation
 */
export const hasRole = (userRole: Role, requiredRole: Role): boolean => {
  const roleHierarchy = {
    USER: 1,
    ADMIN: 2,
    SUPER_ADMIN: 3
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Check if user can perform admin operations
 */
export const canPerformAdminOperation = (userRole: Role): boolean => {
  return hasRole(userRole, Role.ADMIN);
};

/**
 * Check if user can perform super admin operations
 */
export const canPerformSuperAdminOperation = (userRole: Role): boolean => {
  return hasRole(userRole, Role.SUPER_ADMIN);
};

/**
 * Validate user permissions for endpoint deletion
 */
export const canDeleteEndpoints = (userRole: Role): boolean => {
  return canPerformAdminOperation(userRole);
};

/**
 * Validate user permissions for API connection management
 */
export const canManageApiConnections = (userRole: Role): boolean => {
  return hasRole(userRole, Role.USER); // Basic users can manage their own connections
};

/**
 * Validate user permissions for system-wide operations
 */
export const canPerformSystemOperations = (userRole: Role): boolean => {
  return canPerformAdminOperation(userRole);
};

/**
 * Get user context from database
 */
export const getUserContext = async (userId: string): Promise<UserContext | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      userId: user.id,
      role: user.role,
      email: user.email
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}; 