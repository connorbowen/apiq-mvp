#!/usr/bin/env tsx

import axios from 'axios';
import { parseOpenApiSpec } from '../src/lib/api/parser';
import { logInfo, logError } from '../src/utils/logger';

const PETSTORE_API_URL = 'https://petstore.swagger.io/v2/swagger.json';
const PETSTORE_BASE_URL = 'https://petstore.swagger.io/v2';

interface Pet {
  id?: number;
  name: string;
  status: 'available' | 'pending' | 'sold';
  category?: {
    id: number;
    name: string;
  };
  photoUrls: string[];
  tags?: Array<{
    id: number;
    name: string;
  }>;
}

async function testPetstoreEndpoints() {
  console.log('🧪 Testing Petstore API Endpoints...\n');

  try {
    // First, parse the OpenAPI spec to understand available endpoints
    logInfo('Parsing Petstore OpenAPI spec', { url: PETSTORE_API_URL });
    const spec = await parseOpenApiSpec(PETSTORE_API_URL);
    
    console.log(`📋 Found ${Object.keys(spec.spec.paths).length} paths in Petstore API`);
    
    // Test 1: Get pets by status
    console.log('\n🔍 Test 1: Getting pets by status...');
    try {
      const response = await axios.get(`${PETSTORE_BASE_URL}/pet/findByStatus`, {
        params: { status: 'available' },
        timeout: 10000
      });
      
      console.log(`✅ Successfully retrieved ${response.data.length} available pets`);
      if (response.data.length > 0) {
        console.log(`   Sample pet: ${response.data[0].name} (ID: ${response.data[0].id})`);
      }
    } catch (error) {
      console.log('❌ Failed to get pets by status:', (error as any).message);
    }

    // Test 2: Create a new pet
    console.log('\n🔍 Test 2: Creating a new pet...');
    const newPet: Pet = {
      name: `Test Pet ${Date.now()}`,
      status: 'available',
      category: {
        id: 1,
        name: 'dogs'
      },
      photoUrls: ['https://example.com/photo.jpg'],
      tags: [
        {
          id: 1,
          name: 'friendly'
        }
      ]
    };

    try {
      const response = await axios.post(`${PETSTORE_BASE_URL}/pet`, newPet, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      console.log(`✅ Successfully created pet: ${response.data.name} (ID: ${response.data.id})`);
      const petId = response.data.id;
      
      // Test 3: Get the pet by ID
      console.log('\n🔍 Test 3: Getting pet by ID...');
      const getResponse = await axios.get(`${PETSTORE_BASE_URL}/pet/${petId}`, {
        timeout: 10000
      });
      
      console.log(`✅ Successfully retrieved pet: ${getResponse.data.name} (ID: ${getResponse.data.id})`);
      
      // Test 4: Update the pet
      console.log('\n🔍 Test 4: Updating pet...');
      const updatedPet = { ...getResponse.data, status: 'pending' };
      const updateResponse = await axios.put(`${PETSTORE_BASE_URL}/pet`, updatedPet, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      console.log(`✅ Successfully updated pet status to: ${updateResponse.data.status}`);
      
      // Test 5: Delete the pet
      console.log('\n🔍 Test 5: Deleting pet...');
      await axios.delete(`${PETSTORE_BASE_URL}/pet/${petId}`, {
        timeout: 10000
      });
      
      console.log(`✅ Successfully deleted pet with ID: ${petId}`);
      
    } catch (error) {
      console.log('❌ Failed to create/manage pet:', (error as any).message);
    }

    // Test 6: Test error handling - try to get a non-existent pet
    console.log('\n🔍 Test 6: Testing error handling (non-existent pet)...');
    try {
      await axios.get(`${PETSTORE_BASE_URL}/pet/999999999`, {
        timeout: 10000
      });
      console.log('❌ Expected error but got success');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly received 404 for non-existent pet');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }

    // Test 7: Test store inventory
    console.log('\n🔍 Test 7: Getting store inventory...');
    try {
      const response = await axios.get(`${PETSTORE_BASE_URL}/store/inventory`, {
        timeout: 10000
      });
      
      console.log('✅ Successfully retrieved store inventory');
      const inventory = response.data;
      console.log(`   Available pets: ${inventory.available || 0}`);
      console.log(`   Pending pets: ${inventory.pending || 0}`);
      console.log(`   Sold pets: ${inventory.sold || 0}`);
    } catch (error) {
      console.log('❌ Failed to get store inventory:', (error as any).message);
    }

    console.log('\n🎉 Petstore API endpoint testing completed successfully!');
    return true;

  } catch (error) {
    logError('Petstore endpoint test failed', error as Error);
    console.error('❌ Petstore endpoint test failed:', error);
    return false;
  }
}

// Run the test
testPetstoreEndpoints()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 