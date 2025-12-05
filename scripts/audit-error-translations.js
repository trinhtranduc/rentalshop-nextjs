#!/usr/bin/env node

/**
 * Error Translation Audit Script
 * 
 * Audits all error codes from API and database to check if they have translations
 * in locale files. Generates a detailed report.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const LOCALES_DIR = path.join(ROOT_DIR, 'locales');
const ERROR_CODE_FILE = path.join(ROOT_DIR, 'packages/utils/src/core/errors.ts');
const RESPONSE_BUILDER_FILE = path.join(ROOT_DIR, 'packages/utils/src/api/response-builder.ts');
const API_ROUTES_DIR = path.join(ROOT_DIR, 'apps/api/app/api');
const REPORT_FILE = path.join(ROOT_DIR, 'ERROR_TRANSLATION_AUDIT_REPORT.md');

// Locale codes to check
const LOCALES = ['en', 'vi', 'ja', 'ko', 'zh'];

// ============================================================================
// STEP 1: Extract Error Codes from Codebase
// ============================================================================

/**
 * Extract error codes from ErrorCode enum
 */
function extractErrorCodeEnum() {
  const content = fs.readFileSync(ERROR_CODE_FILE, 'utf8');
  const codes = new Set();
  
  // Match enum values: UNAUTHORIZED = 'UNAUTHORIZED',
  const enumRegex = /^\s*(\w+)\s*=\s*['"]([^'"]+)['"]/gm;
  let match;
  
  // Find the enum block
  const enumStart = content.indexOf('export enum ErrorCode {');
  if (enumStart === -1) return codes;
  
  const enumEnd = content.indexOf('}', enumStart);
  const enumContent = content.substring(enumStart, enumEnd);
  
  while ((match = enumRegex.exec(enumContent)) !== null) {
    codes.add(match[2]); // Use the string value
  }
  
  return codes;
}

/**
 * Extract error codes from ResponseBuilder ERROR_MESSAGES
 */
function extractResponseBuilderErrors() {
  const content = fs.readFileSync(RESPONSE_BUILDER_FILE, 'utf8');
  const codes = new Set();
  
  // Find ERROR_MESSAGES object
  const errorMessagesStart = content.indexOf("const ERROR_MESSAGES:");
  if (errorMessagesStart === -1) return codes;
  
  // Find the closing brace (looking for }; after ERROR_MESSAGES)
  let braceCount = 0;
  let inObject = false;
  let i = errorMessagesStart;
  
  for (; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inObject = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0 && inObject) break;
    }
  }
  
  const errorMessagesContent = content.substring(errorMessagesStart, i + 1);
  
  // Match keys: 'ERROR_CODE': 'message'
  const keyRegex = /['"]([A-Z_][A-Z0-9_]*)['"]\s*:/g;
  let match;
  
  while ((match = keyRegex.exec(errorMessagesContent)) !== null) {
    codes.add(match[1]);
  }
  
  return codes;
}

/**
 * Extract success codes from ResponseBuilder SUCCESS_MESSAGES
 */
function extractResponseBuilderSuccess() {
  const content = fs.readFileSync(RESPONSE_BUILDER_FILE, 'utf8');
  const codes = new Set();
  
  // Find SUCCESS_MESSAGES object
  const successMessagesStart = content.indexOf("const SUCCESS_MESSAGES:");
  if (successMessagesStart === -1) return codes;
  
  // Find the closing brace
  let braceCount = 0;
  let inObject = false;
  let i = successMessagesStart;
  
  for (; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inObject = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0 && inObject) break;
    }
  }
  
  const successMessagesContent = content.substring(successMessagesStart, i + 1);
  
  // Match keys: 'SUCCESS_CODE': 'message'
  const keyRegex = /['"]([A-Z_][A-Z0-9_]*)['"]\s*:/g;
  let match;
  
  while ((match = keyRegex.exec(successMessagesContent)) !== null) {
    codes.add(match[1]);
  }
  
  return codes;
}

/**
 * Recursively find all TypeScript files in a directory
 */
function findTsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Extract error/success codes from API routes
 */
function extractApiRouteCodes() {
  const codes = new Set();
  const apiFiles = findTsFiles(API_ROUTES_DIR);
  
  // Patterns to match:
  // ResponseBuilder.error('CODE')
  // ResponseBuilder.success('CODE')
  // ResponseBuilder.error("CODE")
  // ResponseBuilder.success("CODE")
  const errorPattern = /ResponseBuilder\.error\(['"]([A-Z_][A-Z0-9_]*)['"]/g;
  const successPattern = /ResponseBuilder\.success\(['"]([A-Z_][A-Z0-9_]*)['"]/g;
  
  for (const file of apiFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      let match;
      while ((match = errorPattern.exec(content)) !== null) {
        codes.add(match[1]);
      }
      
      while ((match = successPattern.exec(content)) !== null) {
        codes.add(match[1]);
      }
    } catch (error) {
      console.warn(`Warning: Could not read ${file}:`, error.message);
    }
  }
  
  return codes;
}

/**
 * Extract Prisma error codes from handlePrismaError
 */
function extractPrismaErrorCodes() {
  const content = fs.readFileSync(ERROR_CODE_FILE, 'utf8');
  const codes = new Set();
  
  // Find handlePrismaError function and extract ErrorCode values used
  // This function returns ErrorCode enum values, so we need to extract those
  const prismaErrorStart = content.indexOf('export function handlePrismaError');
  if (prismaErrorStart === -1) return codes;
  
  const prismaErrorEnd = content.indexOf('}', content.indexOf('}', prismaErrorStart) + 1);
  const prismaErrorContent = content.substring(prismaErrorStart, prismaErrorEnd);
  
  // Match ErrorCode.CODE_NAME
  const errorCodePattern = /ErrorCode\.([A-Z_][A-Z0-9_]*)/g;
  let match;
  
  while ((match = errorCodePattern.exec(prismaErrorContent)) !== null) {
    codes.add(match[1]);
  }
  
  return codes;
}

// ============================================================================
// STEP 2: Extract Translation Keys from Locale Files
// ============================================================================

/**
 * Extract translation keys from a locale file
 */
function extractLocaleKeys(locale) {
  const localeFile = path.join(LOCALES_DIR, locale, 'errors.json');
  
  if (!fs.existsSync(localeFile)) {
    return new Set();
  }
  
  try {
    const content = fs.readFileSync(localeFile, 'utf8');
    const data = JSON.parse(content);
    const keys = new Set();
    
    // Extract all keys except those starting with _
    for (const key in data) {
      if (!key.startsWith('_')) {
        keys.add(key);
      }
    }
    
    return keys;
  } catch (error) {
    console.warn(`Warning: Could not parse ${localeFile}:`, error.message);
    return new Set();
  }
}

/**
 * Get all translation keys for all locales
 */
function getAllTranslationKeys() {
  const result = {};
  
  for (const locale of LOCALES) {
    result[locale] = extractLocaleKeys(locale);
  }
  
  return result;
}

// ============================================================================
// STEP 3: Compare and Analyze
// ============================================================================

/**
 * Analyze error codes vs translations
 */
function analyzeTranslations(allCodes, translationKeys) {
  const analysis = {
    fullyTranslated: [],
    partiallyTranslated: [],
    missingTranslation: [],
    missingByLocale: {}
  };
  
  // Initialize missing by locale
  for (const locale of LOCALES) {
    analysis.missingByLocale[locale] = [];
  }
  
  // Check each code
  for (const code of allCodes) {
    const localesWithTranslation = LOCALES.filter(
      locale => translationKeys[locale].has(code)
    );
    
    if (localesWithTranslation.length === LOCALES.length) {
      // Fully translated
      analysis.fullyTranslated.push(code);
    } else if (localesWithTranslation.length === 0) {
      // Not in any locale
      analysis.missingTranslation.push(code);
      for (const locale of LOCALES) {
        analysis.missingByLocale[locale].push(code);
      }
    } else {
      // Partially translated
      analysis.partiallyTranslated.push({
        code,
        translatedIn: localesWithTranslation,
        missingIn: LOCALES.filter(l => !localesWithTranslation.includes(l))
      });
      
      for (const locale of LOCALES) {
        if (!localesWithTranslation.includes(locale)) {
          analysis.missingByLocale[locale].push(code);
        }
      }
    }
  }
  
  return analysis;
}

// ============================================================================
// STEP 4: Generate Report
// ============================================================================

/**
 * Generate markdown report
 */
function generateReport(allCodes, successCodes, translationKeys, analysis) {
  const totalCodes = allCodes.size;
  
  let report = `# Error Translation Audit Report\n\n`;
  report += `Generated on: ${new Date().toISOString()}\n\n`;
  
  // Summary
  report += `## Summary\n\n`;
  report += `- **Total Error & Success Codes Found**: ${totalCodes}\n`;
  report += `  - Includes error codes from ErrorCode enum, ResponseBuilder, API routes, and Prisma handlers\n`;
  report += `  - Includes success codes from ResponseBuilder and API routes\n\n`;
  
  // Translation coverage by locale
  report += `### Translation Coverage by Locale\n\n`;
  for (const locale of LOCALES) {
    const hasTranslation = [...allCodes].filter(
      code => translationKeys[locale].has(code)
    ).length;
    const percentage = totalCodes > 0 
      ? ((hasTranslation / totalCodes) * 100).toFixed(1) 
      : 0;
    
    const exists = fs.existsSync(path.join(LOCALES_DIR, locale, 'errors.json'));
    const status = exists ? '✅' : '❌ (File does not exist)';
    
    report += `- **${locale.toUpperCase()}**: ${hasTranslation}/${totalCodes} (${percentage}%) ${status}\n`;
  }
  
  report += `\n`;
  
  // Fully translated codes
  report += `## Fully Translated Codes\n\n`;
  report += `Total: ${analysis.fullyTranslated.length}\n\n`;
  if (analysis.fullyTranslated.length > 0) {
    report += `\`\`\`\n`;
    report += analysis.fullyTranslated.sort().join(', ');
    report += `\n\`\`\`\n\n`;
  }
  
  // Partially translated codes
  report += `## Partially Translated Codes\n\n`;
  report += `Total: ${analysis.partiallyTranslated.length}\n\n`;
  if (analysis.partiallyTranslated.length > 0) {
    for (const item of analysis.partiallyTranslated) {
      report += `- **${item.code}**\n`;
      report += `  - ✅ Translated in: ${item.translatedIn.join(', ')}\n`;
      report += `  - ❌ Missing in: ${item.missingIn.join(', ')}\n\n`;
    }
  }
  
  // Missing translations by locale
  report += `## Missing Translations by Locale\n\n`;
  for (const locale of LOCALES) {
    const missing = analysis.missingByLocale[locale];
    if (missing.length === 0) {
      report += `### ${locale.toUpperCase()} (${locale})\n\n`;
      report += `✅ All codes have translations!\n\n`;
    } else {
      report += `### ${locale.toUpperCase()} (${locale})\n\n`;
      report += `Total missing: ${missing.length}\n\n`;
      report += `\`\`\`\n`;
      report += missing.sort().join(', ');
      report += `\n\`\`\`\n\n`;
    }
  }
  
  // Code sources breakdown
  report += `## Code Sources Breakdown\n\n`;
  report += `This report includes codes from:\n`;
  report += `- ErrorCode enum (packages/utils/src/core/errors.ts)\n`;
  report += `- ResponseBuilder ERROR_MESSAGES (packages/utils/src/api/response-builder.ts)\n`;
  report += `- ResponseBuilder SUCCESS_MESSAGES (packages/utils/src/api/response-builder.ts)\n`;
  report += `- API routes (apps/api/app/api/**/*.ts)\n`;
  report += `- Prisma error handlers (handlePrismaError function)\n\n`;
  
  return report;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🔍 Starting Error Translation Audit...\n');
  
  // Step 1: Extract all error codes
  console.log('Step 1: Extracting error codes from codebase...');
  const errorCodeEnum = extractErrorCodeEnum();
  console.log(`  - ErrorCode enum: ${errorCodeEnum.size} codes`);
  
  const responseBuilderErrors = extractResponseBuilderErrors();
  console.log(`  - ResponseBuilder ERROR_MESSAGES: ${responseBuilderErrors.size} codes`);
  
  const responseBuilderSuccess = extractResponseBuilderSuccess();
  console.log(`  - ResponseBuilder SUCCESS_MESSAGES: ${responseBuilderSuccess.size} codes`);
  
  const apiRouteCodes = extractApiRouteCodes();
  console.log(`  - API routes: ${apiRouteCodes.size} codes`);
  
  const prismaErrorCodes = extractPrismaErrorCodes();
  console.log(`  - Prisma error handlers: ${prismaErrorCodes.size} codes`);
  
  // Combine all error codes (excluding success codes for error analysis)
  const allErrorCodes = new Set([
    ...errorCodeEnum,
    ...responseBuilderErrors,
    ...apiRouteCodes,
    ...prismaErrorCodes
  ]);
  
  // All codes (errors + success)
  const allCodes = new Set([
    ...allErrorCodes,
    ...responseBuilderSuccess,
    ...apiRouteCodes // Might include success codes
  ]);
  
  console.log(`  ✅ Total unique error codes: ${allErrorCodes.size}`);
  console.log(`  ✅ Total unique codes (errors + success): ${allCodes.size}\n`);
  
  // Step 2: Extract translation keys
  console.log('Step 2: Extracting translation keys from locale files...');
  const translationKeys = getAllTranslationKeys();
  for (const locale of LOCALES) {
    console.log(`  - ${locale}: ${translationKeys[locale].size} keys`);
  }
  console.log('');
  
  // Step 3: Analyze
  console.log('Step 3: Analyzing translations...');
  const analysis = analyzeTranslations(allCodes, translationKeys);
  console.log(`  - Fully translated: ${analysis.fullyTranslated.length}`);
  console.log(`  - Partially translated: ${analysis.partiallyTranslated.length}`);
  console.log(`  - Missing translations: ${analysis.missingTranslation.length}\n`);
  
  // Step 4: Generate report
  console.log('Step 4: Generating report...');
  const report = generateReport(allCodes, responseBuilderSuccess, translationKeys, analysis);
  fs.writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`  ✅ Report saved to: ${REPORT_FILE}\n`);
  
  // Summary
  console.log('📊 Summary:');
  console.log(`  Total codes: ${allCodes.size}`);
  for (const locale of LOCALES) {
    const hasTranslation = [...allCodes].filter(
      code => translationKeys[locale].has(code)
    ).length;
    const percentage = ((hasTranslation / allCodes.size) * 100).toFixed(1);
    const exists = fs.existsSync(path.join(LOCALES_DIR, locale, 'errors.json'));
    console.log(`  ${locale.toUpperCase()}: ${hasTranslation}/${allCodes.size} (${percentage}%) ${exists ? '✅' : '❌'}`);
  }
  console.log('');
}

// Run the audit
main().catch(error => {
  console.error('❌ Error running audit:', error);
  console.error(error.stack);
  process.exit(1);
});

