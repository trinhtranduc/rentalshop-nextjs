#!/usr/bin/env node

/**
 * Verify Setup Script
 * Checks if all components are properly configured and working
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️ `,
    info: `${colors.blue}ℹ️ `,
  }[type];
  console.log(`${prefix} ${message}${colors.reset}`);
}

let allPassed = true;

console.log(`${colors.blue}🔍 Verifying Multi-Tenant Demo Setup...${colors.reset}\n`);

// 1. Check directory structure
log('Checking directory structure...', 'info');
const requiredDirs = [
  'apps/api',
  'apps/admin',
  'apps/client',
  'packages/demo-shared',
  'prisma',
  'scripts',
];
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    log(`Directory exists: ${dir}`, 'success');
  } else {
    log(`Directory missing: ${dir}`, 'error');
    allPassed = false;
  }
});

// 2. Check required files
log('\nChecking required files...', 'info');
const requiredFiles = [
  'package.json',
  'turbo.json',
  'tsconfig.json',
  'prisma/schema.prisma',
  'prisma/main/schema.prisma',
  'scripts/setup-main-db.js',
  'apps/api/middleware.ts',
  'apps/client/middleware.ts',
  'apps/admin/app/page.tsx',
  'packages/demo-shared/src/main-db.ts',
  'packages/demo-shared/src/tenant-db.ts',
];
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    log(`File exists: ${file}`, 'success');
  } else {
    log(`File missing: ${file}`, 'error');
    allPassed = false;
  }
});

// 3. Check .env.local
log('\nChecking environment configuration...', 'info');
if (fs.existsSync('.env.local')) {
  log('✅ .env.local exists', 'success');
  
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const requiredVars = ['MAIN_DATABASE_URL', 'DATABASE_URL', 'NEXT_PUBLIC_ROOT_DOMAIN'];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      log(`✅ ${varName} is defined`, 'success');
    } else {
      log(`❌ ${varName} is missing`, 'error');
      allPassed = false;
    }
  });
} else {
  log('.env.local not found - create it before setup', 'error');
  allPassed = false;
}

// 4. Check Prisma schema configuration
log('\nChecking Prisma configuration...', 'info');
const tenantSchema = fs.readFileSync('prisma/schema.prisma', 'utf-8');
if (tenantSchema.includes('generator client')) {
  log('✅ Tenant schema has generator (CORRECT)', 'success');
} else {
  log('❌ Tenant schema missing generator', 'error');
  allPassed = false;
}

const mainSchema = fs.readFileSync('prisma/main/schema.prisma', 'utf-8');
if (!mainSchema.includes('generator client')) {
  log('✅ Main schema has NO generator (CORRECT - Raw SQL only)', 'success');
} else {
  log('❌ Main schema should NOT have generator', 'error');
  allPassed = false;
}

// 5. Check node_modules
log('\nChecking dependencies...', 'info');
if (fs.existsSync('node_modules')) {
  log('✅ node_modules exists', 'success');
  
  const requiredPackages = ['@prisma/client', 'pg', 'dotenv'];
  requiredPackages.forEach(pkg => {
    if (fs.existsSync(`node_modules/${pkg}`)) {
      log(`✅ Package installed: ${pkg}`, 'success');
    } else {
      log(`❌ Package missing: ${pkg} - run 'yarn install'`, 'error');
      allPassed = false;
    }
  });
} else {
  log('❌ node_modules not found - run "yarn install"', 'error');
  allPassed = false;
}

// 6. Check Prisma client generation
log('\nChecking Prisma client...', 'info');
if (fs.existsSync('node_modules/.prisma/client')) {
  log('✅ Prisma client generated', 'success');
} else {
  log('⚠️  Prisma client not generated - run "yarn db:generate"', 'warning');
}

// 7. Check Main DB connection (if possible)
log('\nChecking Main Database connection...', 'info');
if (fs.existsSync('.env.local')) {
  try {
    // Load env
    require('dotenv').config({ path: '.env.local' });
    
    if (process.env.MAIN_DATABASE_URL) {
      log('✅ MAIN_DATABASE_URL is set', 'success');
      
      // Try to parse URL
      try {
        const url = new URL(process.env.MAIN_DATABASE_URL);
        log(`✅ Connection string valid (host: ${url.hostname})`, 'success');
      } catch (e) {
        log('❌ Invalid MAIN_DATABASE_URL format', 'error');
        allPassed = false;
      }
    } else {
      log('❌ MAIN_DATABASE_URL not found in .env.local', 'error');
      allPassed = false;
    }
  } catch (e) {
    log('⚠️  Could not check database connection', 'warning');
  }
}

// 8. Check app package.json files
log('\nChecking app configurations...', 'info');
const apps = ['api', 'admin', 'client'];
apps.forEach(app => {
  const packageJson = path.join('apps', app, 'package.json');
  if (fs.existsSync(packageJson)) {
    log(`✅ ${app}/package.json exists`, 'success');
  } else {
    log(`❌ ${app}/package.json missing`, 'error');
    allPassed = false;
  }
});

// Summary
console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
if (allPassed) {
  log('\n🎉 Setup verification PASSED!', 'success');
  log('\nNext steps:', 'info');
  log('1. Run: yarn setup (if not already done)', 'info');
  log('2. Start API server: cd apps/api && yarn dev', 'info');
  log('3. Start Admin app: cd apps/admin && yarn dev', 'info');
  log('4. Start Client app: cd apps/client && yarn dev', 'info');
  log('5. Visit: http://localhost:3000 to create your first tenant', 'info');
} else {
  log('\n⚠️  Setup verification found issues', 'warning');
  log('Please fix the errors above before proceeding', 'warning');
}
console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);

process.exit(allPassed ? 0 : 1);
