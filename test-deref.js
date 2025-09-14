#!/usr/bin/env node

const { dereferenceSchema } = require('./src/lib/openapi/derefSchema.ts');

async function testDeref() {
  try {
    console.log('🔍 Testing Schema Dereferencing...\n');

    // Test with a simple schema reference
    const testSchema = {
      "$ref": "#/definitions/Pet"
    };

    const fullSpec = {
      definitions: {
        Pet: {
          type: "object",
          required: ["name", "photoUrls"],
          properties: {
            id: {
              type: "integer",
              format: "int64"
            },
            name: {
              type: "string",
              example: "doggie"
            },
            photoUrls: {
              type: "array",
              items: {
                type: "string"
              }
            },
            status: {
              type: "string",
              enum: ["available", "pending", "sold"]
            }
          }
        }
      }
    };

    console.log('📝 Original schema:');
    console.log(JSON.stringify(testSchema, null, 2));

    console.log('\n🔍 Dereferencing schema...');
    const dereferenced = await dereferenceSchema({
      ...fullSpec,
      schema: testSchema
    });

    console.log('\n✅ Dereferenced schema:');
    console.log(JSON.stringify(dereferenced.schema, null, 2));

    if (dereferenced.schema && dereferenced.schema.properties) {
      console.log('\n🎉 Schema dereferencing is working!');
      console.log(`Found ${Object.keys(dereferenced.schema.properties).length} properties`);
    } else {
      console.log('\n❌ Schema dereferencing failed');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDeref();
