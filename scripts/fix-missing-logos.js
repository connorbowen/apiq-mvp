#!/usr/bin/env node

/**
 * Script to fix missing logos for specific APIs by setting correct Clearbit URLs
 * Run with: node scripts/fix-missing-logos.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

// Manual logo mappings for APIs that Clearbit couldn't find automatically
const logoMappings = {
  // Google APIs - use google.com domain
  'Gmail API': 'https://logo.clearbit.com/gmail.com',
  'Google Sheets API': 'https://logo.clearbit.com/sheets.google.com',
  'Google Calendar API': 'https://logo.clearbit.com/calendar.google.com',
  'Google Drive API': 'https://logo.clearbit.com/drive.google.com',
  'Google Docs API': 'https://logo.clearbit.com/docs.google.com',
  'Google Maps API': 'https://logo.clearbit.com/maps.google.com',
  'YouTube Data API': 'https://logo.clearbit.com/youtube.com',
  
  // Other APIs with specific domains
  'HubSpot API': 'https://logo.clearbit.com/hubspot.com',
  'Shopify API': 'https://logo.clearbit.com/shopify.com',
  'Salesforce Marketing Cloud API': 'https://logo.clearbit.com/salesforce.com'
};

async function fixMissingLogos() {
  try {
    console.log('🔧 Fixing missing logos for specific APIs...');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const [apiName, logoUrl] of Object.entries(logoMappings)) {
      try {
        // Find the API by name
        const api = await prisma.apiCatalog.findFirst({
          where: { 
            name: apiName,
            status: 'ACTIVE'
          }
        });
        
        if (api) {
          // Update the logo URL
          await prisma.apiCatalog.update({
            where: { id: api.id },
            data: { logoUrl: logoUrl }
          });
          
          console.log(`  ✅ ${apiName}: ${logoUrl}`);
          successCount++;
        } else {
          console.log(`  ❌ ${apiName}: API not found in database`);
          failCount++;
        }
      } catch (error) {
        console.log(`  ❌ ${apiName}: ${error.message}`);
        failCount++;
      }
    }
    
    console.log(`\n🎉 Logo fix completed!`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Failed: ${failCount}`);
    console.log(`   - Total: ${Object.keys(logoMappings).length}`);
    
    // Verify the fixes
    console.log('\n🔍 Verifying fixed logos...');
    const fixedApis = await prisma.apiCatalog.findMany({
      where: {
        name: { in: Object.keys(logoMappings) },
        logoUrl: { not: null }
      },
      select: { name: true, logoUrl: true }
    });
    
    console.log(`\n📸 Fixed APIs with logos:`);
    fixedApis.forEach(api => {
      console.log(`   - ${api.name}: ${api.logoUrl}`);
    });

  } catch (error) {
    console.error('❌ Error fixing missing logos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixMissingLogos()
    .then(() => {
      console.log('✅ Missing logos fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Missing logos fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMissingLogos };
