#!/usr/bin/env node

/**
 * Fix Method Signatures Script
 * 
 * This script fixes incorrect method signatures after migration from prisma to db
 */

const fs = require('fs');
const path = require('path');

const API_DIR = '/Users/mac/Source-Code/rentalshop-nextjs/apps/api/app/api';

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

function fixMethodSignatures(filePath) {
  console.log(`🔧 Fixing signatures: ${path.relative(API_DIR, filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // Fix findById calls with where objects
  const findByIdPatterns = [
    // db.merchants.findById({ where: { email: value } }) → db.merchants.findByEmail(value)
    {
      from: /db\.merchants\.findById\(\s*{\s*where:\s*{\s*email:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.merchants.findByEmail($1)'
    },
    // db.merchants.findById({ where: { id: value } }) → db.merchants.findById(value)
    {
      from: /db\.merchants\.findById\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.merchants.findById($1)'
    },
    // Similar patterns for other entities
    {
      from: /db\.outlets\.findById\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.outlets.findById($1)'
    },
    {
      from: /db\.products\.findById\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.products.findById($1)'
    },
    {
      from: /db\.orders\.findById\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.orders.findById($1)'
    },
    {
      from: /db\.customers\.findById\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.customers.findById($1)'
    },
    {
      from: /db\.users\.findById\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.users.findById($1)'
    }
  ];
  
  for (const pattern of findByIdPatterns) {
    const newContent = content.replace(pattern.from, pattern.to);
    if (newContent !== content) {
      content = newContent;
      hasChanges = true;
      console.log(`  ✅ Fixed findById signature`);
    }
  }
  
  // Fix update calls with where objects
  const updatePatterns = [
    // db.merchants.update({ where: { id: value }, data: data }) → db.merchants.update(value, data)
    {
      from: /db\.merchants\.update\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*},\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.merchants.update($1, $2)'
    },
    {
      from: /db\.outlets\.update\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*},\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.outlets.update($1, $2)'
    },
    {
      from: /db\.products\.update\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*},\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.products.update($1, $2)'
    },
    {
      from: /db\.orders\.update\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*},\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.orders.update($1, $2)'
    },
    {
      from: /db\.customers\.update\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*},\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.customers.update($1, $2)'
    },
    {
      from: /db\.users\.update\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*},\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.users.update($1, $2)'
    }
  ];
  
  for (const pattern of updatePatterns) {
    const newContent = content.replace(pattern.from, pattern.to);
    if (newContent !== content) {
      content = newContent;
      hasChanges = true;
      console.log(`  ✅ Fixed update signature`);
    }
  }
  
  // Fix create calls
  const createPatterns = [
    {
      from: /db\.merchants\.create\(\s*{\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.merchants.create($1)'
    },
    {
      from: /db\.outlets\.create\(\s*{\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.outlets.create($1)'
    },
    {
      from: /db\.products\.create\(\s*{\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.products.create($1)'
    },
    {
      from: /db\.orders\.create\(\s*{\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.orders.create($1)'
    },
    {
      from: /db\.customers\.create\(\s*{\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.customers.create($1)'
    },
    {
      from: /db\.users\.create\(\s*{\s*data:\s*([^}]+)\s*}\s*\)/g,
      to: 'db.users.create($1)'
    }
  ];
  
  for (const pattern of createPatterns) {
    const newContent = content.replace(pattern.from, pattern.to);
    if (newContent !== content) {
      content = newContent;
      hasChanges = true;
      console.log(`  ✅ Fixed create signature`);
    }
  }
  
  // Fix remove calls
  const removePatterns = [
    {
      from: /db\.merchants\.remove\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.merchants.remove($1)'
    },
    {
      from: /db\.outlets\.remove\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.outlets.remove($1)'
    },
    {
      from: /db\.products\.remove\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.products.remove($1)'
    },
    {
      from: /db\.orders\.remove\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.orders.remove($1)'
    },
    {
      from: /db\.customers\.remove\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.customers.remove($1)'
    },
    {
      from: /db\.users\.remove\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*\)/g,
      to: 'db.users.remove($1)'
    }
  ];
  
  for (const pattern of removePatterns) {
    const newContent = content.replace(pattern.from, pattern.to);
    if (newContent !== content) {
      content = newContent;
      hasChanges = true;
      console.log(`  ✅ Fixed remove signature`);
    }
  }
  
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
  console.log('🔧 Fixing Method Signatures');
  console.log('=' .repeat(50));
  
  const apiFiles = getAllApiFiles(API_DIR);
  console.log(`📁 Found ${apiFiles.length} API route files`);
  
  let fixedCount = 0;
  
  for (const file of apiFiles) {
    if (fixMethodSignatures(file)) {
      fixedCount++;
    }
  }
  
  console.log('=' .repeat(50));
  console.log(`✅ Signature fix completed!`);
  console.log(`📊 Results:`);
  console.log(`   - Fixed: ${fixedCount} files`);
  console.log(`   - Total: ${apiFiles.length} files`);
}

if (require.main === module) {
  main();
}
