import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { logInfo, logError } from '../../../../src/utils/logger';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  let user: any = null;
  
  try {
    user = await requireAuth(req, res);

    if (req.method === 'GET') {
      // Get all active categories
      const categories = await prisma.catalogCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      });

      // Get API counts per category
      const categoryCounts = await prisma.apiCatalog.groupBy({
        by: ['category'],
        where: { status: 'ACTIVE' },
        _count: { id: true }
      });

      // Merge counts with categories
      const categoriesWithCounts = categories.map(category => ({
        ...category,
        apiCount: categoryCounts.find(c => c.category === category.name)?._count.id || 0
      }));

      logInfo('Retrieved catalog categories', {
        userId: user.id,
        categoryCount: categoriesWithCounts.length
      });

      return res.status(200).json({
        success: true,
        data: { categories: categoriesWithCounts }
      });
    }

    if (req.method === 'POST') {
      // Only admin users can create categories
      if (user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required to create categories'
        });
      }

      const { name, description, icon, color, sortOrder } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Category name is required'
        });
      }

      // Check if category already exists
      const existing = await prisma.catalogCategory.findUnique({
        where: { name }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Category with this name already exists'
        });
      }

      // Create category
      const category = await prisma.catalogCategory.create({
        data: {
          name,
          description,
          icon,
          color,
          sortOrder: sortOrder || 0
        }
      });

      logInfo('Created catalog category', {
        userId: user.id,
        categoryId: category.id,
        name: category.name
      });

      return res.status(201).json({
        success: true,
        data: { category }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error: any) {
    logError('Catalog categories operation failed', error, {
      method: req.method,
      userId: user?.id
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
