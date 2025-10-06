import { prisma } from '../../../lib/database/client';
import { parseOpenApiSpecData } from '../api/parser';
import { extractAndStoreEndpoints } from '../api/endpoints';
import { logInfo, logError } from '../../utils/logger';

export interface CatalogApiData {
  name: string;
  description?: string;
  baseUrl: string;
  documentationUrl?: string;
  logoUrl?: string;
  category?: string;
  tags?: string[];
  authTypes?: string[];
  rawSpec?: string;
  specVersion?: string;
}

export interface CatalogSearchFilters {
  category?: string;
  search?: string;
  tags?: string[];
  authType?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ApiCatalogService {
  /**
   * Add a new API to the catalog
   */
  async addApiToCatalog(apiData: CatalogApiData): Promise<any> {
    try {
      logInfo('Adding API to catalog', { name: apiData.name });

      // Check if API already exists
      const existing = await prisma.apiCatalog.findUnique({
        where: { name: apiData.name }
      });

      if (existing) {
        throw new Error(`API with name "${apiData.name}" already exists in catalog`);
      }

      // Parse OpenAPI spec if provided
      let parsedSpec = null;
      let specHash = null;
      let endpointCount = 0;

      if (apiData.rawSpec) {
        try {
          parsedSpec = await parseOpenApiSpecData(apiData.rawSpec);
          specHash = parsedSpec.specHash;
        } catch (error) {
          logError('Failed to parse OpenAPI spec for catalog API', error as Error, {
            name: apiData.name
          });
          // Continue without spec - API can be added without OpenAPI spec
        }
      }

      // Create catalog entry
      const catalogEntry = await prisma.apiCatalog.create({
        data: {
          name: apiData.name,
          description: apiData.description,
          baseUrl: apiData.baseUrl,
          documentationUrl: apiData.documentationUrl,
          logoUrl: apiData.logoUrl,
          category: apiData.category,
          tags: apiData.tags || [],
          authTypes: (apiData.authTypes || []) as any[],
          rawSpec: apiData.rawSpec,
          specHash,
          specVersion: apiData.specVersion || parsedSpec?.version,
          isVerified: false // New entries need verification
        }
      });

      // Extract and store endpoints if spec was parsed
      if (parsedSpec) {
        try {
          const endpointIds = await extractAndStoreEndpoints(
            catalogEntry.id,
            parsedSpec
          );
          endpointCount = endpointIds.length;

          // Update endpoint count
          await prisma.apiCatalog.update({
            where: { id: catalogEntry.id },
            data: { endpointCount }
          });
        } catch (error) {
          logError('Failed to extract endpoints for catalog API', error as Error, {
            catalogId: catalogEntry.id,
            name: apiData.name
          });
        }
      }

      logInfo('Successfully added API to catalog', {
        catalogId: catalogEntry.id,
        name: apiData.name,
        endpointCount
      });

      return catalogEntry;
    } catch (error: any) {
      logError('Failed to add API to catalog', error, { name: apiData.name });
      throw error;
    }
  }

  /**
   * Search and filter catalog APIs
   */
  async searchCatalog(filters: CatalogSearchFilters = {}): Promise<{
    apis: any[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    try {
      const {
        category,
        search,
        tags,
        authType,
        status = 'ACTIVE',
        page = 1,
        limit = 20,
        sortBy = 'popularity',
        sortOrder = 'desc'
      } = filters;

      const offset = (page - 1) * limit;

      // Build where clause
      const where: any = {
        status
      };

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } }
        ];
      }

      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      if (authType) {
        where.authTypes = { has: authType };
      }

      // Build orderBy clause
      const orderBy: any = {};
      if (sortBy === 'popularity') {
        orderBy.popularity = sortOrder;
      } else if (sortBy === 'name') {
        orderBy.name = sortOrder;
      } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else {
        orderBy.popularity = 'desc';
      }

      // Get total count
      const total = await prisma.apiCatalog.count({ where });

      // Get catalog entries
      const apis = await prisma.apiCatalog.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          endpoints: {
            select: {
              id: true,
              path: true,
              method: true,
              summary: true,
              tags: true
            },
            take: 5 // Limit for list view
          },
          _count: {
            select: {
              connections: true
            }
          }
        }
      });

      return {
        apis,
        total,
        pagination: {
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      logError('Failed to search catalog', error, { filters });
      throw error;
    }
  }

  /**
   * Get catalog API by ID with full details
   */
  async getCatalogApiById(id: string): Promise<any> {
    try {
      const api = await prisma.apiCatalog.findUnique({
        where: { id },
        include: {
          endpoints: {
            orderBy: [
              { path: 'asc' },
              { method: 'asc' }
            ]
          },
          _count: {
            select: {
              connections: true
            }
          }
        }
      });

      if (!api) {
        throw new Error(`Catalog API with ID "${id}" not found`);
      }

      return api;
    } catch (error: any) {
      logError('Failed to get catalog API by ID', error, { id });
      throw error;
    }
  }

  /**
   * Get popular tags from catalog
   */
  async getPopularTags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    try {
      const apis = await prisma.apiCatalog.findMany({
        where: { status: 'ACTIVE' },
        select: { tags: true }
      });

      const allTags = apis.flatMap(api => api.tags);
      const tagCounts = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
    } catch (error: any) {
      logError('Failed to get popular tags', error);
      throw error;
    }
  }

  /**
   * Get catalog categories with API counts
   */
  async getCategoriesWithCounts(): Promise<any[]> {
    try {
      const categories = await prisma.catalogCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      });

      const categoryCounts = await prisma.apiCatalog.groupBy({
        by: ['category'],
        where: { status: 'ACTIVE' },
        _count: { id: true }
      });

      return categories.map(category => ({
        ...category,
        apiCount: categoryCounts.find(c => c.category === category.name)?._count.id || 0
      }));
    } catch (error: any) {
      logError('Failed to get categories with counts', error);
      throw error;
    }
  }

  /**
   * Update catalog API popularity when user connects
   */
  async incrementPopularity(catalogId: string): Promise<void> {
    try {
      await prisma.apiCatalog.update({
        where: { id: catalogId },
        data: {
          popularity: {
            increment: 1
          }
        }
      });
    } catch (error: any) {
      logError('Failed to increment catalog API popularity', error, { catalogId });
      throw error;
    }
  }

  /**
   * Seed the catalog with popular APIs
   */
  async seedPopularApis(): Promise<void> {
    try {
      const popularApis = [
        {
          name: 'Slack',
          description: 'Slack API for messaging and team collaboration',
          baseUrl: 'https://slack.com/api',
          documentationUrl: 'https://api.slack.com/web',
          category: 'Communication',
          tags: ['messaging', 'team', 'collaboration', 'notifications'],
          authTypes: ['OAUTH2', 'BEARER_TOKEN'],
          logoUrl: 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png'
        },
        {
          name: 'GitHub',
          description: 'GitHub API for repository management and automation',
          baseUrl: 'https://api.github.com',
          documentationUrl: 'https://docs.github.com/en/rest',
          category: 'Development',
          tags: ['git', 'repository', 'version-control', 'ci-cd'],
          authTypes: ['OAUTH2', 'BEARER_TOKEN'],
          logoUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
        },
        {
          name: 'Stripe',
          description: 'Stripe API for payment processing and financial services',
          baseUrl: 'https://api.stripe.com/v1',
          documentationUrl: 'https://stripe.com/docs/api',
          category: 'Business',
          tags: ['payments', 'billing', 'subscriptions', 'financial'],
          authTypes: ['API_KEY'],
          logoUrl: 'https://stripe.com/img/v3/home/social.png'
        },
        {
          name: 'Twilio',
          description: 'Twilio API for SMS, voice, and video communications',
          baseUrl: 'https://api.twilio.com',
          documentationUrl: 'https://www.twilio.com/docs',
          category: 'Communication',
          tags: ['sms', 'voice', 'video', 'notifications'],
          authTypes: ['API_KEY'],
          logoUrl: 'https://www.twilio.com/marketing/bundles/company/img/logos/red/twilio-logo-red.png'
        },
        {
          name: 'SendGrid',
          description: 'SendGrid API for email delivery and marketing',
          baseUrl: 'https://api.sendgrid.com/v3',
          documentationUrl: 'https://docs.sendgrid.com/api-reference',
          category: 'Communication',
          tags: ['email', 'marketing', 'notifications', 'delivery'],
          authTypes: ['API_KEY'],
          logoUrl: 'https://sendgrid.com/wp-content/uploads/2016/05/SendGrid-Logo.png'
        }
      ];

      for (const apiData of popularApis) {
        try {
          // Check if already exists
          const existing = await prisma.apiCatalog.findUnique({
            where: { name: apiData.name }
          });

          if (!existing) {
            await this.addApiToCatalog(apiData);
            logInfo('Seeded popular API', { name: apiData.name });
          }
        } catch (error) {
          logError('Failed to seed popular API', error as Error, { name: apiData.name });
        }
      }

      logInfo('Completed seeding popular APIs');
    } catch (error: any) {
      logError('Failed to seed popular APIs', error);
      throw error;
    }
  }
}

export const apiCatalogService = new ApiCatalogService();
