#!/usr/bin/env node

/**
 * Bootstrap Multi-Tenant Environment
 *
 * This script provisions BOTH databases required for the multi-tenant setup:
 *  1. Main registry database (plans, subscriptions, tenant metadata)
 *  2. Shared tenant database (merchants, outlets, products, orders, ...)
 *
 * It will:
 *  - Generate Prisma clients for both schemas
 *  - Push the latest schema to each database
 *  - Seed registry data (plans + default tenant entry)
 *  - Regenerate the shared tenant dataset (merchants/outlets/users/etc.)
 *  - Ensure the super admin account exists
 *
 * Usage:
 *   node scripts/bootstrap-multi-tenant.js
 *
 * Optional flags:
 *   --tenant-key=myshop        Override default tenant key (default: demo)
 *   --tenant-name="My Shop"    Override default tenant name
 *   --tenant-db-url=postgres://...  Override database URL stored on the tenant record
 *   --skip-super-admin         Skip the super-admin creation step
 */

/* eslint-disable no-console */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = process.cwd();

require('dotenv').config({
  path: path.resolve(projectRoot, '.env'),
});

// ----------------------------------------------------------------------------- 
// Argument parsing
// -----------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {};
  argv.forEach((arg) => {
    if (!arg.startsWith('--')) {
      return;
    }
    const [rawKey, rawValue] = arg.slice(2).split('=');
    const key = rawKey?.trim();
    const value = rawValue === undefined ? true : rawValue.trim();

    switch (key) {
      case 'tenant-key':
        options.tenantKey = value;
        break;
      case 'tenant-name':
        options.tenantName = value;
        break;
      case 'tenant-db-url':
        options.tenantDatabaseUrl = value;
        break;
      case 'skip-super-admin':
        options.skipSuperAdmin = true;
        break;
      default:
        console.warn(`⚠️  Unknown flag "${key}" ignored.`);
    }
  });
  return options;
}

const cliOptions = parseArgs(process.argv.slice(2));

if (cliOptions.tenantKey) {
  process.env.SEED_TENANT_KEY = cliOptions.tenantKey;
}
if (cliOptions.tenantName) {
  process.env.SEED_TENANT_NAME = cliOptions.tenantName;
}
if (cliOptions.tenantDatabaseUrl) {
  process.env.SEED_TENANT_DATABASE_URL = cliOptions.tenantDatabaseUrl;
}

// Always fall back to DATABASE_URL to keep registry + tenant DB linked.
if (!process.env.SEED_TENANT_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.SEED_TENANT_DATABASE_URL = process.env.DATABASE_URL;
}

// ----------------------------------------------------------------------------- 
// Helpers
// -----------------------------------------------------------------------------

function exitWithError(message, cause) {
  console.error('\n❌  Bootstrap failed.');
  console.error(`   ${message}`);
  if (cause) {
    console.error();
    console.error(cause);
  }
  process.exit(1);
}

function resolveBin(binName) {
  const suffix = process.platform === 'win32' ? '.cmd' : '';
  const candidate = path.resolve(projectRoot, 'node_modules', '.bin', `${binName}${suffix}`);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  // Fallback to bare command (relies on PATH)
  return binName;
}

function runStep(title, command, args, options = {}) {
  console.log('\n────────────────────────────────────────');
  console.log(`▶️  ${title}`);
  console.log('────────────────────────────────────────');
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: projectRoot,
    env: process.env,
    ...options,
  });
  if (result.status !== 0) {
    const message = `Command failed: ${command} ${args.join(' ')}`;
    exitWithError(`${title} failed.`, message);
  }
  console.log(`✅  ${title} completed.`);
}

// ----------------------------------------------------------------------------- 
// Pre-flight checks
// -----------------------------------------------------------------------------

const REQUIRED_ENV = ['DATABASE_URL', 'MAIN_DATABASE_URL'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  exitWithError(
    `Missing required environment variables: ${missingEnv.join(', ')}.\n` +
      'Ensure they are set in your environment or .env file before running this command.'
  );
}

if (process.env.DATABASE_URL === process.env.MAIN_DATABASE_URL) {
  console.warn(
    '\n⚠️  WARNING: DATABASE_URL and MAIN_DATABASE_URL are identical.\n' +
      '    This defeats the purpose of separating registry and tenant data.\n' +
      '    Proceeding anyway…\n'
  );
}

const prismaBin = resolveBin('prisma');
const mainSchemaPath = path.resolve(projectRoot, 'prisma', 'main', 'schema.prisma');
const tenantSchemaPath = path.resolve(projectRoot, 'prisma', 'schema.prisma');
const seedMainScript = path.resolve(projectRoot, 'scripts', 'seed-main-registry.js');
const regenerateScript = path.resolve(projectRoot, 'scripts', 'regenerate-entire-system-2025.js');
const superAdminScript = path.resolve(projectRoot, 'scripts', 'create-super-admin.js');

// ----------------------------------------------------------------------------- 
// Execution pipeline
// -----------------------------------------------------------------------------

console.log('\n🚀 Starting multi-tenant bootstrap process…');
console.log(`   • Main DB URL:    ${process.env.MAIN_DATABASE_URL}`);
console.log(`   • Tenant DB URL:  ${process.env.DATABASE_URL}`);
console.log(`   • Tenant key:     ${process.env.SEED_TENANT_KEY || 'demo'}`);
console.log(`   • Tenant name:    ${process.env.SEED_TENANT_NAME || 'Demo Tenant'}`);

try {
  runStep('Generate Prisma client for main registry', prismaBin, [
    'generate',
    '--schema',
    mainSchemaPath,
  ]);

  runStep('Push schema to main registry database', prismaBin, [
    'db',
    'push',
    '--schema',
    mainSchemaPath,
    '--accept-data-loss',
  ]);

  runStep('Seed registry plans and default tenant', process.execPath, [seedMainScript]);

  runStep('Generate Prisma client for tenant database', prismaBin, [
    'generate',
    '--schema',
    tenantSchemaPath,
  ]);

  runStep('Push schema to tenant database', prismaBin, [
    'db',
    'push',
    '--schema',
    tenantSchemaPath,
    '--accept-data-loss',
  ]);

  runStep('Regenerate tenant dataset (merchants, outlets, users, etc.)', process.execPath, [
    regenerateScript,
  ]);

  if (!cliOptions.skipSuperAdmin) {
    runStep('Ensure super admin account exists', process.execPath, [superAdminScript]);
  } else {
    console.log('\n⏭️  Skipping super admin creation (per --skip-super-admin flag).');
  }

  console.log('\n🎉  Multi-tenant bootstrap completed successfully!');
  console.log('    Registry + tenant databases are ready to use.\n');
} catch (error) {
  exitWithError('Unexpected error during bootstrap.', error);
}


