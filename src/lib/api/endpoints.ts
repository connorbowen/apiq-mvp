import { prisma } from '../../../lib/database/client';
import { logError, logInfo } from '../../utils/logger';
import { ParsedOpenApiSpec } from './parser';

export interface ExtractedEndpoint {
  apiConnectionId: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters: any[];
  requestBody?: any;
  responses: any;
  successSchema?: any; // 200/201 response schema for examples
}

/**
 * Extract endpoints from an OpenAPI specification and store them in the database
 * @param apiConnectionId The ID of the API connection
 * @param parsedSpec The parsed OpenAPI specification
 * @returns Array of created endpoint IDs
 */
export const extractAndStoreEndpoints = async (
  apiConnectionId: string, 
  parsedSpec: ParsedOpenApiSpec
): Promise<string[]> => {
  const extractedEndpoints: ExtractedEndpoint[] = [];
  
  try {
    logInfo('Extracting endpoints from OpenAPI spec', { 
      apiConnectionId, 
      endpointCount: Object.keys(parsedSpec.spec.paths).length 
    });

    // Extract endpoints from the spec
    for (const [path, pathItem] of Object.entries(parsedSpec.spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const op = operation as any;
          
          // Extract success schema (200/201 responses)
          const successSchema = extractSuccessSchema(op.responses);
          
          extractedEndpoints.push({
            apiConnectionId,
            path,
            method: method.toUpperCase(),
            summary: op.summary,
            description: op.description,
            parameters: op.parameters || [],
            requestBody: op.requestBody,
            responses: op.responses,
            successSchema
          });
        }
      }
    }

    // Store endpoints in a transaction
    const createdEndpoints = await prisma.$transaction(async (tx: any) => {
      // Delete existing endpoints for this connection
      await tx.endpoint.deleteMany({
        where: { apiConnectionId }
      });

      // Create new endpoints
      const created = await tx.endpoint.createMany({
        data: extractedEndpoints.map(endpoint => ({
          apiConnectionId: endpoint.apiConnectionId,
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary,
          description: endpoint.description,
          parameters: endpoint.parameters,
          requestBody: endpoint.requestBody,
          responses: endpoint.responses
        }))
      });

      // Get the created endpoint IDs
      const endpointIds = await tx.endpoint.findMany({
        where: { apiConnectionId },
        select: { id: true }
      });

      return endpointIds.map((e: any) => e.id);
    });

    logInfo('Successfully extracted and stored endpoints', {
      apiConnectionId,
      endpointCount: createdEndpoints.length
    });

    return createdEndpoints;

  } catch (error: any) {
    logError('Failed to extract and store endpoints', error, { apiConnectionId });
    throw new Error(`Failed to extract endpoints: ${error.message}`);
  }
};

/**
 * Extract the success schema from OpenAPI responses (200/201)
 * @param responses The responses object from the OpenAPI spec
 * @returns The success schema or undefined
 */
const extractSuccessSchema = (responses: any): any => {
  if (!responses) return undefined;

  // Look for 200 or 201 responses
  const successResponse = responses['200'] || responses['201'] || responses['2XX'];
  
  if (!successResponse) return undefined;

  // Extract the schema from the response
  if (successResponse.content) {
    const contentType = Object.keys(successResponse.content)[0];
    if (contentType) {
      return successResponse.content[contentType].schema;
    }
  }

  return undefined;
};

/**
 * Get all endpoints for an API connection with optional filtering
 * @param apiConnectionId The ID of the API connection
 * @param filters Optional filters for the endpoints
 * @returns Array of endpoints
 */
export const getEndpointsForConnection = async (
  apiConnectionId: string, 
  filters?: {
    method?: string;
    path?: string;
    summary?: string;
  }
) => {
  try {
    const whereClause: any = {
      apiConnectionId,
      isActive: true
    };

    // Apply filters if provided
    if (filters?.method) {
      whereClause.method = filters.method.toUpperCase();
    }

    if (filters?.path) {
      whereClause.path = {
        contains: filters.path,
        mode: 'insensitive' // Case-insensitive search
      };
    }

    if (filters?.summary) {
      whereClause.summary = {
        contains: filters.summary,
        mode: 'insensitive' // Case-insensitive search
      };
    }

    const endpoints = await prisma.endpoint.findMany({
      where: whereClause,
      orderBy: [
        { path: 'asc' },
        { method: 'asc' }
      ]
    });

    return endpoints;
  } catch (error: any) {
    logError('Failed to get endpoints for connection', error, { apiConnectionId, filters });
    throw new Error(`Failed to get endpoints: ${error.message}`);
  }
};

/**
 * Delete all endpoints for an API connection
 * @param apiConnectionId The ID of the API connection
 */
export const deleteEndpointsForConnection = async (apiConnectionId: string) => {
  try {
    await prisma.endpoint.deleteMany({
      where: { apiConnectionId }
    });

    logInfo('Deleted endpoints for connection', { apiConnectionId });
  } catch (error: any) {
    logError('Failed to delete endpoints for connection', error, { apiConnectionId });
    throw new Error(`Failed to delete endpoints: ${error.message}`);
  }
}; 