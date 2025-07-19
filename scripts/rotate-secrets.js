#!/usr/bin/env node

/**
 * CLI script for rotating encryption keys in the Secrets Vault
 * Usage: npm run rotate-secrets
 */

const { prisma } = require('../lib/database/client');
const { SecretsVault } = require('../src/lib/secrets/secretsVault');

async function rotateSecrets() {
  console.log('🔐 Starting Secrets Vault key rotation...');
  
  try {
    const vault = new SecretsVault();
    
    // Check vault health before rotation
    const healthBefore = await vault.getHealthStatus();
    console.log(`📊 Vault health before rotation: ${healthBefore.status}`);
    console.log(`📊 Active secrets: ${healthBefore.activeSecrets}`);
    console.log(`📊 Encryption keys: ${healthBefore.keyCount}`);
    
    if (healthBefore.status === 'error') {
      console.error('❌ Vault is in error state. Cannot proceed with rotation.');
      process.exit(1);
    }
    
    // Perform key rotation
    console.log('🔄 Starting key rotation process...');
    await vault.rotateKeys();
    
    // Check vault health after rotation
    const healthAfter = await vault.getHealthStatus();
    console.log(`📊 Vault health after rotation: ${healthAfter.status}`);
    console.log(`📊 Active secrets: ${healthAfter.activeSecrets}`);
    console.log(`📊 Encryption keys: ${healthAfter.keyCount}`);
    
    if (healthAfter.lastRotation) {
      console.log(`📅 Last rotation: ${healthAfter.lastRotation.toISOString()}`);
    }
    
    console.log('✅ Key rotation completed successfully!');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Key rotation failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the rotation if this script is executed directly
if (require.main === module) {
  rotateSecrets();
}

module.exports = { rotateSecrets }; 