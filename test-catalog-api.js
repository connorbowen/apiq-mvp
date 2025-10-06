const { createTestUser } = require('./tests/helpers/testUtils.auth.ts');

async function testCatalogAPI() {
  try {
    // Create a test user
    const testUser = await createTestUser('test@example.com', 'testpass123', 'ADMIN', 'Test User');
    console.log('Created test user:', testUser.email);
    console.log('JWT token:', testUser.accessToken.substring(0, 50) + '...');
    
    // Test the catalog API
    const response = await fetch('http://localhost:3000/api/catalog', {
      headers: {
        'Authorization': `Bearer ${testUser.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Clean up
    await testUser.cleanup();
    console.log('Cleaned up test user');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCatalogAPI();
