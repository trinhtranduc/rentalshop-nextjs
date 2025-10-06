#!/usr/bin/env node

/**
 * API Consistency Audit Script
 * 
 * This script audits all API files for consistency issues:
 * - Type safety with parseApiResponse
 * - Redundant headers
 * - Inconsistent patterns
 */

const fs = require('fs');
const path = require('path');

const API_DIR = '/Users/mac/Source-Code/rentalshop-nextjs/packages/utils/src/api';

function getAllApiFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function auditFile(filePath) {
  const relativePath = path.relative(API_DIR, filePath);
  console.log(`🔍 Auditing: ${relativePath}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for redundant headers
  const redundantHeadersPattern = /headers:\s*\{[^}]*'Content-Type':\s*'application\/json'[^}]*\}/g;
  const redundantHeadersMatches = content.match(redundantHeadersPattern);
  if (redundantHeadersMatches) {
    issues.push({
      type: 'redundant_headers',
      message: 'Found redundant Content-Type headers (authenticatedFetch handles this)',
      matches: redundantHeadersMatches.length
    });
  }
  
  // Check for inconsistent parseApiResponse usage
  const parseApiResponsePattern = /parseApiResponse<([^>]+)>/g;
  const parseApiResponseMatches = [...content.matchAll(parseApiResponsePattern)];
  
  const anyPattern = /parseApiResponse<any>/g;
  const anyMatches = content.match(anyPattern);
  if (anyMatches) {
    issues.push({
      type: 'type_safety',
      message: 'Found parseApiResponse<any> - should use specific types',
      matches: anyMatches.length
    });
  }
  
  // Check for missing type safety
  const untypedPattern = /parseApiResponse\(/g;
  const untypedMatches = content.match(untypedPattern);
  if (untypedMatches) {
    issues.push({
      type: 'missing_types',
      message: 'Found untyped parseApiResponse calls',
      matches: untypedMatches.length
    });
  }
  
  // Check for inconsistent authenticatedFetch usage
  const fetchPattern = /fetch\(/g;
  const fetchMatches = content.match(fetchPattern);
  if (fetchMatches) {
    issues.push({
      type: 'inconsistent_fetch',
      message: 'Found direct fetch() calls instead of authenticatedFetch',
      matches: fetchMatches.length
    });
  }
  
  // Check for manual JSON.stringify without proper error handling
  const jsonStringifyPattern = /JSON\.stringify\([^)]+\)/g;
  const jsonStringifyMatches = content.match(jsonStringifyPattern);
  if (jsonStringifyMatches && !content.includes('try') && !content.includes('catch')) {
    issues.push({
      type: 'unsafe_json',
      message: 'Found JSON.stringify without try-catch error handling',
      matches: jsonStringifyMatches.length
    });
  }
  
  // Check for hardcoded URLs
  const hardcodedUrlPattern = /['"`]http[s]?:\/\/[^'"`]+['"`]/g;
  const hardcodedUrlMatches = content.match(hardcodedUrlPattern);
  if (hardcodedUrlMatches) {
    issues.push({
      type: 'hardcoded_urls',
      message: 'Found hardcoded URLs instead of using apiUrls',
      matches: hardcodedUrlMatches.length
    });
  }
  
  return {
    file: relativePath,
    issues: issues,
    hasIssues: issues.length > 0
  };
}

function main() {
  console.log('🔍 API Consistency Audit');
  console.log('=' .repeat(60));
  
  const apiFiles = getAllApiFiles(API_DIR);
  console.log(`📁 Found ${apiFiles.length} API files`);
  
  let totalIssues = 0;
  let filesWithIssues = 0;
  
  const results = [];
  
  for (const file of apiFiles) {
    const result = auditFile(file);
    results.push(result);
    
    if (result.hasIssues) {
      filesWithIssues++;
      totalIssues += result.issues.length;
      
      console.log(`❌ ${result.file}:`);
      for (const issue of result.issues) {
        console.log(`   - ${issue.type.toUpperCase()}: ${issue.message} (${issue.matches} occurrences)`);
      }
    } else {
      console.log(`✅ ${result.file}: No issues found`);
    }
  }
  
  console.log('=' .repeat(60));
  console.log(`📊 Audit Results:`);
  console.log(`   - Files audited: ${apiFiles.length}`);
  console.log(`   - Files with issues: ${filesWithIssues}`);
  console.log(`   - Total issues: ${totalIssues}`);
  
  if (totalIssues > 0) {
    console.log(`\n🔧 Issue Summary:`);
    const issueTypes = {};
    results.forEach(result => {
      result.issues.forEach(issue => {
        if (!issueTypes[issue.type]) {
          issueTypes[issue.type] = 0;
        }
        issueTypes[issue.type] += issue.matches;
      });
    });
    
    Object.entries(issueTypes).forEach(([type, count]) => {
      console.log(`   - ${type.toUpperCase()}: ${count} occurrences`);
    });
    
    console.log(`\n💡 Recommendations:`);
    console.log(`   1. Remove redundant Content-Type headers (authenticatedFetch handles this)`);
    console.log(`   2. Use specific types with parseApiResponse<T> instead of <any>`);
    console.log(`   3. Use authenticatedFetch instead of direct fetch()`);
    console.log(`   4. Add try-catch around JSON.stringify calls`);
    console.log(`   5. Use apiUrls configuration instead of hardcoded URLs`);
  } else {
    console.log(`\n🎉 All API files are consistent!`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, auditFile };
