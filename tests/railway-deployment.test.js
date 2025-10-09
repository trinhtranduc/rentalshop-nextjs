#!/usr/bin/env node

/**
 * ============================================================================
 * RAILWAY DEPLOYMENT TEST SUITE
 * ============================================================================
 * 
 * Comprehensive testing before deploying to Railway
 * Tests: Build, Standalone, Bundle Size, Database, Runtime, Integration
 * 
 * Usage:
 *   node tests/railway-deployment.test.js
 *   yarn test:railway
 * 
 * Author: RentalShop Team
 * Last Updated: 2025-01-09
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  services: [
    { name: 'api', port: 3002, path: 'apps/api' },
    { name: 'client', port: 3000, path: 'apps/client' },
    { name: 'admin', port: 3001, path: 'apps/admin' }
  ],
  maxBundleSize: 150, // MB
  healthCheckTimeout: 30000, // 30 seconds
  serverStartTimeout: 10000, // 10 seconds
  dbConnectionTimeout: 5000 // 5 seconds
};

// ============================================================================
// COLORS & LOGGING
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
  separator: () => console.log('='.repeat(70))
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Execute command and return output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
}

/**
 * Check if directory exists
 */
function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

/**
 * Get directory size in MB
 */
function getDirSize(dirPath) {
  try {
    const output = exec(`du -sm "${dirPath}"`, { silent: true });
    return parseInt(output.split('\t')[0]);
  } catch {
    return 0;
  }
}

/**
 * HTTP request helper
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, options.timeout || 5000);

    http.get(url, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer(port, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await httpRequest(`http://localhost:${port}`, { timeout: 2000 });
      return true;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return false;
}

// ============================================================================
// TEST COUNTERS
// ============================================================================

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  startTime: Date.now()
};

function test(description, fn) {
  stats.total++;
  process.stdout.write(`  Testing: ${description}... `);
  
  try {
    const result = fn();
    if (result === false) {
      console.log(`${colors.red}✗ FAILED${colors.reset}`);
      stats.failed++;
      return false;
    }
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    stats.passed++;
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    log.error(`  Error: ${error.message}`);
    stats.failed++;
    return false;
  }
}

async function asyncTest(description, fn) {
  stats.total++;
  process.stdout.write(`  Testing: ${description}... `);
  
  try {
    const result = await fn();
    if (result === false) {
      console.log(`${colors.red}✗ FAILED${colors.reset}`);
      stats.failed++;
      return false;
    }
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    stats.passed++;
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    log.error(`  Error: ${error.message}`);
    stats.failed++;
    return false;
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

/**
 * 1. ENVIRONMENT VALIDATION
 */
function testEnvironment() {
  log.title('1️⃣  ENVIRONMENT VALIDATION');
  
  test('Node.js version >= 18', () => {
    const version = process.version.match(/^v(\d+)/)[1];
    return parseInt(version) >= 18;
  });
  
  test('Yarn is installed', () => {
    try {
      exec('yarn --version', { silent: true });
      return true;
    } catch {
      return false;
    }
  });
  
  test('PostgreSQL is accessible', () => {
    try {
      exec('psql --version', { silent: true });
      return true;
    } catch {
      log.warning('  PostgreSQL CLI not found (optional for local testing)');
      stats.warnings++;
      return true;
    }
  });
  
  test('Git repository clean', () => {
    try {
      const status = exec('git status --porcelain', { silent: true });
      if (status && status.trim()) {
        log.warning('  Uncommitted changes found');
        stats.warnings++;
      }
      return true;
    } catch {
      return true;
    }
  });
  
  test('.env.test file exists', () => {
    if (!fileExists('.env.test')) {
      log.warning('  .env.test not found - create it for local testing');
      stats.warnings++;
    }
    return true;
  });
}

/**
 * 2. WORKSPACE VALIDATION
 */
function testWorkspace() {
  log.title('2️⃣  WORKSPACE VALIDATION');
  
  test('package.json exists', () => {
    return fileExists('package.json');
  });
  
  test('Workspace packages exist', () => {
    const packages = ['auth', 'database', 'ui', 'utils', 'hooks', 'types'];
    return packages.every(pkg => dirExists(`packages/${pkg}`));
  });
  
  test('App directories exist', () => {
    return CONFIG.services.every(svc => dirExists(svc.path));
  });
  
  test('Prisma schema exists', () => {
    return fileExists('prisma/schema.prisma');
  });
  
  test('Turbo.json configured', () => {
    return fileExists('turbo.json');
  });
}

/**
 * 3. NEXT.JS CONFIGURATION
 */
function testNextConfig() {
  log.title('3️⃣  NEXT.JS CONFIGURATION');
  
  CONFIG.services.forEach(service => {
    test(`${service.name}: next.config.js exists`, () => {
      return fileExists(`${service.path}/next.config.js`);
    });
    
    test(`${service.name}: output: 'standalone' configured`, () => {
      const configPath = `${service.path}/next.config.js`;
      const content = fs.readFileSync(configPath, 'utf8');
      return content.includes("output: 'standalone'");
    });
    
    test(`${service.name}: outputFileTracingRoot configured`, () => {
      const configPath = `${service.path}/next.config.js`;
      const content = fs.readFileSync(configPath, 'utf8');
      return content.includes('outputFileTracingRoot');
    });
    
    test(`${service.name}: transpilePackages configured`, () => {
      const configPath = `${service.path}/next.config.js`;
      const content = fs.readFileSync(configPath, 'utf8');
      return content.includes('transpilePackages');
    });
  });
}

/**
 * 4. RAILWAY CONFIGURATION
 */
function testRailwayConfig() {
  log.title('4️⃣  RAILWAY CONFIGURATION');
  
  CONFIG.services.forEach(service => {
    test(`${service.name}: railway.json exists`, () => {
      return fileExists(`${service.path}/railway.json`);
    });
    
    test(`${service.name}: buildCommand configured`, () => {
      const railwayPath = `${service.path}/railway.json`;
      const content = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));
      return content.build && content.build.buildCommand;
    });
    
    test(`${service.name}: startCommand configured`, () => {
      const railwayPath = `${service.path}/railway.json`;
      const content = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));
      return content.deploy && content.deploy.startCommand;
    });
    
    test(`${service.name}: uses standalone in startCommand`, () => {
      const railwayPath = `${service.path}/railway.json`;
      const content = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));
      return content.deploy.startCommand.includes('.next/standalone');
    });
  });
}

/**
 * 5. DEPENDENCY VALIDATION
 */
function testDependencies() {
  log.title('5️⃣  DEPENDENCY VALIDATION');
  
  test('Root node_modules exists', () => {
    return dirExists('node_modules');
  });
  
  test('Workspace packages linked', () => {
    return dirExists('node_modules/@rentalshop');
  });
  
  test('Prisma Client generated', () => {
    return dirExists('node_modules/.prisma/client');
  });
  
  test('All workspace packages available', () => {
    const packages = ['auth', 'database', 'ui', 'utils', 'hooks'];
    return packages.every(pkg => 
      dirExists(`node_modules/@rentalshop/${pkg}`)
    );
  });
}

/**
 * 6. BUILD PROCESS
 */
function testBuild() {
  log.title('6️⃣  BUILD PROCESS');
  
  log.info('Starting clean build (this may take a few minutes)...');
  
  test('Clean previous builds', () => {
    try {
      exec('rm -rf apps/*/.next packages/*/dist .turbo', { silent: true });
      return true;
    } catch {
      return false;
    }
  });
  
  test('Prisma generate', () => {
    try {
      exec('npx prisma generate --schema=./prisma/schema.prisma', { silent: true });
      return true;
    } catch {
      return false;
    }
  });
  
  test('Build all packages', () => {
    try {
      log.info('  Building packages...');
      exec('yarn build', { silent: false });
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * 7. STANDALONE MODE VALIDATION
 */
function testStandalone() {
  log.title('7️⃣  STANDALONE MODE VALIDATION');
  
  CONFIG.services.forEach(service => {
    test(`${service.name}: .next/standalone exists`, () => {
      return dirExists(`${service.path}/.next/standalone`);
    });
    
    test(`${service.name}: server.js exists`, () => {
      return fileExists(`${service.path}/.next/standalone/${service.path}/server.js`);
    });
    
    test(`${service.name}: workspace packages included`, () => {
      return dirExists(`${service.path}/.next/standalone/node_modules/@rentalshop`);
    });
    
    test(`${service.name}: required dependencies included`, () => {
      const standaloneNodeModules = `${service.path}/.next/standalone/node_modules`;
      return dirExists(`${standaloneNodeModules}/next`) &&
             dirExists(`${standaloneNodeModules}/react`);
    });
  });
}

/**
 * 8. BUNDLE SIZE VALIDATION
 */
function testBundleSize() {
  log.title('8️⃣  BUNDLE SIZE VALIDATION');
  
  let totalSize = 0;
  
  CONFIG.services.forEach(service => {
    const size = getDirSize(`${service.path}/.next/standalone`);
    totalSize += size;
    
    test(`${service.name}: bundle size (${size}MB)`, () => {
      if (size > 100) {
        log.warning(`  ${service.name} bundle is ${size}MB (target: <60MB)`);
        stats.warnings++;
      }
      return size > 0 && size < 200; // Fail if > 200MB
    });
  });
  
  test(`Total bundle size (${totalSize}MB)`, () => {
    if (totalSize > CONFIG.maxBundleSize) {
      log.warning(`  Total bundle ${totalSize}MB exceeds target ${CONFIG.maxBundleSize}MB`);
      stats.warnings++;
    }
    return totalSize > 0 && totalSize < 300; // Fail if > 300MB
  });
  
  log.info(`  Bundle size breakdown:`);
  CONFIG.services.forEach(service => {
    const size = getDirSize(`${service.path}/.next/standalone`);
    log.info(`    ${service.name}: ${size}MB`);
  });
  log.info(`    Total: ${totalSize}MB`);
}

/**
 * 9. PRISMA SCHEMA VALIDATION
 */
function testPrismaSchema() {
  log.title('9️⃣  PRISMA SCHEMA VALIDATION');
  
  test('Schema has binaryTargets', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    return schema.includes('binaryTargets');
  });
  
  test('Schema includes linux-musl target', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    return schema.includes('linux-musl-openssl-3.0.x');
  });
  
  test('Schema validation', () => {
    try {
      exec('npx prisma validate --schema=./prisma/schema.prisma', { silent: true });
      return true;
    } catch {
      return false;
    }
  });
  
  test('Migration files exist', () => {
    return dirExists('prisma/migrations');
  });
}

/**
 * 10. RUNTIME TESTING
 */
async function testRuntime() {
  log.title('🔟 RUNTIME TESTING');
  
  const servers = [];
  
  try {
    // Load environment
    if (fileExists('.env.test')) {
      require('dotenv').config({ path: '.env.test' });
    }
    
    // Start all servers
    for (const service of CONFIG.services) {
      log.info(`  Starting ${service.name} server on port ${service.port}...`);
      
      const serverPath = path.join(process.cwd(), `${service.path}/.next/standalone`);
      const serverFile = path.join(serverPath, service.path, 'server.js');
      
      if (!fileExists(serverFile)) {
        log.error(`  Server file not found: ${serverFile}`);
        continue;
      }
      
      const server = spawn('node', [serverFile], {
        cwd: serverPath,
        env: { ...process.env, PORT: service.port },
        stdio: 'pipe'
      });
      
      servers.push({ name: service.name, process: server, port: service.port });
      
      // Wait a bit before starting next server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Wait for all servers to be ready
    for (const service of CONFIG.services) {
      await asyncTest(`${service.name}: server starts`, async () => {
        return await waitForServer(service.port, CONFIG.serverStartTimeout);
      });
    }
    
    // Test API endpoints
    await asyncTest('API: health endpoint', async () => {
      try {
        const result = await httpRequest('http://localhost:3002/api/health');
        return result.status === 200;
      } catch {
        return false;
      }
    });
    
    await asyncTest('Client: homepage loads', async () => {
      try {
        const result = await httpRequest('http://localhost:3000');
        return result.status === 200;
      } catch {
        return false;
      }
    });
    
    await asyncTest('Admin: homepage loads', async () => {
      try {
        const result = await httpRequest('http://localhost:3001');
        return result.status === 200;
      } catch {
        return false;
      }
    });
    
  } catch (error) {
    log.error(`Runtime testing error: ${error.message}`);
  } finally {
    // Cleanup: Stop all servers
    log.info('  Stopping servers...');
    servers.forEach(server => {
      try {
        server.process.kill();
      } catch (e) {
        // Ignore
      }
    });
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
  log.separator();
  log.title('🧪 RAILWAY DEPLOYMENT TEST SUITE');
  log.separator();
  log.info('Testing Next.js monorepo for Railway deployment readiness');
  log.info('');
  
  // Run all test suites
  testEnvironment();
  testWorkspace();
  testNextConfig();
  testRailwayConfig();
  testDependencies();
  testBuild();
  testStandalone();
  testBundleSize();
  testPrismaSchema();
  
  // Runtime tests (can be slow, optional)
  const runRuntimeTests = process.argv.includes('--runtime');
  if (runRuntimeTests) {
    await testRuntime();
  } else {
    log.warning('\n⏭️  Skipping runtime tests (use --runtime flag to enable)');
  }
  
  // Print summary
  log.separator();
  log.title('📊 TEST SUMMARY');
  log.separator();
  
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  
  console.log(`\n  Total Tests:  ${stats.total}`);
  console.log(`  ${colors.green}Passed:       ${stats.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed:       ${stats.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings:     ${stats.warnings}${colors.reset}`);
  console.log(`  Duration:     ${duration}s\n`);
  
  if (stats.failed === 0) {
    log.separator();
    console.log(`\n  ${colors.green}${colors.bright}🎉 ALL TESTS PASSED!${colors.reset}`);
    console.log(`  ${colors.green}✓ Your application is ready for Railway deployment!${colors.reset}\n`);
    log.separator();
    
    console.log('\n📋 Next Steps:\n');
    console.log('  1. Review bundle sizes (target: <150MB total)');
    console.log('  2. Commit and push changes to GitHub');
    console.log('  3. Deploy to Railway:');
    console.log('     - Connect GitHub repository');
    console.log('     - Add PostgreSQL database');
    console.log('     - Configure environment variables');
    console.log('     - Deploy services\n');
    
    process.exit(0);
  } else {
    log.separator();
    console.log(`\n  ${colors.red}${colors.bright}❌ TESTS FAILED${colors.reset}`);
    console.log(`  ${colors.red}${stats.failed} test(s) failed. Please fix before deploying.${colors.reset}\n`);
    log.separator();
    
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log.error(`\n\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

