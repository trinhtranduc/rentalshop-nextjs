#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const pagesDir = path.join(rootDir, 'apps/admin/app');

function fixPage(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has dynamic export
  if (content.includes('export const dynamic')) {
    return false;
  }
  
  // Only fix client components
  if (!content.includes("'use client'") && !content.includes('"use client"')) {
    return false;
  }
  
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find 'use client' line
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("'use client'") || lines[i].includes('"use client"')) {
      insertIndex = i + 1;
      break;
    }
  }
  
  if (insertIndex === 0) return false;
  
  // Insert dynamic exports
  const dynamicExports = [
    '',
    '// Disable prerendering to avoid module resolution issues',
    "export const dynamic = 'force-dynamic';",
    'export const revalidate = 0;',
    ''
  ];
  
  lines.splice(insertIndex, 0, ...dynamicExports);
  content = lines.join('\n');
  
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function findPages(dir) {
  const pages = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      pages.push(...findPages(filePath));
    } else if (file === 'page.tsx') {
      pages.push(filePath);
    }
  }
  
  return pages;
}

const pages = findPages(pagesDir);
let fixed = 0;

console.log(`Found ${pages.length} pages\n`);

pages.forEach(page => {
  if (fixPage(page)) {
    const relPath = path.relative(rootDir, page);
    console.log(`✅ Fixed: ${relPath}`);
    fixed++;
  }
});

console.log(`\n✅ Fixed ${fixed}/${pages.length} pages`);
