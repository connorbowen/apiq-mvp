import { 
  hasRole, 
  canPerformAdminOperation, 
  canPerformSuperAdminOperation,
  canDeleteEndpoints,
  canManageApiConnections,
  canPerformSystemOperations,
  getUserContext,
  UserContext
} from '../../../../src/lib/auth/rbac';
import { Role } from '../../../../src/generated/prisma';
import { prisma } from '../../../../lib/database/client';

// Mock Prisma client
jest.mock('../../../../lib/database/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  }
}));

describe('RBAC (Role-Based Access Control)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasRole', () => {
    it('should return true when user role is higher than required role', () => {
      expect(hasRole(Role.SUPER_ADMIN, Role.USER)).toBe(true);
      expect(hasRole(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true);
      expect(hasRole(Role.ADMIN, Role.USER)).toBe(true);
    });

    it('should return true when user role equals required role', () => {
      expect(hasRole(Role.USER, Role.USER)).toBe(true);
      expect(hasRole(Role.ADMIN, Role.ADMIN)).toBe(true);
      expect(hasRole(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(true);
    });

    it('should return false when user role is lower than required role', () => {
      expect(hasRole(Role.USER, Role.ADMIN)).toBe(false);
      expect(hasRole(Role.USER, Role.SUPER_ADMIN)).toBe(false);
      expect(hasRole(Role.ADMIN, Role.SUPER_ADMIN)).toBe(false);
    });

    it('should handle all role combinations correctly', () => {
      // USER role tests
      expect(hasRole(Role.USER, Role.USER)).toBe(true);
      expect(hasRole(Role.USER, Role.ADMIN)).toBe(false);
      expect(hasRole(Role.USER, Role.SUPER_ADMIN)).toBe(false);

      // ADMIN role tests
      expect(hasRole(Role.ADMIN, Role.USER)).toBe(true);
      expect(hasRole(Role.ADMIN, Role.ADMIN)).toBe(true);
      expect(hasRole(Role.ADMIN, Role.SUPER_ADMIN)).toBe(false);

      // SUPER_ADMIN role tests
      expect(hasRole(Role.SUPER_ADMIN, Role.USER)).toBe(true);
      expect(hasRole(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true);
      expect(hasRole(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(true);
    });
  });

  describe('canPerformAdminOperation', () => {
    it('should return true for ADMIN and SUPER_ADMIN roles', () => {
      expect(canPerformAdminOperation(Role.ADMIN)).toBe(true);
      expect(canPerformAdminOperation(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should return false for USER role', () => {
      expect(canPerformAdminOperation(Role.USER)).toBe(false);
    });
  });

  describe('canPerformSuperAdminOperation', () => {
    it('should return true only for SUPER_ADMIN role', () => {
      expect(canPerformSuperAdminOperation(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should return false for USER and ADMIN roles', () => {
      expect(canPerformSuperAdminOperation(Role.USER)).toBe(false);
      expect(canPerformSuperAdminOperation(Role.ADMIN)).toBe(false);
    });
  });

  describe('canDeleteEndpoints', () => {
    it('should return true for ADMIN and SUPER_ADMIN roles', () => {
      expect(canDeleteEndpoints(Role.ADMIN)).toBe(true);
      expect(canDeleteEndpoints(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should return false for USER role', () => {
      expect(canDeleteEndpoints(Role.USER)).toBe(false);
    });
  });

  describe('canManageApiConnections', () => {
    it('should return true for all roles (basic users can manage their own connections)', () => {
      expect(canManageApiConnections(Role.USER)).toBe(true);
      expect(canManageApiConnections(Role.ADMIN)).toBe(true);
      expect(canManageApiConnections(Role.SUPER_ADMIN)).toBe(true);
    });
  });

  describe('canPerformSystemOperations', () => {
    it('should return true for ADMIN and SUPER_ADMIN roles', () => {
      expect(canPerformSystemOperations(Role.ADMIN)).toBe(true);
      expect(canPerformSystemOperations(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should return false for USER role', () => {
      expect(canPerformSystemOperations(Role.USER)).toBe(false);
    });
  });

  describe('getUserContext', () => {
    const mockUserId = 'test-user-id';

    it('should return user context for active user', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        role: Role.ADMIN,
        isActive: true
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserContext(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        role: Role.ADMIN,
        email: 'test@example.com'
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      });
    });

    it('should return null for inactive user', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        role: Role.USER,
        isActive: false
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserContext(mockUserId);

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getUserContext(mockUserId);

      expect(result).toBeNull();
    });

    it('should return null when database query fails', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getUserContext(mockUserId);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await getUserContext(mockUserId);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching user context:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Role Hierarchy Integration', () => {
    it('should maintain consistent role hierarchy across all functions', () => {
      // Test that all admin functions work consistently
      const adminFunctions = [
        canPerformAdminOperation,
        canDeleteEndpoints,
        canPerformSystemOperations
      ];

      adminFunctions.forEach(func => {
        expect(func(Role.USER)).toBe(false);
        expect(func(Role.ADMIN)).toBe(true);
        expect(func(Role.SUPER_ADMIN)).toBe(true);
      });

      // Test super admin specific function
      expect(canPerformSuperAdminOperation(Role.USER)).toBe(false);
      expect(canPerformSuperAdminOperation(Role.ADMIN)).toBe(false);
      expect(canPerformSuperAdminOperation(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should allow all users to manage API connections', () => {
      [Role.USER, Role.ADMIN, Role.SUPER_ADMIN].forEach(role => {
        expect(canManageApiConnections(role)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle role hierarchy with hasRole function', () => {
      // Test that role hierarchy is properly implemented
      const roles = [Role.USER, Role.ADMIN, Role.SUPER_ADMIN];
      
      roles.forEach((userRole, userIndex) => {
        roles.forEach((requiredRole, requiredIndex) => {
          const expected = userIndex >= requiredIndex;
          expect(hasRole(userRole, requiredRole)).toBe(expected);
        });
      });
    });

    it('should maintain backward compatibility for role checks', () => {
      // Ensure that existing role checks continue to work
      expect(hasRole(Role.ADMIN, Role.USER)).toBe(true);
      expect(canPerformAdminOperation(Role.ADMIN)).toBe(true);
      expect(canDeleteEndpoints(Role.ADMIN)).toBe(true);
    });
  });
}); 