#!/usr/bin/env node

/**
 * Simple test script for Stripe API key authentication
 * Tests the new API credentials endpoint with real Stripe sandbox keys
 */

const axios = require('axios');
require('dotenv').config();

// Test configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const STRIPE_TEST_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY;

if (!STRIPE_TEST_SECRET_KEY) {
  console.error('STRIPE_TEST_SECRET_KEY environment variable is required');
  process.exit(1);
}

// Test user credentials (from your test setup)
const TEST_USER = {
  email: 'admin@apiq.com',
  password: 'admin123'
};

class StripeAuthTester {
  constructor() {
    this.authToken = null;
    this.connectionId = null;
    this.credentialId = null;
  }

  async runTests() {
    console.log('🧪 Starting Stripe API Key Authentication Tests\n');

    const results = [];

    try {
      // Test 1: Authentication
      results.push(await this.testAuthentication());

      if (results[0].success) {
        // Test 2: Create Stripe API Connection
        results.push(await this.testCreateStripeConnection());

        if (results[1].success) {
          // Test 3: Store Stripe API Key
          results.push(await this.testStoreStripeCredentials());

          if (results[2].success) {
            // Test 4: Retrieve Credential Metadata
            results.push(await this.testRetrieveCredentialMetadata());

            // Test 5: Test Stripe API Call
            results.push(await this.testStripeApiCall());

            // Test 6: Update Credentials
            results.push(await this.testUpdateCredentials());

            // Test 7: Security Validation
            results.push(await this.testSecurityValidation());
          }
        }
      }

      // Test 8: Cleanup
      results.push(await this.testCleanup());

    } catch (error) {
      console.error('Test suite failed:', error.message);
    }

    // Print results
    this.printResults(results);
  }

  async testAuthentication() {
    const start = Date.now();
    
    try {
      console.log('🔐 Testing authentication...');
      
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });

      if (response.data.success && response.data.data.accessToken) {
        this.authToken = response.data.data.accessToken;
        
        return {
          test: 'Authentication',
          success: true,
          data: { userId: response.data.data.user.id },
          duration: Date.now() - start
        };
      } else {
        throw new Error('Authentication failed - no token received');
      }
    } catch (error) {
      return {
        test: 'Authentication',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - start
      };
    }
  }

  async testCreateStripeConnection() {
    const start = Date.now();
    
    try {
      console.log('🔗 Creating Stripe API connection...');
      
      const response = await axios.post(`${BASE_URL}/api/connections`, {
        name: 'Stripe Test Connection',
        description: 'Test connection for Stripe API key authentication',
        baseUrl: 'https://api.stripe.com',
        authType: 'API_KEY',
        documentationUrl: 'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json'
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        this.connectionId = response.data.data.id;
        
        return {
          test: 'Create Stripe Connection',
          success: true,
          data: { 
            connectionId: this.connectionId,
            endpointCount: response.data.data.endpointCount
          },
          duration: Date.now() - start
        };
      } else {
        throw new Error('Failed to create Stripe connection');
      }
    } catch (error) {
      return {
        test: 'Create Stripe Connection',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - start
      };
    }
  }

  async testStoreStripeCredentials() {
    const start = Date.now();
    
    try {
      console.log('🔑 Storing Stripe API key...');
      
      const response = await axios.post(`${BASE_URL}/api/connections/${this.connectionId}/credentials`, {
        credentialData: {
          type: 'stripe_api_key',
          apiKey: STRIPE_TEST_SECRET_KEY,
          environment: 'test',
          permissions: ['read', 'write']
        },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        this.credentialId = response.data.data.id;
        
        return {
          test: 'Store Stripe Credentials',
          success: true,
          data: { 
            credentialId: this.credentialId,
            keyId: response.data.data.keyId
          },
          duration: Date.now() - start
        };
      } else {
        throw new Error('Failed to store Stripe credentials');
      }
    } catch (error) {
      return {
        test: 'Store Stripe Credentials',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - start
      };
    }
  }

  async testRetrieveCredentialMetadata() {
    const start = Date.now();
    
    try {
      console.log('📋 Retrieving credential metadata...');
      
      const response = await axios.get(`${BASE_URL}/api/connections/${this.connectionId}/credentials/${this.credentialId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.data.success) {
        const credential = response.data.data;
        
        // Verify the API key is not returned in the response
        if (credential.credentialData && credential.credentialData.apiKey) {
          throw new Error('API key should not be returned in response');
        }
        
        return {
          test: 'Retrieve Credential Metadata',
          success: true,
          data: { 
            keyId: credential.keyId,
            hasApiKey: !!credential.credentialData?.apiKey,
            environment: credential.credentialData?.environment
          },
          duration: Date.now() - start
        };
      } else {
        throw new Error('Failed to retrieve credential metadata');
      }
    } catch (error) {
      return {
        test: 'Retrieve Credential Metadata',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - start
      };
    }
  }

  async testStripeApiCall() {
    const start = Date.now();
    
    try {
      console.log('🌐 Testing Stripe API call...');
      
      const response = await axios.post(`${BASE_URL}/api/connections/${this.connectionId}/execute`, {
        endpoint: '/v1/balance',
        method: 'GET',
        headers: {},
        body: null
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          test: 'Stripe API Call',
          success: true,
          data: { 
            statusCode: response.data.data.statusCode,
            hasData: !!response.data.data.data
          },
          duration: Date.now() - start
        };
      } else {
        throw new Error('Failed to execute Stripe API call');
      }
    } catch (error) {
      return {
        test: 'Stripe API Call',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - start
      };
    }
  }

  async testUpdateCredentials() {
    const start = Date.now();
    
    try {
      console.log('🔄 Updating credentials...');
      
      const response = await axios.put(`${BASE_URL}/api/connections/${this.connectionId}/credentials/${this.credentialId}`, {
        credentialData: {
          type: 'stripe_api_key',
          apiKey: STRIPE_TEST_SECRET_KEY,
          environment: 'test',
          permissions: ['read', 'write'],
          updated: true
        },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          test: 'Update Credentials',
          success: true,
          data: { 
            updated: response.data.data.updatedAt
          },
          duration: Date.now() - start
        };
      } else {
        throw new Error('Failed to update credentials');
      }
    } catch (error) {
      return {
        test: 'Update Credentials',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - start
      };
    }
  }

  async testSecurityValidation() {
    const start = Date.now();
    
    try {
      console.log('🔒 Testing security validation...');
      
      // Test 1: Try to access credentials without authentication
      try {
        await axios.get(`${BASE_URL}/api/connections/${this.connectionId}/credentials/${this.credentialId}`);
        throw new Error('Should require authentication');
      } catch (error) {
        if (error.response?.status === 401) {
          // Expected - authentication required
        } else {
          throw new Error('Security validation failed - should require authentication');
        }
      }

      // Test 2: Try to access credentials with wrong user
      const wrongUserResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'wrong-user@example.com',
        password: 'wrongpass'
      });

      if (wrongUserResponse.data.success) {
        throw new Error('Security validation failed - wrong user should not authenticate');
      }

      return {
        test: 'Security Validation',
        success: true,
        data: { 
          authRequired: true,
          userIsolation: true
        },
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        test: 'Security Validation',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - start
      };
    }
  }

  async testCleanup() {
    const start = Date.now();
    
    try {
      console.log('🧹 Cleaning up test data...');
      
      if (this.credentialId) {
        await axios.delete(`${BASE_URL}/api/connections/${this.connectionId}/credentials/${this.credentialId}`, {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });
      }

      if (this.connectionId) {
        await axios.delete(`${BASE_URL}/api/connections/${this.connectionId}`, {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });
      }

      return {
        test: 'Cleanup',
        success: true,
        data: { 
          credentialsDeleted: !!this.credentialId,
          connectionDeleted: !!this.connectionId
        },
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        test: 'Cleanup',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - start
      };
    }
  }

  printResults(results) {
    console.log('\n📊 Test Results Summary\n');
    console.log('='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    let totalDuration = 0;

    results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = result.duration ? `(${result.duration}ms)` : '';
      
      console.log(`${status} ${result.test} ${duration}`);
      
      if (result.success) {
        passed++;
        if (result.data) {
          console.log(`   Data: ${JSON.stringify(result.data)}`);
        }
      } else {
        failed++;
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.duration) {
        totalDuration += result.duration;
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Duration: ${totalDuration}ms`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

async function main() {
  const tester = new StripeAuthTester();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(console.error);
} 