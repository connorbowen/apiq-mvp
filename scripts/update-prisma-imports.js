#!/usr/bin/env node

/**
 * Script to update all Prisma imports to use the shared client
 * This consolidates all Prisma client usage to follow best practices
 */

const fs = require('fs');
const path = require('path');

// Files that need to be updated
const filesToUpdate = [
  // API routes
  'pages/api/auth/validate-reset-token.ts',
  'pages/api/auth/register.ts',
  'pages/api/auth/reset-password.ts',
  'pages/api/auth/sso/google.ts',
  'pages/api/auth/forgot-password.ts',
  'pages/api/auth/resend-verification.ts',
  
  // Test files
  'tests/integration/api/workflows.integration.rate-limit.test.ts',
  'tests/integration/api/profile/profile.integration.test.ts',
  'tests/integration/api/auth/resend-verification.integration.test.ts',
  'tests/integration/api/auth/auth-flow.test.ts',
  'tests/unit/lib/workflow/executionStateManager.test.ts',
  'tests/e2e/workflow-engine/workflow-management.test.ts'
];

function updateFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let updated = false;
    
    // Update import from singletons/prisma to lib/database/client
    const oldImport = /import\s+\{\s*prisma\s*\}\s+from\s+['"]([^'"]*singletons\/prisma[^'"]*)['"]/g;
    const newImport = (match, importPath) => {
      // Calculate relative path to lib/database/client
      const relativePath = path.relative(path.dirname(fullPath), path.join(process.cwd(), 'lib/database/client'));
      const normalizedPath = relativePath.replace(/\\/g, '/'); // Ensure forward slashes
      updated = true;
      return `import { prisma } from '${normalizedPath.startsWith('.') ? normalizedPath : './' + normalizedPath}';`;
    };
    
    content = content.replace(oldImport, newImport);
    
    if (updated) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Updating Prisma imports to use shared client...\n');
  
  let updatedCount = 0;
  let totalCount = filesToUpdate.length;
  
  for (const file of filesToUpdate) {
    if (updateFile(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\n🎉 Update complete!`);
  console.log(`   Updated: ${updatedCount} files`);
  console.log(`   Total: ${totalCount} files`);
  
  if (updatedCount > 0) {
    console.log('\n💡 Next steps:');
    console.log('   1. Run tests to ensure everything works');
    console.log('   2. Remove src/lib/singletons/prisma.ts after confirming no issues');
    console.log('   3. Consider running npx prisma generate to ensure client is up to date');
  }
}

main().catch(console.error); 