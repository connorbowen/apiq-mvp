const { prisma } = require('./lib/database/client');

async function testSeededConnection() {
  try {
    console.log('=== Testing Seeded API Connection ===');
    
    // Check if there are any API connections
    const connections = await prisma.apiConnection.findMany({
      include: {
        endpoints: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });
    
    console.log(`Found ${connections.length} API connections`);
    
    for (const connection of connections) {
      console.log(`\nConnection: ${connection.name}`);
      console.log(`  User: ${connection.user.email} (${connection.user.name})`);
      console.log(`  Status: ${connection.status}`);
      console.log(`  Connection Status: ${connection.connectionStatus}`);
      console.log(`  Ingestion Status: ${connection.ingestionStatus}`);
      console.log(`  Endpoints: ${connection.endpoints.length}`);
      
      if (connection.endpoints.length > 0) {
        console.log('  Sample endpoints:');
        connection.endpoints.slice(0, 3).forEach(endpoint => {
          console.log(`    ${endpoint.method} ${endpoint.path} - ${endpoint.summary}`);
        });
      }
    }
    
    // Check if there are any active connections with endpoints
    const activeConnections = connections.filter(c => 
      c.status === 'ACTIVE' && 
      c.connectionStatus === 'connected' && 
      c.endpoints.length > 0
    );
    
    console.log(`\nActive connections with endpoints: ${activeConnections.length}`);
    
    if (activeConnections.length === 0) {
      console.log('\n❌ No active connections with endpoints found!');
      console.log('This is why workflow generation is failing.');
    } else {
      console.log('\n✅ Found active connections with endpoints!');
      console.log('Workflow generation should work.');
    }
    
  } catch (error) {
    console.error('Error testing seeded connection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSeededConnection(); 