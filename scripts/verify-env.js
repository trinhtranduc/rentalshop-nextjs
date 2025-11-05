#!/usr/bin/env node

/**
 * Verify Multi-Tenant Environment Variables
 * 
 * Checks that all required environment variables are set for multi-tenant system
 */

require('dotenv').config({ path: '.env.local' });

const requiredVars = {
  'MAIN_DATABASE_URL': 'Main Database (Multi-tenant metadata)',
  'DATABASE_URL': 'Tenant Database Template (Prisma migrations)',
  'NEXT_PUBLIC_ROOT_DOMAIN': 'Root Domain (Subdomain routing)'
};

const optionalVars = {
  'JWT_SECRET': 'JWT Secret (Authentication)',
  'NEXTAUTH_SECRET': 'NextAuth Secret',
  'API_URL': 'API URL (if different from default)'
};

console.log('🔍 Verifying Multi-Tenant Environment Variables...\n');

let allValid = true;
const missing = [];
const invalid = [];

// Check required variables
console.log('📋 Required Variables:');
Object.entries(requiredVars).forEach(([key, description]) => {
  const value = process.env[key];
  
  if (!value) {
    console.log(`  ❌ ${key}: MISSING - ${description}`);
    missing.push(key);
    allValid = false;
  } else if (key === 'MAIN_DATABASE_URL' || key === 'DATABASE_URL') {
    // Validate PostgreSQL connection string format
    if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
      console.log(`  ⚠️  ${key}: INVALID FORMAT - Should start with postgresql://`);
      invalid.push(key);
      allValid = false;
    } else {
      // Mask password in output
      const masked = value.replace(/:[^:@]+@/, ':***@');
      console.log(`  ✅ ${key}: SET - ${masked}`);
    }
  } else {
    console.log(`  ✅ ${key}: SET - ${value}`);
  }
});

// Check optional variables
console.log('\n📋 Optional Variables:');
Object.entries(optionalVars).forEach(([key, description]) => {
  const value = process.env[key];
  
  if (!value) {
    console.log(`  ⚠️  ${key}: NOT SET (optional) - ${description}`);
  } else {
    // Mask secrets
    const masked = key.includes('SECRET') || key.includes('SECRET') 
      ? '***' 
      : value;
    console.log(`  ✅ ${key}: SET - ${masked}`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
if (allValid) {
  console.log('✅ All required environment variables are set!');
  console.log('\n📝 Next steps:');
  console.log('   1. Verify Main DB exists: createdb main_db');
  console.log('   2. Setup Main DB tables: yarn db:setup-main');
  console.log('   3. Verify setup: yarn db:verify-multi-tenant');
  process.exit(0);
} else {
  console.log('❌ Some required environment variables are missing or invalid!');
  console.log('\n🔧 Fix issues:');
  
  if (missing.length > 0) {
    console.log('\n  Missing variables:');
    missing.forEach(key => {
      console.log(`    - ${key}: ${requiredVars[key]}`);
    });
  }
  
  if (invalid.length > 0) {
    console.log('\n  Invalid variables:');
    invalid.forEach(key => {
      console.log(`    - ${key}: Check format`);
    });
  }
  
  console.log('\n📝 Add to .env.local:');
  console.log('   MAIN_DATABASE_URL=postgresql://user:password@localhost:5432/main_db');
  console.log('   DATABASE_URL=postgresql://user:password@localhost:5432/template_db');
  console.log('   NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000');
  
  process.exit(1);
}
