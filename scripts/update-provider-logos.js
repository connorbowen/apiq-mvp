#!/usr/bin/env node

/**
 * Script to update logos for all API providers using Clearbit service
 * Run with: node scripts/update-provider-logos.js
 */

const { PrismaClient } = require('../src/generated/prisma');
const { autoFetchLogo } = require('../src/lib/utils/logoService');

const prisma = new PrismaClient();

async function updateProviderLogos() {
  try {
    console.log('🏢 Starting logo update for all API providers...');
    
    // Get all providers
    const providers = await prisma.apiProvider.findMany({
      where: { isActive: true }
    });
    
    console.log(`📊 Found ${providers.length} providers to update`);
    
    if (providers.length === 0) {
      console.log('⚠️  No providers found in database');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    console.log('🔄 Updating provider logos...');
    
    for (const provider of providers) {
      try {
        // Try to get logo from website URL first, then fall back to name-based domain
        let logoUrl = null;
        
        if (provider.websiteUrl) {
          logoUrl = await autoFetchLogo(provider.websiteUrl, provider.logoUrl);
        }
        
        // If website URL didn't work, try common domain patterns
        if (!logoUrl) {
          const nameBasedDomain = provider.name.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');
          
          const commonDomains = [
            `${nameBasedDomain}.com`,
            `${nameBasedDomain}.io`,
            `${nameBasedDomain}.co`,
            `${nameBasedDomain}.org`
          ];
          
          for (const domain of commonDomains) {
            const testUrl = `https://${domain}`;
            logoUrl = await autoFetchLogo(testUrl);
            if (logoUrl) break;
          }
        }
        
        if (logoUrl) {
          // Update database with new logo
          await prisma.apiProvider.update({
            where: { id: provider.id },
            data: { logoUrl: logoUrl }
          });
          
          console.log(`  ✅ ${provider.name}: ${logoUrl}`);
          successCount++;
        } else {
          console.log(`  ❌ ${provider.name}: Logo not found`);
          failCount++;
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.log(`  ❌ ${provider.name}: ${error.message}`);
        failCount++;
      }
    }
    
    console.log(`\n🎉 Provider logo update completed!`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Failed: ${failCount}`);
    console.log(`   - Total: ${providers.length}`);

  } catch (error) {
    console.error('❌ Error updating provider logos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
if (require.main === module) {
  updateProviderLogos()
    .then(() => {
      console.log('✅ Provider logo update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Provider logo update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateProviderLogos };
