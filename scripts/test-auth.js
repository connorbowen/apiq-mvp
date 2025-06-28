#!/usr/bin/env node

/**
 * Test script for the new authentication system
 * Demonstrates login, token usage, and role-based access control
 */

const BASE_URL = 'http://localhost:3000/api';

// Test users
const USERS = {
  admin: { email: 'admin@example.com', password: 'admin123' },
  user: { email: 'user@example.com', password: 'user123' },
  super: { email: 'super@example.com', password: 'super123' }
};

let currentToken = null;

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(currentToken && { 'Authorization': `Bearer ${currentToken}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`\n${options.method || 'GET'} ${endpoint} (${response.status})`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.message);
    return { response: null, data: null };
  }
}

async function login(user) {
  console.log(`\n🔐 Logging in as ${user.email}...`);
  
  const { data } = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(user)
  });

  if (data?.success && data.data?.accessToken) {
    currentToken = data.data.accessToken;
    console.log(`✅ Login successful! Token: ${currentToken.substring(0, 20)}...`);
    return data.data.user;
  } else {
    console.log('❌ Login failed');
    return null;
  }
}

async function getCurrentUser() {
  console.log('\n👤 Getting current user...');
  const { data } = await makeRequest('/auth/me');
  
  if (data?.success) {
    console.log(`✅ Current user: ${data.data.user.name} (${data.data.user.role})`);
    return data.data.user;
  } else {
    console.log('❌ Failed to get current user');
    return null;
  }
}

async function testApiConnections() {
  console.log('\n🔗 Testing API connections...');
  
  // Try to get connections (should work for all authenticated users)
  await makeRequest('/connections');
  
  // Try to create a connection
  const connectionData = {
    name: 'Test API',
    description: 'Test connection for auth demo',
    baseUrl: 'https://api.example.com',
    authType: 'NONE',
    documentationUrl: 'https://petstore.swagger.io/v2/swagger.json'
  };
  
  const { data } = await makeRequest('/connections', {
    method: 'POST',
    body: JSON.stringify(connectionData)
  });
  
  if (data?.success) {
    const connectionId = data.data.id;
    console.log(`✅ Created connection: ${connectionId}`);
    
    // Test getting endpoints
    await makeRequest(`/connections/${connectionId}/endpoints`);
    
    // Test deleting endpoints (should only work for admin/super admin)
    await makeRequest(`/connections/${connectionId}/endpoints`, {
      method: 'DELETE'
    });
  }
}

async function testUnauthenticatedAccess() {
  console.log('\n🚫 Testing unauthenticated access...');
  currentToken = null;
  
  await makeRequest('/connections');
  await makeRequest('/auth/me');
}

async function runAuthTests() {
  console.log('🧪 Starting Authentication System Tests\n');
  console.log('=' .repeat(50));
  
  // Test 1: Unauthenticated access
  console.log('\n📋 Test 1: Unauthenticated Access');
  await testUnauthenticatedAccess();
  
  // Test 2: Regular user
  console.log('\n📋 Test 2: Regular User');
  const user = await login(USERS.user);
  if (user) {
    await getCurrentUser();
    await testApiConnections();
  }
  
  // Test 3: Admin user
  console.log('\n📋 Test 3: Admin User');
  const admin = await login(USERS.admin);
  if (admin) {
    await getCurrentUser();
    await testApiConnections();
  }
  
  // Test 4: Super admin user
  console.log('\n📋 Test 4: Super Admin User');
  const superAdmin = await login(USERS.super);
  if (superAdmin) {
    await getCurrentUser();
    await testApiConnections();
  }
  
  // Test 5: Invalid credentials
  console.log('\n📋 Test 5: Invalid Credentials');
  await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid@example.com',
      password: 'wrongpassword'
    })
  });
  
  // Test 6: Invalid token
  console.log('\n📋 Test 6: Invalid Token');
  currentToken = 'invalid-token';
  await makeRequest('/auth/me');
  
  console.log('\n✅ Authentication tests completed!');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ or a fetch polyfill');
  process.exit(1);
}

// Run the tests
runAuthTests().catch(console.error); 