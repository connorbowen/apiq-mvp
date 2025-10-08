#!/usr/bin/env node

/**
 * Script to update API logos using Clearbit service
 * Usage: node scripts/update-api-logos.js [api-name]
 * If no API name provided, updates all APIs
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

// Import the logo service utility
const { autoFetchLogo } = require('../src/lib/utils/logoService.js');

// Function to update logo for a single API
async function updateApiLogo(api) {
  try {
    const logoUrl = await autoFetchLogo(api.baseUrl, api.logoUrl);
    
    if (logoUrl) {
      await prisma.apiCatalog.update({
        where: { id: api.id },
        data: { logoUrl }
      });
      console.log(`✅ Updated ${api.name} logo: ${logoUrl}`);
      return true;
    } else {
      console.log(`❌ No logo found for ${api.name}: ${api.baseUrl}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error updating ${api.name}: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  const apiName = process.argv[2];
  
  try {
    let apis;
    
    if (apiName) {
      // Update specific API
      apis = await prisma.apiCatalog.findMany({
        where: {
          name: {
            contains: apiName,
            mode: 'insensitive'
          }
        }
      });
      
      if (apis.length === 0) {
        console.log(`❌ No API found with name containing: ${apiName}`);
        return;
      }
    } else {
      // Update all APIs
      apis = await prisma.apiCatalog.findMany({
        where: { status: 'ACTIVE' }
      });
    }

    console.log(`🔄 Updating logos for ${apis.length} API(s)...`);
    
    let successCount = 0;
    let failCount = 0;

    for (const api of apis) {
      const success = await updateApiLogo(api);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Results:`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Failed to update: ${failCount}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
