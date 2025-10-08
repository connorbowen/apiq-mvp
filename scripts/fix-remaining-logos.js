#!/usr/bin/env node

/**
 * Script to fix the remaining broken logos
 * Run with: node scripts/fix-remaining-logos.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

// Fix the remaining broken logos with better domain mappings
const remainingFixes = {
  'Google Sheets API': 'https://logo.clearbit.com/google.com', // Use main Google logo
  'Google Maps API': 'https://logo.clearbit.com/google.com'    // Use main Google logo
};

async function fixRemainingLogos() {
  try {
    console.log('🔧 Fixing remaining broken logos...');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const [apiName, logoUrl] of Object.entries(remainingFixes)) {
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
    
    console.log(`\n🎉 Remaining logo fixes completed!`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Failed: ${failCount}`);
    console.log(`   - Total: ${Object.keys(remainingFixes).length}`);

  } catch (error) {
    console.error('❌ Error fixing remaining logos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixRemainingLogos()
    .then(() => {
      console.log('✅ Remaining logos fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Remaining logos fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixRemainingLogos };
