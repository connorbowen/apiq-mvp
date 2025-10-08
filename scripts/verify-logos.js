#!/usr/bin/env node

/**
 * Script to verify that logos are working and accessible
 * Run with: node scripts/verify-logos.js
 */

const { PrismaClient } = require('../src/generated/prisma');
const { testLogoUrl } = require('../src/lib/utils/logoService');

const prisma = new PrismaClient();

async function verifyLogos() {
  try {
    console.log('🔍 Verifying logos for APIs and providers...');
    
    // Check API logos
    const apis = await prisma.apiCatalog.findMany({
      where: { 
        status: 'ACTIVE',
        logoUrl: { not: null }
      },
      select: { id: true, name: true, logoUrl: true }
    });
    
    console.log(`\n📊 Found ${apis.length} APIs with logos`);
    
    let workingLogos = 0;
    let brokenLogos = 0;
    
    console.log('\n🔌 API Logos:');
    for (const api of apis) {
      const isWorking = await testLogoUrl(api.logoUrl);
      if (isWorking) {
        console.log(`  ✅ ${api.name}: ${api.logoUrl}`);
        workingLogos++;
      } else {
        console.log(`  ❌ ${api.name}: ${api.logoUrl} (broken)`);
        brokenLogos++;
      }
    }
    
    // Check provider logos
    const providers = await prisma.apiProvider.findMany({
      where: { 
        isActive: true,
        logoUrl: { not: null }
      },
      select: { id: true, name: true, logoUrl: true }
    });
    
    console.log(`\n📊 Found ${providers.length} providers with logos`);
    
    let workingProviderLogos = 0;
    let brokenProviderLogos = 0;
    
    console.log('\n🏢 Provider Logos:');
    for (const provider of providers) {
      const isWorking = await testLogoUrl(provider.logoUrl);
      if (isWorking) {
        console.log(`  ✅ ${provider.name}: ${provider.logoUrl}`);
        workingProviderLogos++;
      } else {
        console.log(`  ❌ ${provider.name}: ${provider.logoUrl} (broken)`);
        brokenProviderLogos++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   - API Logos: ${workingLogos} working, ${brokenLogos} broken`);
    console.log(`   - Provider Logos: ${workingProviderLogos} working, ${brokenProviderLogos} broken`);
    console.log(`   - Total Working: ${workingLogos + workingProviderLogos}`);
    console.log(`   - Total Broken: ${brokenLogos + brokenProviderLogos}`);

  } catch (error) {
    console.error('❌ Error verifying logos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
if (require.main === module) {
  verifyLogos()
    .then(() => {
      console.log('✅ Logo verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Logo verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyLogos };
