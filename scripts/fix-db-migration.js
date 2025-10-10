#!/usr/bin/env node

/**
 * Fix DB Migration Script
 * 
 * This script fixes the incorrect migration from prisma to db methods
 * by mapping to the correct simplified API methods.
 */

const fs = require('fs');
const path = require('path');

const API_DIR = '/Users/mac/Source-Code/rentalshop-nextjs/apps/api/app/api';

// Method mappings for each entity
const METHOD_MAPPINGS = {
  merchant: {
    'findUnique': 'findById',
    'findMany': 'search', 
    'create': 'create',
    'update': 'update',
    'delete': 'remove',
    'count': 'getStats'
  },
  outlet: {
    'findUnique': 'findById',
    'findMany': 'search',
    'create': 'create', 
    'update': 'update',
    'delete': 'remove',
    'count': 'getStats'
  },
  product: {
    'findUnique': 'findById',
    'findMany': 'search',
    'create': 'create',
    'update': 'update', 
    'delete': 'remove',
    'count': 'getStats'
  },
  order: {
    'findUnique': 'findById',
    'findMany': 'search',
    'create': 'create',
    'update': 'update',
    'delete': 'remove', 
    'count': 'getStats'
  },
  customer: {
    'findUnique': 'findById',
    'findMany': 'search',
    'create': 'create',
    'update': 'update',
    'delete': 'remove',
    'count': 'getStats'
  },
  user: {
    'findUnique': 'findById',
    'findMany': 'search',
    'create': 'create',
    'update': 'update',
    'delete': 'remove',
    'count': 'getStats'
  },
  category: {
    'findUnique': 'findById',
    'findMany': 'search',
    'create': 'create',
    'update': 'update',
    'delete': 'remove',
    'count': 'getStats'
  },
  plan: {
    'findUnique': 'findById',
    'findMany': 'search',
    'create': 'create',
    'update': 'update',
    'delete': 'remove',
    'count': 'getStats'
  }
};

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

function fixFile(filePath) {
  console.log(`🔧 Fixing: ${path.relative(API_DIR, filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // Fix method mappings for each entity
  for (const [entity, mappings] of Object.entries(METHOD_MAPPINGS)) {
    for (const [oldMethod, newMethod] of Object.entries(mappings)) {
      // Pattern: db.entity.oldMethod(
      const pattern = new RegExp(`db\\.${entity}s\\.${oldMethod}\\(`, 'g');
      const replacement = `db.${entity}s.${newMethod}(`;
      
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
        console.log(`  ✅ Fixed: db.${entity}s.${oldMethod} → db.${entity}s.${newMethod}`);
      }
    }
  }
  
  // Special fixes for method signatures
  // Fix findById calls that need ID parameter adjustment
  content = content.replace(
    /db\.(\w+)s\.findById\(\s*{\s*id:\s*(\w+)\s*}\s*\)/g,
    'db.$1s.findById($2)'
  );
  
  // Fix update calls that need ID parameter adjustment  
  content = content.replace(
    /db\.(\w+)s\.update\(\s*{\s*id:\s*(\w+)\s*},\s*{\s*data:\s*({[^}]+})\s*}\s*\)/g,
    'db.$1s.update($2, $3)'
  );
  
  // Fix create calls
  content = content.replace(
    /db\.(\w+)s\.create\(\s*{\s*data:\s*({[^}]+})\s*}\s*\)/g,
    'db.$1s.create($2)'
  );
  
  // Fix remove calls
  content = content.replace(
    /db\.(\w+)s\.remove\(\s*{\s*id:\s*(\w+)\s*}\s*\)/g,
    'db.$1s.remove($2)'
  );
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${path.relative(API_DIR, filePath)}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed: ${path.relative(API_DIR, filePath)}`);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing DB Migration Issues');
  console.log('=' .repeat(50));
  
  const apiFiles = getAllApiFiles(API_DIR);
  console.log(`📁 Found ${apiFiles.length} API route files`);
  
  let fixedCount = 0;
  
  for (const file of apiFiles) {
    if (fixFile(file)) {
      fixedCount++;
    }
  }
  
  console.log('=' .repeat(50));
  console.log(`✅ Fix completed!`);
  console.log(`📊 Results:`);
  console.log(`   - Fixed: ${fixedCount} files`);
  console.log(`   - Total: ${apiFiles.length} files`);
  
  if (fixedCount > 0) {
    console.log(`\n🔧 Next steps:`);
    console.log(`   1. Test APIs: curl http://localhost:3001/api/merchants/1`);
    console.log(`   2. Check pricing API: curl http://localhost:3001/api/merchants/1/pricing`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, fixFile };
