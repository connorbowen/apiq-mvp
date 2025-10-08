#!/usr/bin/env node

/**
 * Script to update logos for all APIs using Clearbit service
 * Run with: node scripts/update-logos.js
 */

const { PrismaClient } = require('../src/generated/prisma');
const { autoFetchLogo, batchUpdateLogos } = require('../src/lib/utils/logoService');

const prisma = new PrismaClient();

async function updateAllLogos() {
  try {
    console.log('🖼️  Starting logo update for all APIs...');
    
    // Get all APIs
    const apis = await prisma.apiCatalog.findMany({
      where: { status: 'ACTIVE' }
    });
    
    console.log(`📊 Found ${apis.length} APIs to update`);
    
    if (apis.length === 0) {
      console.log('⚠️  No APIs found in database');
      return;
    }
    
    // Use batch update for better performance
    const updateResults = await batchUpdateLogos(apis.map(api => ({
      id: api.id,
      name: api.name,
      baseUrl: api.baseUrl,
      logoUrl: api.logoUrl || undefined
    })));
    
    let successCount = 0;
    let failCount = 0;
    
    console.log('🔄 Updating logos...');
    
    for (const result of updateResults) {
      if (result.success && result.logoUrl) {
        // Update database with new logo
        await prisma.apiCatalog.update({
          where: { id: result.id },
          data: { logoUrl: result.logoUrl }
        });
        
        console.log(`  ✅ ${result.name}: ${result.logoUrl}`);
        successCount++;
      } else {
        console.log(`  ❌ ${result.name}: ${result.error || 'Logo not found'}`);
        failCount++;
      }
    }
    
    console.log(`\n🎉 Logo update completed!`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Failed: ${failCount}`);
    console.log(`   - Total: ${apis.length}`);
    
    // Show some examples of successful updates
    if (successCount > 0) {
      console.log('\n📸 Sample logos fetched:');
      const successfulApis = updateResults.filter(r => r.success && r.logoUrl);
      successfulApis.slice(0, 5).forEach(result => {
        console.log(`   - ${result.name}: ${result.logoUrl}`);
      });
    }

  } catch (error) {
    console.error('❌ Error updating logos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
if (require.main === module) {
  updateAllLogos()
    .then(() => {
      console.log('✅ Logo update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Logo update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateAllLogos };
