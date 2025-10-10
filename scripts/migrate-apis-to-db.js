#!/usr/bin/env node

/**
 * API Migration Script: Prisma → DB Abstraction Layer
 * 
 * This script migrates all API routes from direct prisma usage to db abstraction layer
 * for better consistency, security, and maintainability.
 */

const fs = require('fs');
const path = require('path');

const API_DIR = '/Users/mac/Source-Code/rentalshop-nextjs/apps/api/app/api';

// Files that should use prisma directly (health checks, system routes)
const PRISMA_ALLOWED_FILES = [
  'health/database/route.ts',
  'system/health/route.ts',
  'system/integrity/route.ts'
];

// Migration patterns
const MIGRATION_PATTERNS = [
  // Import changes
  {
    from: /import\s*{\s*prisma\s*}\s*from\s*['"]@rentalshop\/database['"];?/g,
    to: 'import { db } from \'@rentalshop/database\';'
  },
  {
    from: /import\s*{\s*db,\s*prisma\s*}\s*from\s*['"]@rentalshop\/database['"];?/g,
    to: 'import { db } from \'@rentalshop/database\';'
  },
  
  // Database operations - merchant
  {
    from: /prisma\.merchant\.findUnique\(/g,
    to: 'db.merchants.findById('
  },
  {
    from: /prisma\.merchant\.findMany\(/g,
    to: 'db.merchants.search('
  },
  {
    from: /prisma\.merchant\.create\(/g,
    to: 'db.merchants.create('
  },
  {
    from: /prisma\.merchant\.update\(/g,
    to: 'db.merchants.update('
  },
  {
    from: /prisma\.merchant\.delete\(/g,
    to: 'db.merchants.remove('
  },
  {
    from: /prisma\.merchant\.count\(/g,
    to: 'db.merchants.getStats('
  },
  {
    from: /prisma\.outlet\./g,
    to: 'db.outlets.'
  },
  {
    from: /prisma\.product\./g,
    to: 'db.products.'
  },
  {
    from: /prisma\.order\./g,
    to: 'db.orders.'
  },
  {
    from: /prisma\.customer\./g,
    to: 'db.customers.'
  },
  {
    from: /prisma\.user\./g,
    to: 'db.users.'
  },
  {
    from: /prisma\.category\./g,
    to: 'db.categories.'
  },
  {
    from: /prisma\.plan\./g,
    to: 'db.plans.'
  },
  {
    from: /prisma\.subscription\./g,
    to: 'db.subscriptions.'
  },
  {
    from: /prisma\.payment\./g,
    to: 'db.payments.'
  },
  
  // Special cases
  {
    from: /prisma\.\$transaction\(/g,
    to: 'db.transaction('
  },
  {
    from: /prisma\.\$connect\(\)/g,
    to: 'db.connect()'
  },
  {
    from: /prisma\.\$disconnect\(\)/g,
    to: 'db.disconnect()'
  }
];

function getAllApiFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name === 'route.ts') {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function shouldMigrateFile(filePath) {
  const relativePath = path.relative(API_DIR, filePath);
  return !PRISMA_ALLOWED_FILES.includes(relativePath);
}

function migrateFile(filePath) {
  console.log(`🔄 Migrating: ${path.relative(API_DIR, filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // Apply migration patterns
  for (const pattern of MIGRATION_PATTERNS) {
    const newContent = content.replace(pattern.from, pattern.to);
    if (newContent !== content) {
      content = newContent;
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Migrated: ${path.relative(API_DIR, filePath)}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed: ${path.relative(API_DIR, filePath)}`);
    return false;
  }
}

function main() {
  console.log('🚀 Starting API Migration: Prisma → DB Abstraction Layer');
  console.log('=' .repeat(60));
  
  const apiFiles = getAllApiFiles(API_DIR);
  console.log(`📁 Found ${apiFiles.length} API route files`);
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  for (const file of apiFiles) {
    if (shouldMigrateFile(file)) {
      if (migrateFile(file)) {
        migratedCount++;
      }
    } else {
      console.log(`⏭️  Skipping (prisma allowed): ${path.relative(API_DIR, file)}`);
      skippedCount++;
    }
  }
  
  console.log('=' .repeat(60));
  console.log(`✅ Migration completed!`);
  console.log(`📊 Results:`);
  console.log(`   - Migrated: ${migratedCount} files`);
  console.log(`   - Skipped: ${skippedCount} files`);
  console.log(`   - Total: ${apiFiles.length} files`);
  
  if (migratedCount > 0) {
    console.log(`\n🔧 Next steps:`);
    console.log(`   1. Run: yarn build:packages`);
    console.log(`   2. Test APIs: yarn dev:all`);
    console.log(`   3. Check for any remaining prisma usage`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, migrateFile, getAllApiFiles };
