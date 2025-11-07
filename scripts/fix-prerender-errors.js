#!/usr/bin/env node

/**
 * Fix Prerender Errors Script
 * 
 * Adds `export const dynamic = 'force-dynamic'` to pages that have prerender errors
 */

const fs = require('fs');
const path = require('path');

const pagesToFix = [
  'apps/admin/app/orders/page.tsx',
  'apps/admin/app/users/page.tsx',
  'apps/admin/app/subscription/page.tsx',
  'apps/admin/app/plans/page.tsx',
  'apps/admin/app/payments/page.tsx',
  'apps/admin/app/merchants/page.tsx',
  'apps/admin/app/subscriptions/page.tsx',
  'apps/admin/app/billing-cycles/page.tsx',
  'apps/admin/app/audit-logs/page.tsx',
];

const rootDir = path.join(__dirname, '..');

pagesToFix.forEach(pagePath => {
  const fullPath = path.join(rootDir, pagePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${pagePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already has dynamic export
  if (content.includes('export const dynamic')) {
    console.log(`✅ Already fixed: ${pagePath}`);
    return;
  }

  // Find the first line after 'use client' or imports
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find where to insert (after 'use client' or after first import)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("'use client'") || lines[i].includes('"use client"')) {
      insertIndex = i + 1;
      break;
    }
    if (lines[i].startsWith('import ') && insertIndex === 0) {
      insertIndex = i;
    }
  }

  // Insert the dynamic export
  const dynamicExport = '\n// Disable prerendering to avoid module resolution issues\nexport const dynamic = \'force-dynamic\';\n';
  
  lines.splice(insertIndex, 0, dynamicExport.trim());
  content = lines.join('\n');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Fixed: ${pagePath}`);
});

console.log('\n✅ All pages fixed!');

