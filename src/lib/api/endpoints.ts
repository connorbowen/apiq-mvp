import { prisma } from '../../../lib/database/client';
import { logError, logInfo } from '../../utils/logger';
import { ParsedOpenApiSpec } from './parser';
import { SchemaDerefCache } from '../openapi/derefSchema';

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
 * @param transaction Optional transaction context to use
 * @returns Array of created endpoint IDs
 */
export const extractAndStoreEndpoints = async (
  apiConnectionId: string, 
  parsedSpec: ParsedOpenApiSpec,
  transaction?: any
): Promise<string[]> => {
  const extractedEndpoints: ExtractedEndpoint[] = [];
  const derefCache = new SchemaDerefCache();
  try {
    // Guard: paths must exist and be an object
    if (!parsedSpec.spec.paths || typeof parsedSpec.spec.paths !== 'object') {
      throw new Error('OpenAPI spec is missing valid paths object');
    }

    logInfo('Extracting endpoints from OpenAPI spec', { 
      apiConnectionId, 
      endpointCount: Object.keys(parsedSpec.spec.paths).length 
    });

    // Extract endpoints from the spec
    for (const [path, pathItem] of Object.entries(parsedSpec.spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const op = operation as any;

          // Extract first success response schema (OAS2 or OAS3)
          const rawRespSchema = firstSuccessResponse(op);
          let responseSchema = undefined;
          if (rawRespSchema) {
            try {
              responseSchema = await derefCache.derefOnce({
                ...parsedSpec.spec,
                schema: rawRespSchema
              });
              responseSchema = responseSchema.schema;
            } catch (e) {
              responseSchema = rawRespSchema;
            }
          }

          extractedEndpoints.push({
            apiConnectionId,
            path,
            method: method.toUpperCase(),
            summary: op.summary,
            description: op.description,
            parameters: op.parameters || [],
            requestBody: op.requestBody,
            responses: op.responses,
            successSchema: responseSchema // for legacy, but also store as responseSchema below
          });
        }
      }
    }

    // Use provided transaction or create a new one
    const tx = transaction || prisma;
    
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
        responses: endpoint.responses,
        responseSchema: endpoint.successSchema // store as responseSchema
      }))
    });

    // Get the created endpoint IDs
    const endpointIds = await tx.endpoint.findMany({
      where: { apiConnectionId },
      select: { id: true }
    });

    const createdEndpoints = endpointIds.map((e: any) => e.id);

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

// Helper to extract first success response schema (OAS2 or OAS3)
function firstSuccessResponse(op: any) {
  const resKey = Object.keys(op.responses || {}).find(k => /^2\d\d$/.test(k));
  if (!resKey) return undefined;
  const resObj = op.responses[resKey];
  if (resObj.content) {
    const firstCT = Object.keys(resObj.content)[0];
    return resObj.content[firstCT]?.schema;
  }
  if (resObj.schema) return resObj.schema;
  return undefined;
}

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

    // Get the connection to access the raw OpenAPI spec
    const connection = await prisma.apiConnection.findUnique({
      where: { id: apiConnectionId },
      select: { rawSpec: true }
    });

    if (!connection?.rawSpec) {
      logError('No raw OpenAPI spec found for connection', new Error('No raw spec'), { apiConnectionId });
      throw new Error('No OpenAPI specification found for this connection');
    }

    // Parse the raw spec back to an object for dereferencing context
    let fullSpec: any;
    try {
      fullSpec = JSON.parse(connection.rawSpec);
    } catch (error: any) {
      logError('Failed to parse raw OpenAPI spec', error, { apiConnectionId });
      throw new Error('Invalid OpenAPI specification format');
    }

    const endpoints = await prisma.endpoint.findMany({
      where: whereClause,
      orderBy: [
        { path: 'asc' },
        { method: 'asc' }
      ]
    });

    // Create a cache for dereferencing schemas within this request
    const derefCache = new SchemaDerefCache();

    // Transform the endpoints to include schema data in the format expected by the frontend
    const transformedEndpoints = await Promise.all(endpoints.map(async endpoint => {
      const transformed: any = {
        id: endpoint.id,
        path: endpoint.path,
        method: endpoint.method,
        summary: endpoint.summary,
        description: endpoint.description,
        parameters: endpoint.parameters || [],
        responses: endpoint.responses || {}
      };

      // Extract and dereference request schema from requestBody (OpenAPI 3.0) or parameters (OpenAPI 2.0)
      let rawReqSchema: any = null;
      if (endpoint.requestBody) {
        const requestBody = endpoint.requestBody as any;
        if (requestBody.content) {
          const contentType = Object.keys(requestBody.content)[0];
          rawReqSchema = contentType ? requestBody.content[contentType]?.schema : null;
        }
      } else if (endpoint.parameters) {
        // OpenAPI 2.0: Look for body parameter
        const parameters = endpoint.parameters as any[];
        const bodyParam = parameters.find(param => param.in === 'body');
        rawReqSchema = bodyParam?.schema || null;
      }

      if (rawReqSchema) {
        try {
          // Create a complete spec object that includes the schema and the full spec context
          const specWithSchema = {
            ...fullSpec,
            schema: rawReqSchema
          };
          const dereferenced = await derefCache.derefOnce(specWithSchema);
          transformed.requestSchema = dereferenced.schema;
        } catch (error: any) {
          logError('Failed to dereference request schema', error, { 
            endpointId: endpoint.id, 
            path: endpoint.path, 
            method: endpoint.method 
          });
          // Fall back to raw schema if dereferencing fails
          transformed.requestSchema = rawReqSchema;
        }
      }

      // Extract and dereference response schema from responses
      let rawResSchema: any = null;
      if (endpoint.responses) {
        const responses = endpoint.responses as any;
        // Look for 200 or 201 responses
        const successResponse = responses['200'] || responses['201'] || responses['2XX'];
        if (successResponse) {
          // OpenAPI 3.0: schema is nested under content
          if (successResponse.content) {
            const contentType = Object.keys(successResponse.content)[0];
            rawResSchema = contentType ? successResponse.content[contentType]?.schema : null;
          }
          // OpenAPI 2.0: schema is directly on the response
          else if (successResponse.schema) {
            rawResSchema = successResponse.schema;
          }
        }
      }

      if (rawResSchema) {
        try {
          // Create a complete spec object that includes the schema and the full spec context
          const specWithSchema = {
            ...fullSpec,
            schema: rawResSchema
          };
          const dereferenced = await derefCache.derefOnce(specWithSchema);
          transformed.responseSchema = dereferenced.schema;
        } catch (error: any) {
          logError('Failed to dereference response schema', error, { 
            endpointId: endpoint.id, 
            path: endpoint.path, 
            method: endpoint.method 
          });
          // Fall back to raw schema if dereferencing fails
          transformed.responseSchema = rawResSchema;
        }
      }

      return transformed;
    }));

    return transformedEndpoints;
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