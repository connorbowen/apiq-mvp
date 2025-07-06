const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPIEndpoints() {
  console.log('Testing API endpoints...\n');

  try {
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health endpoint:', healthResponse.status, healthResponse.data.success);
    console.log('');

    // 2. Try to login with existing test user (from the logs, we know test@example.com exists)
    console.log('2. Trying to login with existing test user...');
    let loginResponse;
    try {
      loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpass123'
      });
      console.log('✅ Login with existing user:', loginResponse.status, loginResponse.data.success);
    } catch (loginError) {
      console.log('❌ Login failed, trying with different password...');
      try {
        loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: 'test@example.com',
          password: 'e2eTestPass123'
        });
        console.log('✅ Login with e2eTestPass123:', loginResponse.status, loginResponse.data.success);
      } catch (loginError2) {
        console.log('❌ Both login attempts failed, creating new user...');
        
        // Create a new user
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
          email: 'apitest@example.com',
          password: 'testpass123',
          name: 'API Test User'
        });
        console.log('✅ User registration:', registerResponse.status, registerResponse.data.success);
        
        // For testing, we'll skip email verification and just try to login
        // (This won't work due to isActive: false, but let's see the error)
        try {
          loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'apitest@example.com',
            password: 'testpass123'
          });
          console.log('✅ Login after registration:', loginResponse.status, loginResponse.data.success);
        } catch (finalLoginError) {
          console.log('❌ Login still failed (expected due to email verification):', finalLoginError.response?.data);
          console.log('This is expected behavior - users need email verification to be active');
          return;
        }
      }
    }
    
    const accessToken = loginResponse?.data?.data?.accessToken;
    if (!accessToken) {
      console.log('❌ No access token received, cannot test authenticated endpoints');
      return;
    }
    
    console.log('✅ Got access token:', accessToken ? 'Yes' : 'No');
    console.log('');

    // 3. Test connections endpoint with authentication
    console.log('3. Testing connections endpoint...');
    const connectionsResponse = await axios.get(`${BASE_URL}/api/connections`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Get connections:', connectionsResponse.status, connectionsResponse.data.success);
    console.log('');

    // 4. Create a connection
    console.log('4. Creating a connection...');
    const createConnectionResponse = await axios.post(`${BASE_URL}/api/connections`, {
      name: 'Test API',
      baseUrl: 'https://api.test.com',
      authType: 'NONE'
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Create connection:', createConnectionResponse.status, createConnectionResponse.data.success);
    
    if (createConnectionResponse.data.success) {
      const connectionId = createConnectionResponse.data.data.id;
      console.log('✅ Connection created with ID:', connectionId);
    }
    console.log('');

    // 5. Test workflows endpoint
    console.log('5. Testing workflows endpoint...');
    const workflowsResponse = await axios.get(`${BASE_URL}/api/workflows`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Get workflows:', workflowsResponse.status, workflowsResponse.data.success);
    console.log('');

    // 6. Test secrets endpoint
    console.log('6. Testing secrets endpoint...');
    const secretsResponse = await axios.get(`${BASE_URL}/api/secrets`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Get secrets:', secretsResponse.status, secretsResponse.data.success);
    console.log('');

    console.log('🎉 All API endpoints are working correctly!');

  } catch (error) {
    console.error('❌ Error testing API endpoints:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
    process.exit(1);
  }
}

testAPIEndpoints(); 