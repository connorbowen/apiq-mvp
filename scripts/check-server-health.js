#!/usr/bin/env node

const http = require('http');
const url = require('url');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const HEALTH_ENDPOINT = `${BASE_URL}/api/health`;

function checkServerHealth() {
  return new Promise((resolve) => {
    const parsedUrl = url.parse(HEALTH_ENDPOINT);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 3000,
      path: parsedUrl.path,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Server is healthy and running');
        resolve(true);
      } else {
        console.log(`❌ Server responded with status: ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log('❌ Server is not running or not accessible');
      console.log(`Error: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌ Server health check timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log(`Checking server health at ${HEALTH_ENDPOINT}...`);
  
  const isHealthy = await checkServerHealth();
  
  if (!isHealthy) {
    console.log('\n🚨 Server is not running!');
    console.log('\nTo start the server, run:');
    console.log('  npm run dev');
    console.log('\nOr use the E2E test command that starts the server automatically:');
    console.log('  npm run test:e2e:with-server');
    console.log('\nFor debugging with headed browser:');
    console.log('  npm run test:e2e:debug');
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error('Error checking server health:', error);
  process.exit(1);
}); 