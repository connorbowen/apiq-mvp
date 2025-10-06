#!/usr/bin/env node

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function checkCatalog() {
  try {
    console.log('🔍 Checking API catalog data...');
    
    // Check catalog entries
    const catalogCount = await prisma.apiCatalog.count();
    console.log(`📊 Total catalog entries: ${catalogCount}`);
    
    if (catalogCount > 0) {
      const catalogs = await prisma.apiCatalog.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
          popularity: true
        },
        take: 5
      });
      
      console.log('📋 Sample catalog entries:');
      catalogs.forEach(api => {
        console.log(`  - ${api.name} (${api.category}) - Status: ${api.status}, Popularity: ${api.popularity}`);
      });
    }
    
    // Check categories
    const categoryCount = await prisma.catalogCategory.count();
    console.log(`📁 Total categories: ${categoryCount}`);
    
    if (categoryCount > 0) {
      const categories = await prisma.catalogCategory.findMany({
        select: {
          name: true,
          description: true,
          isActive: true
        }
      });
      
      console.log('📂 Categories:');
      categories.forEach(cat => {
        console.log(`  - ${cat.name}: ${cat.description} (Active: ${cat.isActive})`);
      });
    }
    
    // Check endpoints
    const endpointCount = await prisma.catalogEndpoint.count();
    console.log(`🔗 Total catalog endpoints: ${endpointCount}`);
    
  } catch (error) {
    console.error('❌ Error checking catalog:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCatalog();
