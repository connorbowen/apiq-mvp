#!/usr/bin/env node

/**
 * OAuth2 Setup and Testing Script
 * 
 * This script helps set up OAuth2 credentials and test the OAuth2 flows
 * with real providers (GitHub, Google, Slack).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logStep(message) {
  log(`\n${message}`, 'yellow');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function checkEnvironmentVariables() {
  logHeader('Checking OAuth2 Environment Variables');
  
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    logError('.env file not found');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const providers = ['GOOGLE'];
  let hasCredentials = false;

  providers.forEach(provider => {
    const clientId = envContent.includes(`${provider}_CLIENT_ID`);
    const clientSecret = envContent.includes(`${provider}_CLIENT_SECRET`);
    
    if (clientId && clientSecret) {
      logSuccess(`${provider} OAuth2 credentials found`);
      hasCredentials = true;
    } else {
      logInfo(`${provider} OAuth2 credentials not configured`);
    }
  });

  return hasCredentials;
}

function showSetupInstructions() {
  logHeader('OAuth2 Setup Instructions');
  
  logStep('1. Google OAuth2 Setup:');
  log('   - Go to: https://console.cloud.google.com/');
  log('   - Create new project or select existing');
  log('   - Enable Google+ API and Google Calendar API');
  log('   - Go to "APIs & Services" > "Credentials"');
  log('   - Create OAuth 2.0 Client ID');
  log('   - Application type: Web application');
  log('   - Authorized redirect URIs: http://localhost:3000/api/oauth/callback');
  
  logStep('2. Update .env file:');
  log('   Add these variables to your .env file:');
  log('   GOOGLE_CLIENT_ID="your-google-client-id"');
  log('   GOOGLE_CLIENT_SECRET="your-google-client-secret"');
  log('   OAUTH2_REDIRECT_URI="http://localhost:3000/api/oauth/callback"');
}

function runTests() {
  logHeader('Running OAuth2 Tests');
  
  try {
    logStep('Running Google OAuth2 tests...');
    execSync('npm test -- tests/integration/api/oauth2-google.test.ts --verbose', { stdio: 'inherit' });
    logSuccess('Google OAuth2 tests completed');
  } catch (error) {
    logError('Google OAuth2 tests failed');
  }
}

function showManualTestingInstructions() {
  logHeader('Manual OAuth2 Testing');
  
  logStep('1. Start the development server:');
  log('   npm run dev');
  
  logStep('2. Test OAuth2 authorization flows:');
  log('   Google: http://localhost:3000/api/oauth/authorize?provider=google&apiConnectionId=test');
  
  logStep('3. Check callback handling:');
  log('   Callback URL: http://localhost:3000/api/oauth/callback');
  log('   This will be called by the OAuth2 provider after authorization');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  logHeader('OAuth2 Setup and Testing Script');

  switch (command) {
    case 'check':
      checkEnvironmentVariables();
      break;
      
    case 'setup':
      showSetupInstructions();
      break;
      
    case 'test':
      if (checkEnvironmentVariables()) {
        runTests();
      } else {
        logError('No OAuth2 credentials found. Run setup first.');
        showSetupInstructions();
      }
      break;
      
    case 'manual':
      showManualTestingInstructions();
      break;
      
    default:
      log('Usage:', 'bright');
      log('  node scripts/setup-oauth2.js check    - Check if OAuth2 credentials are configured');
      log('  node scripts/setup-oauth2.js setup    - Show setup instructions');
      log('  node scripts/setup-oauth2.js test     - Run OAuth2 tests');
      log('  node scripts/setup-oauth2.js manual   - Show manual testing instructions');
      log('\nFor detailed setup guide, see: docs/oauth2-setup-guide.md');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  showSetupInstructions,
  runTests,
  showManualTestingInstructions
}; 