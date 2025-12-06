const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Comprehensive Error Code Translation Audit Script
 * 
 * This script:
 * 1. Extracts all error codes from ResponseBuilder.error() calls in apps/api/
 * 2. Extracts error codes from response-builder.ts (ERROR_MESSAGES, SUCCESS_MESSAGES)
 * 3. Extracts error codes from errors.ts (ErrorCode enum)
 * 4. Compares with translation files (en/errors.json, vi/errors.json)
 * 5. Generates comprehensive report
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract error codes from a file using regex
 */
function extractErrorCodesFromFile(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [...content.matchAll(new RegExp(pattern, 'g'))];
    return matches.map(match => match[1]).filter(Boolean);
  } catch (error) {
    console.warn(`  ⚠️  Could not read ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Extract error codes from ErrorCode enum
 */
function extractErrorCodesFromEnum(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const enumMatch = content.match(/export enum ErrorCode \{[\s\S]*?\}/);
    if (!enumMatch) return [];
    
    const enumContent = enumMatch[0];
    // Match: ERROR_CODE = 'ERROR_CODE' or ERROR_CODE = "ERROR_CODE"
    const matches = [...enumContent.matchAll(/([A-Z_]+)\s*=\s*['"]([A-Z_]+)['"]/g)];
    return matches.map(match => match[2]).filter(Boolean);
  } catch (error) {
    console.warn(`  ⚠️  Could not extract from enum: ${error.message}`);
    return [];
  }
}

/**
 * Extract error codes from ERROR_MESSAGES or SUCCESS_MESSAGES
 */
function extractErrorCodesFromMessages(filePath, messageType) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const pattern = new RegExp(`const ${messageType}: Record<string, string> = \\{([\\s\\S]*?)\\};`, 'g');
    const match = pattern.exec(content);
    if (!match) return [];
    
    const messagesContent = match[1];
    // Match: 'ERROR_CODE': or "ERROR_CODE":
    const matches = [...messagesContent.matchAll(/['"]([A-Z_]+)['"]\s*:/g)];
    return matches.map(match => match[1]).filter(Boolean);
  } catch (error) {
    console.warn(`  ⚠️  Could not extract ${messageType}: ${error.message}`);
    return [];
  }
}

/**
 * Extract error codes from all API route files
 */
function extractErrorCodesFromApiRoutes() {
  try {
    // Use grep to find all ResponseBuilder.error() calls
    // Pattern: ResponseBuilder.error('ERROR_CODE') or ResponseBuilder.error("ERROR_CODE")
    const grepCmd = 'grep -roh "ResponseBuilder\\.error([\\"\\\']\\([A-Z_][A-Z_]*\\)[\\"\\\']" apps/api --include="*.ts" --include="*.tsx" 2>/dev/null | grep -oE "[A-Z_][A-Z_]*" | sort -u';
    const grepOutput = execSync(grepCmd, { 
      encoding: 'utf8', 
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const codes = grepOutput.trim().split('\n').filter(Boolean);
    // Filter out invalid codes (must contain underscore and be uppercase)
    return codes.filter(code => code.includes('_') && code === code.toUpperCase() && code.length > 2);
  } catch (error) {
    console.warn(`  ⚠️  Could not extract from API routes: ${error.message}`);
    return [];
  }
}

/**
 * Load translation file and filter out comment keys
 */
function loadTranslationFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const keys = Object.keys(data).filter(k => !k.startsWith('_'));
    return { data, keys };
  } catch (error) {
    console.error(`  ❌ Could not load ${filePath}: ${error.message}`);
    return { data: {}, keys: [] };
  }
}

/**
 * Group error codes by category
 */
function categorizeErrorCodes(codes, enErrors) {
  const categories = {
    'Authentication & Authorization': [],
    'Validation Errors': [],
    'Not Found Errors': [],
    'Conflict Errors': [],
    'Business Rules': [],
    'System Errors': [],
    'File Upload': [],
    'Success Messages': [],
    'Other': []
  };
  
  codes.forEach(code => {
    const message = enErrors[code] || '';
    if (code.includes('AUTH') || code.includes('TOKEN') || code.includes('CREDENTIAL') || code.includes('PERMISSION') || code.includes('ACCESS')) {
      categories['Authentication & Authorization'].push(code);
    } else if (code.includes('VALIDATION') || code.includes('INVALID') || code.includes('MISSING') || code.includes('REQUIRED')) {
      categories['Validation Errors'].push(code);
    } else if (code.includes('NOT_FOUND') || code.includes('NO_')) {
      categories['Not Found Errors'].push(code);
    } else if (code.includes('EXISTS') || code.includes('DUPLICATE') || code.includes('ALREADY')) {
      categories['Conflict Errors'].push(code);
    } else if (code.includes('CANNOT') || code.includes('HAS_ACTIVE') || code.includes('LIMIT')) {
      categories['Business Rules'].push(code);
    } else if (code.includes('FAILED') || code.includes('ERROR') || code.includes('INTERNAL')) {
      categories['System Errors'].push(code);
    } else if (code.includes('IMAGE') || code.includes('UPLOAD') || code.includes('FILE')) {
      categories['File Upload'].push(code);
    } else if (code.includes('SUCCESS')) {
      categories['Success Messages'].push(code);
    } else {
      categories['Other'].push(code);
    }
  });
  
  return categories;
}

// ============================================================================
// MAIN AUDIT FUNCTION
// ============================================================================

function runAudit() {
  console.log('=== ERROR CODE TRANSLATION AUDIT ===\n');
  
  // Load translation files
  console.log('📂 Loading translation files...');
  const enTranslation = loadTranslationFile('locales/en/errors.json');
  const viTranslation = loadTranslationFile('locales/vi/errors.json');
  const enKeys = enTranslation.keys;
  const viKeys = viTranslation.keys;
  
  console.log(`   ✅ Loaded ${enKeys.length} English error codes`);
  console.log(`   ✅ Loaded ${viKeys.length} Vietnamese error codes\n`);
  
  // Extract error codes from various sources
  console.log('🔍 Extracting error codes from codebase...\n');
  
  // 1. From ErrorCode enum
  console.log('1. Extracting from ErrorCode enum...');
  const enumCodes = extractErrorCodesFromEnum('packages/utils/src/core/errors.ts');
  console.log(`   Found ${enumCodes.length} error codes in ErrorCode enum`);
  
  // 2. From response-builder.ts ERROR_MESSAGES
  console.log('\n2. Extracting from response-builder.ts ERROR_MESSAGES...');
  const errorMessages = extractErrorCodesFromMessages('packages/utils/src/api/response-builder.ts', 'ERROR_MESSAGES');
  console.log(`   Found ${errorMessages.length} error codes in ERROR_MESSAGES`);
  
  // 3. From response-builder.ts SUCCESS_MESSAGES
  console.log('\n3. Extracting from response-builder.ts SUCCESS_MESSAGES...');
  const successMessages = extractErrorCodesFromMessages('packages/utils/src/api/response-builder.ts', 'SUCCESS_MESSAGES');
  console.log(`   Found ${successMessages.length} success codes in SUCCESS_MESSAGES`);
  
  // 4. From API route files
  console.log('\n4. Extracting from API route files...');
  const apiRouteCodes = extractErrorCodesFromApiRoutes();
  console.log(`   Found ${apiRouteCodes.length} error codes in API routes`);
  
  // Combine all codes from codebase
  const allCodebaseCodes = [...new Set([...enumCodes, ...errorMessages, ...successMessages, ...apiRouteCodes])];
  console.log(`\n   📊 Total unique error codes in codebase: ${allCodebaseCodes.length}`);
  
  // ============================================================================
  // COMPARISON AND ANALYSIS
  // ============================================================================
  
  console.log('\n📊 COMPARISON AND ANALYSIS\n');
  
  // Missing in English
  const missingInEn = allCodebaseCodes.filter(code => !enKeys.includes(code));
  
  // Missing in Vietnamese
  const missingInVi = enKeys.filter(code => !viKeys.includes(code));
  
  // Unused codes (in translation files but not in codebase)
  const unusedCodes = enKeys.filter(code => !allCodebaseCodes.includes(code));
  
  // Statistics
  const totalInCodebase = allCodebaseCodes.length;
  const totalInEn = enKeys.length;
  const totalInVi = viKeys.length;
  const coverageEn = totalInCodebase > 0 ? ((totalInCodebase - missingInEn.length) / totalInCodebase * 100).toFixed(1) : 100;
  const coverageVi = totalInEn > 0 ? ((totalInEn - missingInVi.length) / totalInEn * 100).toFixed(1) : 100;
  
  // ============================================================================
  // CONSOLE OUTPUT
  // ============================================================================
  
  console.log('📊 STATISTICS:');
  console.log(`   - Total error codes in codebase: ${totalInCodebase}`);
  console.log(`   - Total error codes in en/errors.json: ${totalInEn}`);
  console.log(`   - Total error codes in vi/errors.json: ${totalInVi}`);
  console.log(`   - English coverage: ${coverageEn}%`);
  console.log(`   - Vietnamese coverage: ${coverageVi}%`);
  
  // Missing in English
  console.log(`\n❌ MISSING IN ENGLISH (${missingInEn.length}):`);
  if (missingInEn.length === 0) {
    console.log('   ✅ All error codes from codebase are in English translations!');
  } else {
    const categorized = categorizeErrorCodes(missingInEn, enTranslation.data);
    Object.entries(categorized).forEach(([category, codes]) => {
      if (codes.length > 0) {
        console.log(`\n   ${category}:`);
        codes.forEach(code => {
          // Try to find where it's used
          const usedIn = [];
          if (apiRouteCodes.includes(code)) usedIn.push('API routes');
          if (errorMessages.includes(code)) usedIn.push('ERROR_MESSAGES');
          if (successMessages.includes(code)) usedIn.push('SUCCESS_MESSAGES');
          if (enumCodes.includes(code)) usedIn.push('ErrorCode enum');
          console.log(`      - ${code} (used in: ${usedIn.join(', ') || 'unknown'})`);
        });
      }
    });
  }
  
  // Missing in Vietnamese
  console.log(`\n❌ MISSING IN VIETNAMESE (${missingInVi.length}):`);
  if (missingInVi.length === 0) {
    console.log('   ✅ All English codes have Vietnamese translations!');
  } else {
    const categorized = categorizeErrorCodes(missingInVi, enTranslation.data);
    Object.entries(categorized).forEach(([category, codes]) => {
      if (codes.length > 0) {
        console.log(`\n   ${category}:`);
        codes.forEach(code => {
          const enMessage = enTranslation.data[code] || 'N/A';
          console.log(`      - ${code}: "${enMessage}"`);
        });
      }
    });
  }
  
  // Unused codes
  console.log(`\n⚠️  UNUSED CODES (${unusedCodes.length}):`);
  if (unusedCodes.length === 0) {
    console.log('   ✅ No unused codes found!');
  } else {
    console.log('   (Codes in translation files but not used in codebase)');
    const categorized = categorizeErrorCodes(unusedCodes, enTranslation.data);
    Object.entries(categorized).forEach(([category, codes]) => {
      if (codes.length > 0 && codes.length <= 20) {
        console.log(`\n   ${category}:`);
        codes.slice(0, 20).forEach(code => {
          console.log(`      - ${code}`);
        });
        if (codes.length > 20) {
          console.log(`      ... and ${codes.length - 20} more`);
        }
      }
    });
  }
  
  // ============================================================================
  // GENERATE REPORT
  // ============================================================================
  
  console.log('\n📝 Generating report...');
  
  const report = {
    generatedAt: new Date().toISOString(),
    statistics: {
      totalInCodebase,
      totalInEn,
      totalInVi,
      coverageEn: parseFloat(coverageEn),
      coverageVi: parseFloat(coverageVi),
      missingInEnCount: missingInEn.length,
      missingInViCount: missingInVi.length,
      unusedCount: unusedCodes.length
    },
    missingInEnglish: categorizeErrorCodes(missingInEn, enTranslation.data),
    missingInVietnamese: categorizeErrorCodes(missingInVi, enTranslation.data),
    unusedCodes: categorizeErrorCodes(unusedCodes, enTranslation.data)
  };
  
  // Generate markdown report
  let markdown = `# Error Code Translation Audit Report\n\n`;
  markdown += `**Generated at:** ${new Date().toLocaleString()}\n\n`;
  
  markdown += `## 📊 Statistics\n\n`;
  markdown += `- **Total error codes in codebase:** ${totalInCodebase}\n`;
  markdown += `- **Total error codes in en/errors.json:** ${totalInEn}\n`;
  markdown += `- **Total error codes in vi/errors.json:** ${totalInVi}\n`;
  markdown += `- **English coverage:** ${coverageEn}%\n`;
  markdown += `- **Vietnamese coverage:** ${coverageVi}%\n\n`;
  
  if (missingInEn.length > 0) {
    markdown += `## ❌ Missing in English Translations\n\n`;
    markdown += `**Total:** ${missingInEn.length} error codes\n\n`;
    Object.entries(report.missingInEnglish).forEach(([category, codes]) => {
      if (codes.length > 0) {
        markdown += `### ${category}\n\n`;
        codes.forEach(code => {
          const usedIn = [];
          if (apiRouteCodes.includes(code)) usedIn.push('API routes');
          if (errorMessages.includes(code)) usedIn.push('ERROR_MESSAGES');
          if (successMessages.includes(code)) usedIn.push('SUCCESS_MESSAGES');
          if (enumCodes.includes(code)) usedIn.push('ErrorCode enum');
          markdown += `- \`${code}\` (used in: ${usedIn.join(', ') || 'unknown'})\n`;
        });
        markdown += '\n';
      }
    });
  }
  
  if (missingInVi.length > 0) {
    markdown += `## ❌ Missing in Vietnamese Translations\n\n`;
    markdown += `**Total:** ${missingInVi.length} error codes\n\n`;
    Object.entries(report.missingInVietnamese).forEach(([category, codes]) => {
      if (codes.length > 0) {
        markdown += `### ${category}\n\n`;
        codes.forEach(code => {
          const enMessage = enTranslation.data[code] || 'N/A';
          markdown += `- \`${code}\`: "${enMessage}"\n`;
        });
        markdown += '\n';
      }
    });
  }
  
  if (unusedCodes.length > 0) {
    markdown += `## ⚠️  Unused Codes\n\n`;
    markdown += `**Total:** ${unusedCodes.length} error codes\n\n`;
    markdown += `These codes exist in translation files but are not used in the codebase.\n\n`;
    Object.entries(report.unusedCodes).forEach(([category, codes]) => {
      if (codes.length > 0) {
        markdown += `### ${category}\n\n`;
        codes.slice(0, 50).forEach(code => {
          markdown += `- \`${code}\`\n`;
        });
        if (codes.length > 50) {
          markdown += `\n... and ${codes.length - 50} more\n`;
        }
        markdown += '\n';
      }
    });
  }
  
  markdown += `## ✅ Recommendations\n\n`;
  if (missingInEn.length === 0 && missingInVi.length === 0) {
    markdown += `🎉 **Perfect!** All error codes are fully translated!\n\n`;
    markdown += `- All codes from codebase are in English translations\n`;
    markdown += `- All English codes have Vietnamese translations\n`;
  } else {
    if (missingInEn.length > 0) {
      markdown += `1. **Add missing English translations** (${missingInEn.length} codes)\n`;
      markdown += `   - Add these codes to \`locales/en/errors.json\`\n`;
      markdown += `   - Provide appropriate English error messages\n\n`;
    }
    if (missingInVi.length > 0) {
      markdown += `2. **Add missing Vietnamese translations** (${missingInVi.length} codes)\n`;
      markdown += `   - Add these codes to \`locales/vi/errors.json\`\n`;
      markdown += `   - Translate from English messages\n\n`;
    }
  }
  
  // Write report
  fs.writeFileSync('ERROR_TRANSLATION_AUDIT_REPORT.md', markdown, 'utf8');
  console.log('   ✅ Report generated: ERROR_TRANSLATION_AUDIT_REPORT.md');
  
  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log('\n=== SUMMARY ===');
  if (missingInEn.length === 0 && missingInVi.length === 0) {
    console.log('✅ PERFECT! All error codes are fully translated!');
    console.log('   - All codes from codebase are in English translations');
    console.log('   - All English codes have Vietnamese translations');
    process.exit(0);
  } else {
    console.log('⚠️  ISSUES FOUND:');
    if (missingInEn.length > 0) {
      console.log(`   - ${missingInEn.length} codes in codebase missing from English translations`);
    }
    if (missingInVi.length > 0) {
      console.log(`   - ${missingInVi.length} English codes missing Vietnamese translations`);
    }
    console.log('\n   📄 See ERROR_TRANSLATION_AUDIT_REPORT.md for details');
    process.exit(1);
  }
}

// Run audit
runAudit();
