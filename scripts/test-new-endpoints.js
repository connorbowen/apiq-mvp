const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testNewEndpoints() {
  try {
    console.log('🧪 Testing new API endpoints with improved response format...\n');

    // Test 1: GET /api/connections - should return new format with metadata
    console.log('1. Testing GET /api/connections...');
    const getResponse = await axios.get(`${BASE_URL}/connections`, {
      headers: {
        'Authorization': 'Bearer test-token' // This will fail auth, but we can see the structure
      }
    });
    console.log('✅ GET /api/connections response structure:', JSON.stringify(getResponse.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.log('📋 Response structure (even with auth error):', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('\n🎉 Test completed! Check the response structures above.');
}

// Run the test
testNewEndpoints().catch(console.error); 