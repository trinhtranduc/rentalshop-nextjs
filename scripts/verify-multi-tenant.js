#!/usr/bin/env node

/**
 * Verify Multi-Tenant Setup
 * 
 * Comprehensive verification script that checks:
 * - Environment variables
 * - Main database connection and tables
 * - Tenant database template
 * - Subdomain utilities
 * - Registration flow simulation
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function verifyEnvironmentVariables() {
  logSection('1. Environment Variables');
  
  const required = {
    'MAIN_DATABASE_URL': 'Main Database (Multi-tenant metadata)',
    'DATABASE_URL': 'Tenant Database Template',
    'NEXT_PUBLIC_ROOT_DOMAIN': 'Root Domain (Subdomain routing)'
  };
  
  let allValid = true;
  
  for (const [key, description] of Object.entries(required)) {
    const value = process.env[key];
    
    if (!value) {
      log(`  ❌ ${key}: MISSING - ${description}`, 'red');
      allValid = false;
    } else if (key.includes('DATABASE_URL')) {
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        log(`  ❌ ${key}: INVALID FORMAT`, 'red');
        allValid = false;
      } else {
        const masked = value.replace(/:[^:@]+@/, ':***@');
        log(`  ✅ ${key}: SET - ${masked}`, 'green');
      }
    } else {
      log(`  ✅ ${key}: SET - ${value}`, 'green');
    }
  }
  
  return allValid;
}

async function verifyMainDatabase() {
  logSection('2. Main Database');
  
  const mainDbUrl = process.env.MAIN_DATABASE_URL;
  
  if (!mainDbUrl) {
    log('  ❌ MAIN_DATABASE_URL not set', 'red');
    return false;
  }
  
  try {
    const client = new Client({ connectionString: mainDbUrl });
    await client.connect();
    log('  ✅ Connected to Main DB', 'green');
    
    // Check for Plan table
    const planCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Plan'
      );
    `);
    
    if (planCheck.rows[0].exists) {
      log('  ✅ Plan table exists', 'green');
      
      // Count plans
      const planCount = await client.query('SELECT COUNT(*) FROM "Plan"');
      log(`  📊 Plans in database: ${planCount.rows[0].count}`, 'blue');
    } else {
      log('  ❌ Plan table not found - Run: yarn db:setup-main', 'red');
    }
    
    // Check for Tenant table
    const tenantCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Tenant'
      );
    `);
    
    if (tenantCheck.rows[0].exists) {
      log('  ✅ Tenant table exists', 'green');
      
      // Count tenants
      const tenantCount = await client.query('SELECT COUNT(*) FROM "Tenant"');
      log(`  📊 Tenants in database: ${tenantCount.rows[0].count}`, 'blue');
      
      // List tenants if any
      if (parseInt(tenantCount.rows[0].count) > 0) {
        const tenants = await client.query('SELECT subdomain, name, status FROM "Tenant" LIMIT 5');
        tenants.rows.forEach((tenant, idx) => {
          log(`     ${idx + 1}. ${tenant.subdomain} - ${tenant.name} (${tenant.status})`, 'blue');
        });
      }
    } else {
      log('  ❌ Tenant table not found - Run: yarn db:setup-main', 'red');
    }
    
    await client.end();
    return planCheck.rows[0].exists && tenantCheck.rows[0].exists;
    
  } catch (error) {
    log(`  ❌ Connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function verifyTenantDatabaseTemplate() {
  logSection('3. Tenant Database Template');
  
  const tenantDbUrl = process.env.DATABASE_URL;
  
  if (!tenantDbUrl) {
    log('  ❌ DATABASE_URL not set', 'red');
    return false;
  }
  
  try {
    const client = new Client({ connectionString: tenantDbUrl });
    await client.connect();
    log('  ✅ Connected to Template DB', 'green');
    
    // Check for key tenant tables
    const tables = ['User', 'Product', 'Order', 'Customer', 'Outlet', 'Category'];
    let allTablesExist = true;
    
    for (const table of tables) {
      const check = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (check.rows[0].exists) {
        log(`  ✅ ${table} table exists`, 'green');
      } else {
        log(`  ❌ ${table} table not found`, 'red');
        allTablesExist = false;
      }
    }
    
    await client.end();
    return allTablesExist;
    
  } catch (error) {
    log(`  ❌ Connection failed: ${error.message}`, 'red');
    log(`     Make sure template database exists: createdb template_db`, 'yellow');
    return false;
  }
}

async function verifySubdomainUtilities() {
  logSection('4. Subdomain Utilities');
  
  try {
    // Try to import subdomain utilities from index
    const dbPackage = require('../packages/database/dist/index.js');
    const subdomainUtils = {
      sanitizeSubdomain: dbPackage.sanitizeSubdomain,
      validateSubdomain: dbPackage.validateSubdomain,
      getRootDomain: dbPackage.getRootDomain
    };
    
    // Test sanitize function
    const testSubdomain = subdomainUtils.sanitizeSubdomain('My Test Shop!');
    if (testSubdomain === 'my-test-shop') {
      log('  ✅ sanitizeSubdomain() working', 'green');
    } else {
      log(`  ❌ sanitizeSubdomain() failed: expected "my-test-shop", got "${testSubdomain}"`, 'red');
      return false;
    }
    
    // Test validate function
    const valid = subdomainUtils.validateSubdomain('shop1');
    const invalid = subdomainUtils.validateSubdomain('admin');
    
    if (valid && !invalid) {
      log('  ✅ validateSubdomain() working', 'green');
    } else {
      log('  ❌ validateSubdomain() failed', 'red');
      return false;
    }
    
    // Test root domain
    const rootDomain = subdomainUtils.getRootDomain();
    if (rootDomain) {
      log(`  ✅ getRootDomain() working - ${rootDomain}`, 'green');
    } else {
      log('  ❌ getRootDomain() failed', 'red');
      return false;
    }
    
    return true;
    
  } catch (error) {
    log(`  ❌ Subdomain utilities not available: ${error.message}`, 'red');
    log('     Build database package: cd packages/database && yarn build', 'yellow');
    return false;
  }
}

async function verifyTenantDatabaseCreation() {
  logSection('5. Tenant Database Creation Test');
  
  const mainDbUrl = process.env.MAIN_DATABASE_URL;
  
  if (!mainDbUrl) {
    log('  ⚠️  Skipping - MAIN_DATABASE_URL not set', 'yellow');
    return null;
  }
  
  try {
    const client = new Client({ connectionString: mainDbUrl });
    await client.connect();
    
    // Check if we can query tenant databases
    const tenants = await client.query('SELECT subdomain, "databaseUrl" FROM "Tenant" LIMIT 3');
    
    if (tenants.rows.length === 0) {
      log('  ⚠️  No tenants found - This is OK for new setup', 'yellow');
      log('     Register a tenant to test database creation', 'blue');
      await client.end();
      return null;
    }
    
    log(`  📊 Found ${tenants.rows.length} tenant(s)`, 'blue');
    
    // Try to connect to first tenant database
    const firstTenant = tenants.rows[0];
    if (firstTenant.databaseUrl) {
      try {
        const tenantClient = new Client({ connectionString: firstTenant.databaseUrl });
        await tenantClient.connect();
        log(`  ✅ Can connect to tenant database: ${firstTenant.subdomain}`, 'green');
        
        // Check if tenant DB has data
        const userCount = await tenantClient.query('SELECT COUNT(*) FROM "User"');
        log(`  📊 Users in tenant DB: ${userCount.rows[0].count}`, 'blue');
        
        await tenantClient.end();
        return true;
      } catch (error) {
        log(`  ❌ Cannot connect to tenant database: ${firstTenant.subdomain}`, 'red');
        log(`     Error: ${error.message}`, 'red');
        return false;
      }
    }
    
    await client.end();
    return true;
    
  } catch (error) {
    log(`  ❌ Error checking tenant databases: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Multi-Tenant Setup Verification                      ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  const results = {
    env: false,
    mainDb: false,
    tenantDb: false,
    subdomainUtils: false,
    tenantCreation: null
  };
  
  // Run all checks
  results.env = await verifyEnvironmentVariables();
  
  if (results.env) {
    results.mainDb = await verifyMainDatabase();
    results.tenantDb = await verifyTenantDatabaseTemplate();
    results.subdomainUtils = await verifySubdomainUtilities();
    results.tenantCreation = await verifyTenantDatabaseCreation();
  }
  
  // Summary
  logSection('Summary');
  
  const checks = [
    { name: 'Environment Variables', result: results.env },
    { name: 'Main Database', result: results.mainDb },
    { name: 'Tenant Database Template', result: results.tenantDb },
    { name: 'Subdomain Utilities', result: results.subdomainUtils },
    { name: 'Tenant Database Creation', result: results.tenantCreation }
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.result === false) {
      log(`  ❌ ${check.name}`, 'red');
      allPassed = false;
    } else if (check.result === true) {
      log(`  ✅ ${check.name}`, 'green');
    } else {
      log(`  ⚠️  ${check.name} - Skipped`, 'yellow');
    }
  });
  
  console.log('\n');
  
  if (allPassed) {
    log('✅ All critical checks passed!', 'green');
    log('\n📝 Next steps:', 'blue');
    log('   1. Start development servers: yarn dev', 'blue');
    log('   2. Test registration: http://client.localhost:3001/register', 'blue');
    log('   3. Verify tenant dashboard: http://{subdomain}.localhost:3001', 'blue');
    process.exit(0);
  } else {
    log('❌ Some checks failed. Please fix the issues above.', 'red');
    log('\n🔧 Common fixes:', 'yellow');
    log('   - Missing env vars: Add to .env.local', 'yellow');
    log('   - Main DB tables: Run yarn db:setup-main', 'yellow');
    log('   - Tenant schema: Run yarn db:push:tenant', 'yellow');
    log('   - Build package: cd packages/database && yarn build', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Verification failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
