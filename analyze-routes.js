#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Scan all route files
const apiDir = '/Users/mac/Source-Code/rentalshop-nextjs/apps/api/app/api';

function scanRoutes(dir, routes = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanRoutes(fullPath, routes);
    } else if (item === 'route.ts') {
      const relativePath = fullPath.replace(apiDir, '').replace('/route.ts', '');
      routes.push(relativePath);
    }
  }
  
  return routes;
}

function analyzeRoute(routePath) {
  const fullPath = path.join(apiDir, routePath, 'route.ts');
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').length;
    
    // Check for auth patterns
    const hasOldAuth = content.includes('authenticateRequest') || 
                      content.includes('withUserManagementAuth') ||
                      content.includes('assertAnyRole');
    
    const hasNewAuth = content.includes('withAuth') && 
                       content.includes('@rentalshop/auth/src/unified-auth');
    
    // Check complexity
    const isComplex = lines > 200;
    const isSimple = lines < 100;
    
    // Categorize by type
    let category = 'other';
    if (routePath.includes('/analytics/')) category = 'analytics';
    else if (routePath.includes('/auth/') || routePath.includes('/login/')) category = 'auth';
    else if (routePath.includes('/admin/')) category = 'admin';
    else if (routePath.includes('/mobile/')) category = 'mobile';
    else if (routePath.includes('/export/') || routePath.includes('/reports/')) category = 'export';
    else if (routePath.includes('/health/') || routePath.includes('/cron/')) category = 'system';
    else if (['users', 'customers', 'products', 'orders', 'outlets'].some(r => routePath.includes(`/${r}`))) {
      category = 'migrated';
    } else {
      category = 'core';
    }
    
    return {
      path: routePath,
      lines,
      hasOldAuth,
      hasNewAuth,
      isComplex,
      isSimple,
      category,
      migrationStatus: hasNewAuth ? 'migrated' : (hasOldAuth ? 'needs-migration' : 'unknown')
    };
  } catch (error) {
    return {
      path: routePath,
      lines: 0,
      hasOldAuth: false,
      hasNewAuth: false,
      isComplex: false,
      isSimple: true,
      category: 'error',
      migrationStatus: 'error',
      error: error.message
    };
  }
}

// Main analysis
const routes = scanRoutes(apiDir);
console.log(`Found ${routes.length} routes`);

const analysis = routes.map(analyzeRoute);

// Generate summary
const summary = {
  total: analysis.length,
  byCategory: {},
  byMigrationStatus: {},
  byComplexity: {
    simple: analysis.filter(r => r.isSimple).length,
    medium: analysis.filter(r => !r.isSimple && !r.isComplex).length,
    complex: analysis.filter(r => r.isComplex).length
  }
};

// Count by category
analysis.forEach(route => {
  summary.byCategory[route.category] = (summary.byCategory[route.category] || 0) + 1;
  summary.byMigrationStatus[route.migrationStatus] = (summary.byMigrationStatus[route.migrationStatus] || 0) + 1;
});

console.log('\n📊 ROUTE ANALYSIS SUMMARY:');
console.log('='.repeat(50));
console.log(`Total routes: ${summary.total}`);

console.log('\n📂 By Category:');
Object.entries(summary.byCategory)
  .sort(([,a], [,b]) => b - a)
  .forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

console.log('\n🔄 By Migration Status:');
Object.entries(summary.byMigrationStatus)
  .forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

console.log('\n📏 By Complexity:');
Object.entries(summary.byComplexity)
  .forEach(([complexity, count]) => {
    console.log(`  ${complexity}: ${count}`);
  });

console.log('\n🎯 HIGH PRIORITY for Phase 2 (core routes needing migration):');
const highPriority = analysis.filter(r => 
  r.category === 'core' && 
  r.migrationStatus === 'needs-migration' && 
  !r.isComplex
).slice(0, 10);

highPriority.forEach(route => {
  console.log(`  ${route.path} (${route.lines} lines)`);
});

console.log('\n📝 BATCH MIGRATION CANDIDATES (simple routes):');
const batchCandidates = analysis.filter(r => 
  r.migrationStatus === 'needs-migration' && 
  r.isSimple &&
  !['system', 'error'].includes(r.category)
).slice(0, 15);

batchCandidates.forEach(route => {
  console.log(`  ${route.path} (${route.lines} lines, ${route.category})`);
});

// Export detailed data for further analysis
const outputFile = '/Users/mac/Source-Code/rentalshop-nextjs/route-analysis.json';
fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
console.log(`\n💾 Detailed analysis saved to: route-analysis.json`);