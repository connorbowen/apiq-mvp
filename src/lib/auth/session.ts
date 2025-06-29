import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../../generated/prisma';
import { ApplicationError } from '../../middleware/errorHandler';

const prisma = new PrismaClient();

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: AuthenticatedUser;
  session?: {
    user: AuthenticatedUser;
    accessToken: string;
    refreshToken: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

/**
 * Generate JWT token
 */
export const generateToken = (user: AuthenticatedUser, type: 'access' | 'refresh' = 'access'): string => {
  const payload: Omit<JWTPayload, 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: type === 'access' ? JWT_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new ApplicationError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }
};

/**
 * Extract token from request headers
 */
export const extractToken = (req: NextApiRequest): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
};

/**
 * Authenticate user with email and password
 */
export const authenticateUser = async (email: string, password: string): Promise<AuthenticatedUser> => {
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user || !user.isActive) {
    throw new ApplicationError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }
  
  // Always use bcrypt for password validation - no plain text fallback
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new ApplicationError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }
  
  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive
  };
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<AuthenticatedUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user || !user.isActive) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive
  };
};

/**
 * Authentication middleware
 */
export const requireAuth = async (req: AuthenticatedRequest, res: NextApiResponse): Promise<AuthenticatedUser> => {
  const token = extractToken(req);
  
  if (!token) {
    throw new ApplicationError('Authentication required', 401, 'UNAUTHORIZED');
  }
  
  try {
    const payload = verifyToken(token);
    
    if (payload.type !== 'access') {
      throw new ApplicationError('Invalid token type', 401, 'INVALID_TOKEN');
    }
    
    const user = await getUserById(payload.userId);
    
    if (!user) {
      throw new ApplicationError('User not found', 401, 'USER_NOT_FOUND');
    }
    
    // Attach user to request
    req.user = user;
    
    return user;
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }
    throw new ApplicationError('Authentication failed', 401, 'AUTH_FAILED');
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: Role[]) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse): Promise<AuthenticatedUser> => {
    const user = await requireAuth(req, res);
    
    if (!allowedRoles.includes(user.role)) {
      throw new ApplicationError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    
    return user;
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = async (req: AuthenticatedRequest, res: NextApiResponse): Promise<AuthenticatedUser> => {
  return requireRole([Role.ADMIN, Role.SUPER_ADMIN])(req, res);
};

/**
 * Super admin-only middleware
 */
export const requireSuperAdmin = async (req: AuthenticatedRequest, res: NextApiResponse): Promise<AuthenticatedUser> => {
  return requireRole([Role.SUPER_ADMIN])(req, res);
};

/**
 * Login endpoint handler
 */
export const handleLogin = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }
  
  try {
    const user = await authenticateUser(email, password);
    
    const accessToken = generateToken(user, 'access');
    const refreshToken = generateToken(user, 'refresh');
    
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        accessToken,
        refreshToken,
        expiresIn: 15 * 60 // 15 minutes
      },
      message: 'Login successful'
    });
  } catch (error) {
    if (error instanceof ApplicationError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Refresh token endpoint handler
 */
export const handleRefreshToken = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token is required'
    });
  }
  
  try {
    const payload = verifyToken(refreshToken);
    
    if (payload.type !== 'refresh') {
      throw new ApplicationError('Invalid token type', 401, 'INVALID_TOKEN');
    }
    
    const user = await getUserById(payload.userId);
    
    if (!user) {
      throw new ApplicationError('User not found', 401, 'USER_NOT_FOUND');
    }
    
    // Add a small delay to ensure the new token has a different timestamp
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newAccessToken = generateToken(user, 'access');
    
    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: 15 * 60
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    if (error instanceof ApplicationError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get current user endpoint handler
 */
export const handleGetCurrentUser = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  try {
    const user = await requireAuth(req, res);
    
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    if (error instanceof ApplicationError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}; 