#!/usr/bin/env node

/**
 * Migration script to update API routes to use @rentalshop/auth/server
 * for server-only functions instead of @rentalshop/auth
 * 
 * This follows the official Next.js pattern for separating client and server code.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Server-only functions that must be imported from /server
const SERVER_ONLY_FUNCTIONS = [
  'withPermissions',
  'withAuthRoles',
  'withAnyAuth',
  'withReadOnlyAuth',
  'hashPassword',
  'comparePassword',
  'verifyTokenSimple',
  'generateToken',
  'getUserPermissions',
  'validateMerchantAccess',
  'hasPermission', // If it uses database
  'authenticateRequest',
  'getUserScope',
  'canAccessResource',
  'canAccessResourceSync',
  'canCreateOrders',
  'canViewOrders',
  'canUpdateOrders',
  'canDeleteOrders',
  'canManageOrders',
  'canExportOrders',
  'canExportProducts',
  'canExportCustomers',
  'createAuthError',
  'createScopeError',
  'createPermissionError'
];

// Client-safe exports that stay in main import
const CLIENT_SAFE_EXPORTS = [
  'ROLE_PERMISSIONS',
  'Permission',
  'Role',
  'AuthUser',
  'LoginCredentials',
  'RegisterData'
];

/**
 * Check if an import statement contains server-only functions
 */
function hasServerOnlyFunctions(importStatement) {
  const importMatch = importStatement.match(/import\s+{([^}]+)}\s+from\s+['"]@rentalshop\/auth['"]/);
  if (!importMatch) return false;
  
  const imports = importMatch[1].split(',').map(s => s.trim().split(' as ')[0]);
  return imports.some(imp => SERVER_ONLY_FUNCTIONS.includes(imp));
}

/**
 * Check if an import statement contains only client-safe exports
 */
function hasOnlyClientSafeExports(importStatement) {
  const importMatch = importStatement.match(/import\s+{([^}]+)}\s+from\s+['"]@rentalshop\/auth['"]/);
  if (!importMatch) return false;
  
  const imports = importMatch[1].split(',').map(s => s.trim().split(' as ')[0]);
  return imports.every(imp => CLIENT_SAFE_EXPORTS.includes(imp));
}

/**
 * Update import statement to use /server for server-only functions
 */
function updateImportStatement(content, importStatement) {
  const importMatch = importStatement.match(/import\s+{([^}]+)}\s+from\s+['"]@rentalshop\/auth['"]/);
  if (!importMatch) return content;
  
  const imports = importMatch[1].split(',').map(s => s.trim());
  const serverOnlyImports = [];
  const clientSafeImports = [];
  
  imports.forEach(imp => {
    const name = imp.split(' as ')[0].trim();
    if (SERVER_ONLY_FUNCTIONS.includes(name)) {
      serverOnlyImports.push(imp);
    } else {
      clientSafeImports.push(imp);
    }
  });
  
  let newContent = content;
  let hasChanges = false;
  
  // If there are server-only imports, create a new import from /server
  if (serverOnlyImports.length > 0) {
    const serverImport = `import { ${serverOnlyImports.join(', ')} } from '@rentalshop/auth/server';`;
    
    // Replace the original import
    if (clientSafeImports.length > 0) {
      // Keep client-safe imports in main import
      const clientImport = `import { ${clientSafeImports.join(', ')} } from '@rentalshop/auth';`;
      newContent = newContent.replace(importStatement, `${clientImport}\n${serverImport}`);
    } else {
      // Replace entirely with server import
      newContent = newContent.replace(importStatement, serverImport);
    }
    hasChanges = true;
  }
  
  return { content: newContent, hasChanges };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let newContent = content;
  let hasChanges = false;
  
  // Find all import statements from @rentalshop/auth
  const importRegex = /import\s+.*from\s+['"]@rentalshop\/auth['"];?/g;
  const matches = content.match(importRegex);
  
  if (!matches) return { hasChanges: false, content: newContent };
  
  matches.forEach(match => {
    // Skip if already using /server
    if (match.includes('/server')) return;
    
    // Skip if only client-safe exports
    if (hasOnlyClientSafeExports(match)) return;
    
    // Update if contains server-only functions
    if (hasServerOnlyFunctions(match)) {
      const result = updateImportStatement(newContent, match);
      newContent = result.content;
      hasChanges = result.hasChanges || hasChanges;
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Updated: ${filePath}`);
  }
  
  return { hasChanges, content: newContent };
}

/**
 * Find all API route files
 */
function findApiRouteFiles(dir) {
  const files = [];
  
  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

/**
 * Main function
 */
function main() {
  const apiDir = path.join(__dirname, '../apps/api/app/api');
  
  if (!fs.existsSync(apiDir)) {
    console.error(`Error: API directory not found: ${apiDir}`);
    process.exit(1);
  }
  
  console.log('🔍 Finding API route files...');
  const files = findApiRouteFiles(apiDir);
  console.log(`Found ${files.length} files to check\n`);
  
  let updatedCount = 0;
  
  files.forEach(file => {
    const result = processFile(file);
    if (result.hasChanges) {
      updatedCount++;
    }
  });
  
  console.log(`\n✅ Migration complete! Updated ${updatedCount} files.`);
  
  if (updatedCount > 0) {
    console.log('\n⚠️  Please review the changes and test the API routes.');
    console.log('Some imports may need manual adjustment.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, hasServerOnlyFunctions, updateImportStatement };
