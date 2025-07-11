import $RefParser from '@apidevtools/json-schema-ref-parser';

/**
 * Dereference OpenAPI/JSON Schema $ref pointers
 * Handles both OpenAPI 2.0 and 3.x $ref resolution
 */
export async function dereferenceSchema<T extends object>(schema: T): Promise<T> {
  // json-schema-ref-parser handles both OpenAPI 2.0 and 3.x $ref resolution
  return $RefParser.dereference(schema, { dereference: { circular: 'ignore' } }) as Promise<T>;
}

/**
 * Cached dereferencing utility for use within request scope
 * Avoids re-processing the same schema fragment across multiple endpoints
 */
export class SchemaDerefCache {
  private cache = new Map<object, object>();

  async derefOnce<T extends object>(schema: T): Promise<T> {
    if (this.cache.has(schema)) {
      return this.cache.get(schema) as T;
    }
    
    const dereferenced = await dereferenceSchema(schema);
    this.cache.set(schema, dereferenced);
    return dereferenced;
  }

  clear(): void {
    this.cache.clear();
  }
} 