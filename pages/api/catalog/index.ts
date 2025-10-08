import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { logInfo, logError } from '../../../src/utils/logger';
import { ApplicationError } from '../../../src/lib/errors';
import { autoFetchLogo } from '../../../src/lib/utils/logoService';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  let user: any = null;
  
  try {
    console.log('Catalog API called with method:', req.method);
    user = await requireAuth(req, res);
    console.log('User authenticated:', user?.email);

    if (req.method === 'GET') {
      const { 
        category, 
        search, 
        tags, 
        authType, 
        status = 'ACTIVE',
        page = '1',
        limit = '20',
        sortBy = 'popularity',
        sortOrder = 'desc',
        providerId
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        status: status as string
      };

      if (category) {
        where.category = category as string;
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { tags: { has: search as string } },
          { provider: { name: { contains: search as string, mode: 'insensitive' } } }
        ];
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        where.tags = { hasSome: tagArray };
      }

      if (authType) {
        where.authTypes = { has: authType as string };
      }

      if (providerId) {
        where.providerId = providerId as string;
      }

      // Build orderBy clause - always sort by popularity first, then name
      const orderBy: any[] = [
        { popularity: 'desc' }, // Popularity first (highest to lowest)
        { name: 'asc' }         // Then alphabetically by name
      ];

      // Get total count for pagination
      const totalCount = await prisma.apiCatalog.count({ where });

      // Get catalog entries - only select public fields, no sensitive data
      const catalogEntries = await prisma.apiCatalog.findMany({
        where,
        orderBy,
        skip: offset,
        take: limitNum,
        select: {
          id: true,
          name: true,
          description: true,
          baseUrl: true,
          documentationUrl: true,
          logoUrl: true,
          category: true,
          tags: true,
          authTypes: true, // Supported auth types, not actual credentials
          status: true,
          isVerified: true,
          popularity: true,
          lastUpdated: true,
          createdAt: true,
          updatedAt: true,
          specVersion: true,
          endpointCount: true,
          providerId: true, // Include provider relationship
          provider: {
            select: {
              id: true,
              name: true,
              description: true,
              logoUrl: true,
              websiteUrl: true,
              category: true,
              isVerified: true
            }
          },
          endpoints: {
            select: {
              id: true,
              path: true,
              method: true,
              summary: true,
              description: true,
              parameters: true,
              requestBody: true,
              responses: true,
              successSchema: true,
              tags: true,
              isDeprecated: true,
              createdAt: true,
              updatedAt: true
            },
            take: 5 // Limit endpoints for list view
          }
          // Explicitly exclude: rawSpec, specHash, and any other sensitive fields
        }
      });

      // Get categories for filtering
      let categories: any[] = [];
      try {
        categories = await prisma.catalogCategory.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        });
        console.log('Found categories:', categories.length);
      } catch (error) {
        console.error('Categories query failed:', error);
        logError('Failed to fetch catalog categories', error instanceof Error ? error : new Error(String(error)));
        // Fallback to empty array if categories table doesn't exist or has issues
        categories = [];
      }

      // Get popular tags
      const popularTags = await prisma.apiCatalog.findMany({
        where: { status: 'ACTIVE' },
        select: { tags: true }
      });

      const allTags = popularTags.flatMap(entry => entry.tags);
      const tagCounts = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }));

      logInfo('Retrieved API catalog entries', {
        userId: user.id,
        totalCount,
        returnedCount: catalogEntries.length,
        filters: { category, search, tags, authType, status }
      });

      return res.status(200).json({
        success: true,
        data: {
          catalogEntries,
          filters: {
            categories,
            popularTags: topTags,
            authTypes: ['API_KEY', 'BEARER_TOKEN', 'OAUTH2', 'BASIC_AUTH', 'NONE']
          }
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        }
      });
    }

    if (req.method === 'POST') {
      // Only admin users can create catalog entries
      if (user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required to create catalog entries'
        });
      }

      const {
        name,
        description,
        baseUrl,
        documentationUrl,
        logoUrl,
        category,
        tags = [],
        authTypes = [],
        rawSpec,
        specVersion
      } = req.body;

      if (!name || !baseUrl) {
        return res.status(400).json({
          success: false,
          error: 'Name and baseUrl are required'
        });
      }

      // Check if catalog entry already exists
      const existing = await prisma.apiCatalog.findUnique({
        where: { name }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Catalog entry with this name already exists'
        });
      }

      // Generate spec hash if rawSpec provided
      let specHash = null;
      if (rawSpec) {
        const crypto = require('crypto');
        specHash = crypto.createHash('sha256').update(rawSpec).digest('hex');
      }

      // Auto-fetch logo if not provided
      let finalLogoUrl = logoUrl;
      if (!finalLogoUrl && baseUrl) {
        try {
          const fetchedLogoUrl = await autoFetchLogo(baseUrl, logoUrl);
          if (fetchedLogoUrl) {
            finalLogoUrl = fetchedLogoUrl;
            logInfo('Auto-fetched logo for catalog entry', {
              name,
              baseUrl,
              logoUrl: finalLogoUrl
            });
          } else {
            logInfo('No logo found for API', {
              name,
              baseUrl
            });
          }
        } catch (error) {
          logInfo('Failed to auto-fetch logo', {
            name,
            baseUrl,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue without logo - don't fail the creation
        }
      }

      // Create catalog entry
      const catalogEntry = await prisma.apiCatalog.create({
        data: {
          name,
          description,
          baseUrl,
          documentationUrl,
          logoUrl: finalLogoUrl,
          category,
          tags,
          authTypes,
          rawSpec,
          specHash,
          specVersion,
          isVerified: false // New entries need verification
        }
      });

      logInfo('Created API catalog entry', {
        userId: user.id,
        catalogId: catalogEntry.id,
        name: catalogEntry.name
      });

      return res.status(201).json({
        success: true,
        data: catalogEntry
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error: any) {
    console.error('Catalog API error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle ApplicationError instances (like authentication errors) properly
    if (error.name === 'ApplicationError') {
      logError('API catalog operation failed', error, {
        method: req.method,
        userId: user?.id || 'unknown'
      });

      return res.status(error.status || 500).json({
        success: false,
        error: error.message
      });
    }

    // Handle other errors as internal server errors
    logError('API catalog operation failed', error, {
      method: req.method,
      userId: user?.id || 'unknown'
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
