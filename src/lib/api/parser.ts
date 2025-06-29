import SwaggerParser from '@apidevtools/swagger-parser';
import crypto from 'crypto';
import axios from 'axios';
import { logError, logInfo } from '../../utils/logger';

export interface ParsedOpenApiSpec {
  spec: any;
  rawSpec: string;
  specHash: string;
  version: string;
  title?: string;
  description?: string;
}

export interface ParseError {
  type: 'NETWORK_TIMEOUT' | 'INVALID_SPEC' | 'UNREACHABLE' | 'UNKNOWN';
  message: string;
  details?: any;
}

/**
 * Parse and validate an OpenAPI specification from a URL
 * @param url The URL to fetch the OpenAPI spec from
 * @returns ParsedOpenApiSpec with sanitized content and hash
 * @throws ParseError with specific error types
 */
export const parseOpenApiSpec = async (url: string): Promise<ParsedOpenApiSpec> => {
  try {
    logInfo('Parsing OpenAPI spec', { url });

    // First fetch the spec with axios
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'APIQ/1.0'
      }
    });

    if (response.status !== 200) {
      throw {
        type: 'UNREACHABLE' as const,
        message: `HTTP ${response.status}: Failed to fetch OpenAPI specification`,
        details: { status: response.status }
      };
    }

    const specData = response.data;

    // Validate it's an object
    if (typeof specData !== 'object' || specData === null) {
      throw {
        type: 'INVALID_SPEC' as const,
        message: 'OpenAPI specification must be a JSON object',
        details: { type: typeof specData }
      };
    }

    // Parse and validate the spec with SwaggerParser
    const api = await SwaggerParser.parse(specData) as any;
    
    // Validate the spec has required components
    if (!api.paths || Object.keys(api.paths).length === 0) {
      throw {
        type: 'INVALID_SPEC' as const,
        message: 'No endpoints found in OpenAPI specification'
      };
    }

    // Get the raw spec content for storage
    const rawSpec = JSON.stringify(api, null, 2);
    
    // Generate SHA-256 hash for change detection
    const specHash = crypto.createHash('sha256').update(rawSpec).digest('hex');

    // Extract basic metadata
    const version = api.openapi || api.swagger || 'unknown';
    const title = api.info?.title;
    const description = api.info?.description;

    logInfo('Successfully parsed OpenAPI spec', {
      url,
      version,
      title,
      endpointCount: Object.keys(api.paths).length,
      specHash
    });

    return {
      spec: api,
      rawSpec,
      specHash,
      version,
      title,
      description
    };

  } catch (error: any) {
    logError('Failed to parse OpenAPI spec', error, { url });

    // Handle specific error types
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw {
          type: 'UNREACHABLE' as const,
          message: `Cannot reach the OpenAPI specification URL: ${error.message}`,
          details: { code: error.code, message: error.message }
        };
      }

      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        throw {
          type: 'NETWORK_TIMEOUT' as const,
          message: 'Request to OpenAPI specification timed out',
          details: { code: error.code, message: error.message }
        };
      }

      // Handle HTTP error responses
      if (error.response) {
        throw {
          type: 'UNREACHABLE' as const,
          message: `HTTP ${error.response.status}: Failed to fetch OpenAPI specification`,
          details: { status: error.response.status, statusText: error.response.statusText }
        };
      }
    }

    if (error.message?.includes('SwaggerParser') || error.message?.includes('OpenAPI')) {
      throw {
        type: 'INVALID_SPEC' as const,
        message: `Invalid OpenAPI specification: ${error.message}`,
        details: { message: error.message }
      };
    }

    // Default error
    throw {
      type: 'UNKNOWN' as const,
      message: `Failed to parse OpenAPI specification: ${error.message}`,
      details: { message: error.message }
    };
  }
};

/**
 * Validate if a URL points to a valid OpenAPI specification
 * @param url The URL to validate
 * @returns true if valid, false otherwise
 */
export const validateOpenApiUrl = async (url: string): Promise<boolean> => {
  try {
    await parseOpenApiSpec(url);
    return true;
  } catch (error) {
    return false;
  }
}; 