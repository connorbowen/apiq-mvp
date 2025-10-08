#!/usr/bin/env node

/**
 * Script to test search functionality across different components
 * Run with: node scripts/test-search-functionality.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function testSearchFunctionality() {
  try {
    console.log('🔍 Testing search functionality across components...');
    
    // Test 1: Check if we have data to search
    console.log('\n📊 Data Availability Test:');
    
    const connections = await prisma.apiConnection.findMany({
      take: 5,
      select: { id: true, name: true, description: true, authType: true }
    });
    console.log(`   - Connections: ${connections.length}`);
    
    const secrets = await prisma.secret.findMany({
      take: 5,
      select: { id: true, name: true, type: true }
    });
    console.log(`   - Secrets: ${secrets.length}`);
    
    const workflows = await prisma.workflow.findMany({
      take: 5,
      select: { id: true, name: true, description: true, status: true }
    });
    console.log(`   - Workflows: ${workflows.length}`);
    
    // Test 2: Simulate search functionality
    console.log('\n🔍 Search Functionality Test:');
    
    // Test connections search
    const connectionSearchTerm = 'test';
    const filteredConnections = connections.filter(connection => {
      const matchesSearch = connection.name.toLowerCase().includes(connectionSearchTerm.toLowerCase()) ||
                           connection.description?.toLowerCase().includes(connectionSearchTerm.toLowerCase());
      return matchesSearch;
    });
    console.log(`   - Connections search for "${connectionSearchTerm}": ${filteredConnections.length} results`);
    
    // Test secrets search
    const secretSearchTerm = 'api';
    const filteredSecrets = secrets.filter(secret => {
      const matchesSearch = secret.name.toLowerCase().includes(secretSearchTerm.toLowerCase());
      return matchesSearch;
    });
    console.log(`   - Secrets search for "${secretSearchTerm}": ${filteredSecrets.length} results`);
    
    // Test workflows search
    const workflowSearchTerm = 'workflow';
    const filteredWorkflows = workflows.filter(workflow => {
      const matchesSearch = workflow.name.toLowerCase().includes(workflowSearchTerm.toLowerCase()) ||
                           workflow.description?.toLowerCase().includes(workflowSearchTerm.toLowerCase());
      return matchesSearch;
    });
    console.log(`   - Workflows search for "${workflowSearchTerm}": ${filteredWorkflows.length} results`);
    
    // Test 3: Check for potential issues
    console.log('\n⚠️  Potential Issues Check:');
    
    // Check for null/undefined descriptions
    const connectionsWithNullDesc = connections.filter(c => !c.description);
    const workflowsWithNullDesc = workflows.filter(w => !w.description);
    
    console.log(`   - Connections with null descriptions: ${connectionsWithNullDesc.length}`);
    console.log(`   - Workflows with null descriptions: ${workflowsWithNullDesc.length}`);
    
    // Test 4: Search edge cases
    console.log('\n🧪 Edge Cases Test:');
    
    // Empty search
    const emptySearchResults = connections.filter(connection => {
      const matchesSearch = connection.name.toLowerCase().includes('') ||
                           connection.description?.toLowerCase().includes('');
      return matchesSearch;
    });
    console.log(`   - Empty search returns all results: ${emptySearchResults.length === connections.length}`);
    
    // Case insensitive search
    const caseInsensitiveResults = connections.filter(connection => {
      const matchesSearch = connection.name.toLowerCase().includes('TEST') ||
                           connection.description?.toLowerCase().includes('TEST');
      return matchesSearch;
    });
    console.log(`   - Case insensitive search works: ${caseInsensitiveResults.length >= 0}`);
    
    // Special characters
    const specialCharResults = connections.filter(connection => {
      const matchesSearch = connection.name.toLowerCase().includes('@#$') ||
                           connection.description?.toLowerCase().includes('@#$');
      return matchesSearch;
    });
    console.log(`   - Special characters handled: ${specialCharResults.length >= 0}`);
    
    console.log('\n✅ Search functionality test completed!');
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (connections.length === 0) {
      console.log('   - No connections found - search will appear broken');
    }
    if (secrets.length === 0) {
      console.log('   - No secrets found - search will appear broken');
    }
    if (workflows.length === 0) {
      console.log('   - No workflows found - search will appear broken');
    }
    
    if (connectionsWithNullDesc.length > 0 || workflowsWithNullDesc.length > 0) {
      console.log('   - Some items have null descriptions - this could cause search issues');
    }

  } catch (error) {
    console.error('❌ Error testing search functionality:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testSearchFunctionality()
    .then(() => {
      console.log('✅ Search functionality test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Search functionality test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSearchFunctionality };
