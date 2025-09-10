#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all API route files
const apiDir = path.join(__dirname, '../apps/api/app/api');
const routeFiles = [];

function findRouteFiles(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findRouteFiles(filePath);
    } else if (file === 'route.ts') {
      routeFiles.push(filePath);
    }
  }
}

findRouteFiles(apiDir);

console.log(`Found ${routeFiles.length} API route files`);

// Patterns to replace
const patterns = [
  {
    // Update import statements
    search: /import { verifyTokenSimple } from '@rentalshop\/auth';/g,
    replace: "import { authenticateRequest } from '@rentalshop/auth';"
  },
  {
    // Replace authentication blocks
    search: /\/\/ Verify authentication\s*const token = request\.headers\.get\('authorization'\)\?\.replace\('Bearer ', ''\);\s*if \(!token\) \{\s*return NextResponse\.json\(\s*\{ success: false, message: 'Access token required' \},\s*\{ status: 401 \}\s*\);\s*\}\s*const user = await verifyTokenSimple\(token\);\s*if \(!user\) \{\s*return NextResponse\.json\(\s*\{ success: false, message: 'Invalid token' \},\s*\{ status: 401 \}\s*\);\s*\}/gs,
    replace: `// Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;`
  }
];

let updatedFiles = 0;

for (const filePath of routeFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Check if file uses verifyTokenSimple
    if (content.includes('verifyTokenSimple')) {
      console.log(`Updating ${filePath}`);
      
      // Apply all patterns
      for (const pattern of patterns) {
        const newContent = content.replace(pattern.search, pattern.replace);
        if (newContent !== content) {
          content = newContent;
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        fs.writeFileSync(filePath, content);
        updatedFiles++;
        console.log(`✅ Updated ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

console.log(`\n🎉 Updated ${updatedFiles} files`);
console.log('\nNext steps:');
console.log('1. Run yarn lint to check for any issues');
console.log('2. Test the API endpoints to ensure they work correctly');
console.log('3. Remove any remaining unused imports');
