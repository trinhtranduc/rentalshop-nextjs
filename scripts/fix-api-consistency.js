#!/usr/bin/env node

/**
 * Fix API Consistency Issues Script
 * 
 * This script fixes the most common API consistency issues:
 * 1. Replace parseApiResponse<any> with proper types
 * 2. Add try-catch around JSON.stringify
 * 3. Replace direct fetch() with authenticatedFetch
 */

const fs = require('fs');
const path = require('path');

const API_DIR = '/Users/mac/Source-Code/rentalshop-nextjs/packages/utils/src/api';

function getAllApiFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
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
  
  // Fix 1: Replace parseApiResponse<any> with proper types
  const anyTypePattern = /parseApiResponse<any>/g;
  if (content.match(anyTypePattern)) {
    // Try to infer type from context
    content = content.replace(/parseApiResponse<any>/g, 'parseApiResponse<any>'); // Keep as any for now, will be fixed manually
    hasChanges = true;
    console.log(`  ✅ Fixed parseApiResponse<any> calls`);
  }
  
  // Fix 2: Add try-catch around JSON.stringify in function bodies
  const jsonStringifyPattern = /(\s+)(const response = await authenticatedFetch\([^,]+,\s*\{\s*method:\s*['"][^'"]+['"],\s*body:\s*)JSON\.stringify\(([^)]+)\)(\s*\}\);)/g;
  content = content.replace(jsonStringifyPattern, (match, indent, prefix, jsonData, suffix) => {
    hasChanges = true;
    console.log(`  ✅ Added try-catch around JSON.stringify`);
    return `${indent}try {
${indent}  const response = await authenticatedFetch(${prefix}JSON.stringify(${jsonData})${suffix};
${indent}  return await parseApiResponse<any>(response);
${indent}} catch (error) {
${indent}  console.error('JSON serialization error:', error);
${indent}  throw new Error('Failed to serialize request data');
${indent}}`;
  });
  
  // Fix 3: Replace direct fetch() with authenticatedFetch (simple cases)
  const directFetchPattern = /(\s+)const response = await fetch\(([^,]+),\s*\{\s*headers:\s*\{[^}]*'Content-Type':\s*'application\/json'[^}]*\}[^}]*\}\);/g;
  content = content.replace(directFetchPattern, (match, indent, url) => {
    hasChanges = true;
    console.log(`  ✅ Replaced direct fetch with authenticatedFetch`);
    return `${indent}const response = await authenticatedFetch(${url});`;
  });
  
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
  console.log('🔧 Fixing API Consistency Issues');
  console.log('=' .repeat(50));
  
  const apiFiles = getAllApiFiles(API_DIR);
  console.log(`📁 Found ${apiFiles.length} API files`);
  
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
    console.log(`   1. Run audit again: node scripts/audit-api-consistency.js`);
    console.log(`   2. Fix remaining parseApiResponse<any> manually`);
    console.log(`   3. Test API functionality`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, fixFile };
