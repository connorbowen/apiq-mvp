#!/usr/bin/env node

/**
 * Script to test logo display and generate HTML preview
 * Run with: node scripts/test-logos-display.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function testLogosDisplay() {
  try {
    console.log('🖼️  Testing logo display for APIs and providers...');
    
    // Get APIs with logos
    const apis = await prisma.apiCatalog.findMany({
      where: { 
        status: 'ACTIVE',
        logoUrl: { not: null }
      },
      include: {
        provider: true
      },
      take: 10
    });
    
    // Get providers with logos
    const providers = await prisma.apiProvider.findMany({
      where: { 
        isActive: true,
        logoUrl: { not: null }
      },
      take: 5
    });
    
    console.log(`\n📊 Found ${apis.length} APIs with logos`);
    console.log(`📊 Found ${providers.length} providers with logos`);
    
    // Generate HTML preview
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Catalog Logos Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .section { margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
        .logo { width: 64px; height: 64px; object-fit: contain; margin: 0 auto 10px; display: block; }
        .name { font-weight: bold; margin-bottom: 5px; }
        .description { font-size: 12px; color: #666; }
        .provider-badge { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-top: 5px; }
        h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖼️ API Catalog Logos Test</h1>
        
        <div class="section">
            <h2>🏢 API Providers (${providers.length})</h2>
            <div class="grid">
                ${providers.map(provider => `
                    <div class="card">
                        <img src="${provider.logoUrl}" alt="${provider.name} logo" class="logo" onerror="this.style.display='none'">
                        <div class="name">${provider.name}</div>
                        <div class="description">${provider.description || 'No description'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="section">
            <h2>🔌 API Catalog Entries (${apis.length})</h2>
            <div class="grid">
                ${apis.map(api => `
                    <div class="card">
                        <img src="${api.logoUrl}" alt="${api.name} logo" class="logo" onerror="this.style.display='none'">
                        <div class="name">${api.name}</div>
                        <div class="description">${api.description || 'No description'}</div>
                        ${api.provider ? `<div class="provider-badge">Part of ${api.provider.name}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="section">
            <h2>📊 Summary</h2>
            <p><strong>Total APIs with logos:</strong> ${apis.length}</p>
            <p><strong>Total Providers with logos:</strong> ${providers.length}</p>
            <p><strong>Total Logos:</strong> ${apis.length + providers.length}</p>
            <p><em>Note: If logos don't appear, they may be blocked by CORS or the Clearbit service may be down.</em></p>
        </div>
    </div>
</body>
</html>`;
    
    // Write HTML file
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '..', 'logo-test.html');
    fs.writeFileSync(outputPath, html);
    
    console.log(`\n✅ HTML preview generated: ${outputPath}`);
    console.log(`🌐 Open the file in your browser to see the logos`);
    
    // Show some sample logos
    console.log(`\n📸 Sample API Logos:`);
    apis.slice(0, 5).forEach(api => {
      console.log(`   - ${api.name}: ${api.logoUrl}`);
    });
    
    console.log(`\n📸 Sample Provider Logos:`);
    providers.slice(0, 3).forEach(provider => {
      console.log(`   - ${provider.name}: ${provider.logoUrl}`);
    });

  } catch (error) {
    console.error('❌ Error testing logo display:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testLogosDisplay()
    .then(() => {
      console.log('✅ Logo display test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Logo display test failed:', error);
      process.exit(1);
    });
}

module.exports = { testLogosDisplay };
