import { dereferenceSchema, SchemaDerefCache } from '../../../../src/lib/openapi/derefSchema';

describe('derefSchema', () => {
  it('should dereference OpenAPI 2.0 $ref pointers', async () => {
    // Mock Petstore-style schema with $ref
    const petstoreSpec = {
      definitions: {
        Pet: {
          type: 'object',
          required: ['id', 'name', 'status'],
          properties: {
            id: { type: 'integer', format: 'int64' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['available', 'pending', 'sold'] }
          }
        }
      }
    };

    const schemaWithRef = {
      $ref: '#/definitions/Pet'
    };

    // Create a complete spec object that includes both the $ref and the definitions
    const completeSpec = {
      ...petstoreSpec,
      schema: schemaWithRef
    };

    const dereferenced = await dereferenceSchema(completeSpec);
    
    // The dereferenced result should have the schema property with the resolved Pet definition
    expect(dereferenced.schema).toEqual({
      type: 'object',
      required: ['id', 'name', 'status'],
      properties: {
        id: { type: 'integer', format: 'int64' },
        name: { type: 'string' },
        status: { type: 'string', enum: ['available', 'pending', 'sold'] }
      }
    });
  });

  it('should handle schemas without $ref pointers', async () => {
    const simpleSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' }
      }
    };

    const dereferenced = await dereferenceSchema(simpleSchema);
    expect(dereferenced).toEqual(simpleSchema);
  });

  it('should cache dereferenced schemas', async () => {
    const cache = new SchemaDerefCache();
    const schemaWithRef = {
      $ref: '#/definitions/Simple'
    };

    const completeSpec = {
      definitions: {
        Simple: {
          type: 'object',
          properties: { test: { type: 'string' } }
        }
      },
      schema: schemaWithRef
    };

    // First call should dereference
    const result1 = await cache.derefOnce(completeSpec);
    expect(result1.schema).toEqual({
      type: 'object',
      properties: { test: { type: 'string' } }
    });

    // Second call should use cache
    const result2 = await cache.derefOnce(completeSpec);
    expect(result2).toBe(result1); // Same object reference
  });
}); 