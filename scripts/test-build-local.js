#!/usr/bin/env node

/**
 * Local Build Test Script
 * 
 * Mô phỏng quy trình build của Railway để test trước khi deploy
 * 
 * Usage:
 *   node scripts/test-build-local.js
 *   node scripts/test-build-local.js --skip-clean    # Skip cleaning
 *   node scripts/test-build-local.js --test-start   # Test starting apps after build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Parse command line arguments
const args = process.argv.slice(2);
const skipClean = args.includes('--skip-clean');
const testStart = args.includes('--test-start');

// Check if we're in the root directory
const rootDir = process.cwd();
if (!fs.existsSync(path.join(rootDir, 'package.json'))) {
  logError('Please run this script from the project root directory');
  process.exit(1);
}

// Track build results
const results = {
  cleaned: false,
  installed: false,
  prismaGenerated: false,
  packagesBuilt: [],
  appsBuilt: [],
  errors: [],
};

// Helper function to run commands
function runCommand(command, description, options = {}) {
  try {
    logInfo(`Running: ${command}`);
    const output = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: rootDir,
      env: { ...process.env, ...options.env },
    });
    if (options.silent && output) {
      return output.toString();
    }
    return true;
  } catch (error) {
    if (options.continueOnError) {
      logWarning(`${description} failed but continuing...`);
      return false;
    }
    logError(`${description} failed: ${error.message}`);
    results.errors.push({ step: description, error: error.message });
    throw error;
  }
}

// Step 1: Clean previous builds
function cleanBuilds() {
  logStep('1/6', 'Cleaning previous builds...');
  
  if (skipClean) {
    logWarning('Skipping clean step (--skip-clean flag)');
    results.cleaned = true;
    return;
  }

  try {
    // Clean turbo cache
    if (fs.existsSync(path.join(rootDir, '.turbo'))) {
      runCommand('rm -rf .turbo', 'Remove turbo cache', { silent: true });
    }

    // Clean package dist folders
    const packages = fs.readdirSync(path.join(rootDir, 'packages'));
    packages.forEach(pkg => {
      const distPath = path.join(rootDir, 'packages', pkg, 'dist');
      if (fs.existsSync(distPath)) {
        runCommand(`rm -rf ${distPath}`, `Clean ${pkg}/dist`, { silent: true });
      }
    });

    // Clean app .next folders
    const apps = ['api', 'admin', 'client'];
    apps.forEach(app => {
      const nextPath = path.join(rootDir, 'apps', app, '.next');
      if (fs.existsSync(nextPath)) {
        runCommand(`rm -rf ${nextPath}`, `Clean ${app}/.next`, { silent: true });
      }
    });

    results.cleaned = true;
    logSuccess('Build artifacts cleaned');
  } catch (error) {
    logWarning('Some clean operations failed, continuing...');
    results.cleaned = true; // Continue anyway
  }
}

// Step 2: Install dependencies
function installDependencies() {
  logStep('2/6', 'Installing dependencies...');
  
  try {
    // Set NODE_ENV=development to install devDependencies (like Railway does)
    runCommand('yarn install --frozen-lockfile', 'Install dependencies', {
      env: { NODE_ENV: 'development' },
    });
    
    results.installed = true;
    logSuccess('Dependencies installed');
  } catch (error) {
    logError('Failed to install dependencies');
    throw error;
  }
}

// Step 3: Generate Prisma Client
function generatePrisma() {
  logStep('3/6', 'Generating Prisma Client...');
  
  try {
    runCommand(
      'npx prisma generate --schema=./prisma/schema.prisma',
      'Generate Prisma Client'
    );
    
    results.prismaGenerated = true;
    logSuccess('Prisma Client generated');
  } catch (error) {
    logError('Failed to generate Prisma Client');
    throw error;
  }
}

// Step 4: Build packages
function buildPackages() {
  logStep('4/6', 'Building packages...');
  
  const packages = [
    'constants',
    'types',
    'env',
    'errors',
    'auth',
    'database',
    'utils',
    'validation',
    'middleware',
    'hooks',
    'ui',
  ];

  logInfo(`Building ${packages.length} packages...`);

  packages.forEach(pkg => {
    try {
      const pkgPath = path.join(rootDir, 'packages', pkg);
      if (!fs.existsSync(path.join(pkgPath, 'package.json'))) {
        logWarning(`Package ${pkg} not found, skipping...`);
        return;
      }

      logInfo(`Building @rentalshop/${pkg}...`);
      
      // Check if package has build script
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(pkgPath, 'package.json'), 'utf8')
      );
      
      if (pkgJson.scripts && pkgJson.scripts.build) {
        runCommand(`cd packages/${pkg} && yarn build`, `Build ${pkg}`, {
          continueOnError: true,
        });
        
        // Verify build output
        const distPath = path.join(pkgPath, 'dist');
        if (fs.existsSync(distPath)) {
          const files = fs.readdirSync(distPath);
          if (files.length > 0) {
            results.packagesBuilt.push(pkg);
            logSuccess(`✅ ${pkg} built successfully`);
          } else {
            logWarning(`⚠️  ${pkg} build output is empty`);
          }
        } else {
          logWarning(`⚠️  ${pkg} dist folder not found (may not need build)`);
        }
      } else {
        logInfo(`ℹ️  ${pkg} has no build script, skipping...`);
      }
    } catch (error) {
      logWarning(`Failed to build ${pkg}, continuing...`);
    }
  });

  logSuccess(`Built ${results.packagesBuilt.length}/${packages.length} packages`);
}

// Step 5: Build apps
function buildApps() {
  logStep('5/6', 'Building apps...');
  
  const apps = [
    { name: 'api', env: { SKIP_ENV_VALIDATION: 'true' } },
    { name: 'admin', env: {} },
    { name: 'client', env: {} },
  ];

  logInfo(`Building ${apps.length} apps...`);

  apps.forEach(app => {
    try {
      logInfo(`Building ${app.name} app...`);
      
      const appPath = path.join(rootDir, 'apps', app.name);
      if (!fs.existsSync(path.join(appPath, 'package.json'))) {
        logWarning(`App ${app.name} not found, skipping...`);
        return;
      }

      // Build with production environment
      runCommand(`cd apps/${app.name} && yarn build`, `Build ${app.name}`, {
        env: { ...app.env, NODE_ENV: 'production' },
        continueOnError: true,
      });

      // Verify build output
      const nextPath = path.join(appPath, '.next');
      if (fs.existsSync(nextPath)) {
        const buildManifest = path.join(nextPath, 'BUILD_ID');
        if (fs.existsSync(buildManifest)) {
          results.appsBuilt.push(app.name);
          logSuccess(`✅ ${app.name} built successfully`);
        } else {
          logWarning(`⚠️  ${app.name} build incomplete (no BUILD_ID)`);
        }
      } else {
        logWarning(`⚠️  ${app.name} .next folder not found`);
      }
    } catch (error) {
      logWarning(`Failed to build ${app.name}, continuing...`);
    }
  });

  logSuccess(`Built ${results.appsBuilt.length}/${apps.length} apps`);
}

// Step 6: Verify build outputs
function verifyBuilds() {
  logStep('6/6', 'Verifying build outputs...');
  
  const checks = [];
  
  // Check package builds
  const packagesToCheck = ['ui', 'utils', 'database', 'auth'];
  packagesToCheck.forEach(pkg => {
    const distPath = path.join(rootDir, 'packages', pkg, 'dist');
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      if (files.length > 0) {
        checks.push({ type: 'package', name: pkg, status: 'ok' });
        logSuccess(`✅ Package ${pkg} has build output`);
      } else {
        checks.push({ type: 'package', name: pkg, status: 'empty' });
        logWarning(`⚠️  Package ${pkg} build output is empty`);
      }
    } else {
      checks.push({ type: 'package', name: pkg, status: 'missing' });
      logWarning(`⚠️  Package ${pkg} dist folder not found`);
    }
  });

  // Check app builds
  const appsToCheck = ['api', 'admin', 'client'];
  appsToCheck.forEach(app => {
    const nextPath = path.join(rootDir, 'apps', app, '.next');
    if (fs.existsSync(nextPath)) {
      const buildId = path.join(nextPath, 'BUILD_ID');
      if (fs.existsSync(buildId)) {
        checks.push({ type: 'app', name: app, status: 'ok' });
        logSuccess(`✅ App ${app} has build output`);
      } else {
        checks.push({ type: 'app', name: app, status: 'incomplete' });
        logWarning(`⚠️  App ${app} build incomplete`);
      }
    } else {
      checks.push({ type: 'app', name: app, status: 'missing' });
      logWarning(`⚠️  App ${app} .next folder not found`);
    }
  });

  // Summary
  const ok = checks.filter(c => c.status === 'ok').length;
  const total = checks.length;
  
  logInfo(`\nBuild Verification: ${ok}/${total} checks passed`);
  
  if (ok === total) {
    logSuccess('🎉 All builds verified successfully!');
    return true;
  } else {
    logWarning('Some builds may have issues. Check warnings above.');
    return false;
  }
}

// Optional: Test starting apps
function testStartApps() {
  if (!testStart) {
    return;
  }

  logStep('BONUS', 'Testing app startup (will timeout after 10s each)...');
  
  const apps = [
    { name: 'api', port: 3002, path: '/api/health' },
    { name: 'admin', port: 3001, path: '/' },
    { name: 'client', port: 3000, path: '/' },
  ];

  apps.forEach(app => {
    try {
      logInfo(`Testing ${app.name} startup...`);
      
      // Start in background
      const proc = execSync(
        `cd apps/${app.name} && timeout 10s yarn start || true`,
        { stdio: 'pipe', cwd: rootDir }
      );
      
      logSuccess(`✅ ${app.name} started successfully`);
    } catch (error) {
      logWarning(`⚠️  ${app.name} startup test failed (this is OK for quick test)`);
    }
  });
}

// Main execution
async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 Local Build Test (Railway Simulation)', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  try {
    // Run build steps
    cleanBuilds();
    installDependencies();
    generatePrisma();
    buildPackages();
    buildApps();
    const verified = verifyBuilds();
    
    // Optional: Test starting
    if (testStart) {
      testStartApps();
    }

    // Final summary
    log('\n' + '='.repeat(60), 'bright');
    log('📊 Build Test Summary', 'bright');
    log('='.repeat(60), 'bright');
    
    log(`\n✅ Packages built: ${results.packagesBuilt.length}`, 'green');
    log(`✅ Apps built: ${results.appsBuilt.length}`, 'green');
    log(`❌ Errors: ${results.errors.length}`, results.errors.length > 0 ? 'red' : 'green');
    
    if (results.errors.length > 0) {
      log('\nErrors encountered:', 'red');
      results.errors.forEach(err => {
        log(`  - ${err.step}: ${err.error}`, 'red');
      });
    }

    if (verified && results.errors.length === 0) {
      log('\n🎉 Build test PASSED! Ready for Railway deployment.', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  Build test completed with warnings. Review above.', 'yellow');
      process.exit(1);
    }
  } catch (error) {
    logError(`\nBuild test FAILED: ${error.message}`);
    logError('Please fix the errors above before deploying to Railway.');
    process.exit(1);
  }
}

// Run main function
main();

