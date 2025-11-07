#!/usr/bin/env node

/**
 * Find Undefined Component Script
 * 
 * Kiểm tra các component được import từ @rentalshop/ui
 * và xem component nào bị undefined trong build output
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Components được import trong dashboard page (example)
const componentsToCheck = [
  // Layout components
  'CardClean',
  'CardHeaderClean',
  'CardTitleClean',
  'CardContentClean',
  'PageWrapper',
  'PageHeader',
  'PageTitle',
  'PageContent',
  
  // UI components
  'useToast',
  'Button',
  'Card',
  'CardHeader',
  'CardTitle',
  'CardContent',
  'Badge',
  'StatusBadge',
  
  // Chart components
  'IncomeChart',
  'OrderChart',
  
  // Admin components
  'AdminPageHeader',
  'MetricCard',
  'ActivityFeed',
];

console.log('🔍 Checking components in @rentalshop/ui build output...\n');

// Try to load the built package
let uiExports = {};
try {
  // Try ESM first
  const esmPath = path.join(rootDir, 'packages/ui/dist/index.mjs');
  if (fs.existsSync(esmPath)) {
    console.log('✅ Found ESM build:', esmPath);
  }
  
  // Try CJS
  const cjsPath = path.join(rootDir, 'packages/ui/dist/index.js');
  if (fs.existsSync(cjsPath)) {
    console.log('✅ Found CJS build:', cjsPath);
    
    // Try to require (may fail if it's ESM only)
    try {
      // Clear require cache
      delete require.cache[require.resolve(cjsPath)];
      uiExports = require(cjsPath);
      console.log('✅ Successfully loaded CJS build\n');
    } catch (e) {
      console.log('⚠️  Cannot require CJS build (may be ESM only):', e.message);
      console.log('   Will check exports by reading file content\n');
    }
  }
} catch (error) {
  console.error('❌ Error loading UI package:', error.message);
}

// Check each component
console.log('📋 Component Status:\n');
console.log('='.repeat(60));

const missing = [];
const found = [];
const undefined = [];

componentsToCheck.forEach(componentName => {
  let status = '❓ UNKNOWN';
  
  if (Object.keys(uiExports).length > 0) {
    // Check in loaded exports
    if (componentName in uiExports) {
      const value = uiExports[componentName];
      if (value === undefined) {
        status = '❌ UNDEFINED';
        undefined.push(componentName);
      } else if (value === null) {
        status = '⚠️  NULL';
        undefined.push(componentName);
      } else {
        status = '✅ FOUND';
        found.push(componentName);
      }
    } else {
      status = '❌ MISSING';
      missing.push(componentName);
    }
  } else {
    // Check by reading file content
    const cjsPath = path.join(rootDir, 'packages/ui/dist/index.js');
    if (fs.existsSync(cjsPath)) {
      const content = fs.readFileSync(cjsPath, 'utf8');
      // Check if component is exported
      const exportPattern = new RegExp(`(?:export|exports\\.)\\s*${componentName}`, 'g');
      if (exportPattern.test(content)) {
        status = '✅ FOUND (in file)';
        found.push(componentName);
      } else {
        // Check for default export with this name
        const defaultPattern = new RegExp(`exports\\.${componentName}\\s*=`, 'g');
        if (defaultPattern.test(content)) {
          status = '✅ FOUND (default export)';
          found.push(componentName);
        } else {
          status = '❌ MISSING';
          missing.push(componentName);
        }
      }
    } else {
      status = '❌ BUILD NOT FOUND';
      missing.push(componentName);
    }
  }
  
  console.log(`${status.padEnd(25)} ${componentName}`);
});

console.log('='.repeat(60));
console.log('\n📊 Summary:');
console.log(`✅ Found: ${found.length}`);
console.log(`❌ Missing: ${missing.length}`);
console.log(`⚠️  Undefined: ${undefined.length}`);

if (missing.length > 0) {
  console.log('\n❌ Missing Components:');
  missing.forEach(c => console.log(`   - ${c}`));
}

if (undefined.length > 0) {
  console.log('\n⚠️  Undefined Components (exported but undefined):');
  undefined.forEach(c => console.log(`   - ${c}`));
}

// Check source files
console.log('\n🔍 Checking source files...\n');

const sourceFiles = [
  'packages/ui/src/components/ui/index.ts',
  'packages/ui/src/components/layout/index.ts',
  'packages/ui/src/components/charts/index.ts',
  'packages/ui/src/components/features/Admin/components/index.ts',
  'packages/ui/src/index.tsx',
];

sourceFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 ${file}:`);
    
    missing.forEach(componentName => {
      if (content.includes(componentName)) {
        console.log(`   ✅ ${componentName} is exported in source`);
      }
    });
    
    console.log('');
  }
});

// Check if components are actually used in dashboard
console.log('🔍 Checking dashboard page imports...\n');
const dashboardPath = path.join(rootDir, 'apps/admin/app/dashboard/page.tsx');
if (fs.existsSync(dashboardPath)) {
  const content = fs.readFileSync(dashboardPath, 'utf8');
  const importMatch = content.match(/from ['"]@rentalshop\/ui['"]/);
  if (importMatch) {
    console.log('✅ Dashboard imports from @rentalshop/ui');
    
    // Extract import statements
    const importLines = content.split('\n').filter(line => 
      line.includes('from') && line.includes('@rentalshop/ui')
    );
    
    console.log('\n📋 Import statements:');
    importLines.forEach(line => {
      console.log(`   ${line.trim()}`);
    });
  }
}

console.log('\n💡 Next Steps:');
if (missing.length > 0 || undefined.length > 0) {
  console.log('1. Check if components are properly exported in source files');
  console.log('2. Rebuild @rentalshop/ui package: cd packages/ui && yarn build');
  console.log('3. Verify exports in dist/index.js or dist/index.mjs');
  console.log('4. Check for circular dependencies');
} else {
  console.log('✅ All components found! Issue may be with Next.js build process.');
  console.log('   Try: cd apps/admin && yarn build --debug');
}

