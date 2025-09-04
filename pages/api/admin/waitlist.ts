import { NextApiResponse } from 'next';
import { PrismaClient } from '../../../src/generated/prisma';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';

const prisma = new PrismaClient();

export default async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  // Check JWT authentication
  const user = await requireAuth(req, res);
  
  console.log('Admin waitlist access attempt:', {
    userId: user.id,
    userEmail: user.email,
    userRole: user.role
  });

  // Check if user is super admin
  if (user.role !== 'SUPER_ADMIN') {
    console.log(`Access denied for ${user.email}. User role: ${user.role}`);
    return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
  }

  if (req.method === 'GET') {
    try {
      const { page = '1', limit = '50', status, search } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};
      if (status && status !== 'all') {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { name: { contains: search as string, mode: 'insensitive' } },
          { company: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Get waitlist entries with pagination
      const [entries, total] = await Promise.all([
        prisma.waitlist.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum,
        }),
        prisma.waitlist.count({ where })
      ]);

      return res.status(200).json({
        entries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      console.error('Error fetching waitlist:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status, notes } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Entry ID is required' });
      }

      const updatedEntry = await prisma.waitlist.update({
        where: { id },
        data: { 
          status: status || undefined,
          notes: notes || undefined,
          updatedAt: new Date()
        }
      });

      return res.status(200).json({ success: true, entry: updatedEntry });

    } catch (error) {
      console.error('Error updating waitlist entry:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
