const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Read translation files
const enErrors = JSON.parse(fs.readFileSync('locales/en/errors.json', 'utf8'));
const viErrors = JSON.parse(fs.readFileSync('locales/vi/errors.json', 'utf8'));
const enKeys = Object.keys(enErrors).filter(k => !k.startsWith('_'));
const viKeys = Object.keys(viErrors).filter(k => !k.startsWith('_'));

console.log('=== ERROR CODE TRANSLATION REVIEW ===\n');

// 1. Check if all English codes have Vietnamese translations
console.log('1. CHECKING ENGLISH -> VIETNAMESE TRANSLATIONS');
console.log('   English codes:', enKeys.length);
console.log('   Vietnamese codes:', viKeys.length);
const missingInVi = enKeys.filter(k => !viKeys.includes(k));
if (missingInVi.length > 0) {
  console.log('   ❌ MISSING IN VIETNAMESE:', missingInVi.length);
  missingInVi.forEach(k => console.log(`      - ${k}: "${enErrors[k]}"`));
} else {
  console.log('   ✅ All English codes have Vietnamese translations!');
}

// 2. Check for extra codes in Vietnamese
console.log('\n2. CHECKING FOR EXTRA CODES IN VIETNAMESE');
const extraInVi = viKeys.filter(k => !enKeys.includes(k));
if (extraInVi.length > 0) {
  console.log('   ⚠️  EXTRA IN VIETNAMESE (not in English):', extraInVi.length);
  extraInVi.forEach(k => console.log(`      - ${k}: "${viErrors[k]}"`));
} else {
  console.log('   ✅ Vietnamese file matches English file!');
}

// 3. Extract error codes from ErrorCode enum
console.log('\n3. CHECKING ERROR CODES FROM ErrorCode ENUM');
const errorsFile = fs.readFileSync('packages/utils/src/core/errors.ts', 'utf8');
const enumMatch = errorsFile.match(/export enum ErrorCode \{[\s\S]*?\}/);
const enumErrorCodes = [];
if (enumMatch) {
  const enumContent = enumMatch[0];
  const matches = [...enumContent.matchAll(/([A-Z_]+)\s*=\s*['"]([A-Z_]+)['"]/g)];
  matches.forEach(match => enumErrorCodes.push(match[2]));
}
console.log('   Found', enumErrorCodes.length, 'error codes in ErrorCode enum');
const missingEnumInEn = enumErrorCodes.filter(k => !enKeys.includes(k));
if (missingEnumInEn.length > 0) {
  console.log('   ❌ MISSING IN ENGLISH TRANSLATIONS:', missingEnumInEn.length);
  missingEnumInEn.forEach(k => console.log(`      - ${k}`));
} else {
  console.log('   ✅ All ErrorCode enum values are in English translations!');
}

// 4. Extract from response-builder.ts
console.log('\n4. CHECKING ERROR CODES FROM response-builder.ts');
const rbFile = fs.readFileSync('packages/utils/src/api/response-builder.ts', 'utf8');
const rbErrorMatch = rbFile.match(/const ERROR_MESSAGES: Record<string, string> = \{[\s\S]*?\};/);
const rbErrorCodes = [];
if (rbErrorMatch) {
  const rbContent = rbErrorMatch[0];
  const matches = [...rbContent.matchAll(/['"]([A-Z_]+)['"]:/g)];
  matches.forEach(match => rbErrorCodes.push(match[1]));
}
console.log('   Found', rbErrorCodes.length, 'error codes in ERROR_MESSAGES');
const missingRbInEn = rbErrorCodes.filter(k => !enKeys.includes(k));
if (missingRbInEn.length > 0) {
  console.log('   ❌ MISSING IN ENGLISH TRANSLATIONS:', missingRbInEn.length);
  missingRbInEn.forEach(k => console.log(`      - ${k}`));
} else {
  console.log('   ✅ All response-builder error codes are in English translations!');
}

const rbSuccessMatch = rbFile.match(/const SUCCESS_MESSAGES: Record<string, string> = \{[\s\S]*?\};/);
const rbSuccessCodes = [];
if (rbSuccessMatch) {
  const rbContent = rbSuccessMatch[0];
  const matches = [...rbContent.matchAll(/['"]([A-Z_]+)['"]:/g)];
  matches.forEach(match => rbSuccessCodes.push(match[1]));
}
console.log('   Found', rbSuccessCodes.length, 'success codes in SUCCESS_MESSAGES');
const missingRbSuccessInEn = rbSuccessCodes.filter(k => !enKeys.includes(k));
if (missingRbSuccessInEn.length > 0) {
  console.log('   ❌ MISSING IN ENGLISH TRANSLATIONS:', missingRbSuccessInEn.length);
  missingRbSuccessInEn.forEach(k => console.log(`      - ${k}`));
} else {
  console.log('   ✅ All response-builder success codes are in English translations!');
}

// 5. Extract from actual API route files
console.log('\n5. CHECKING ERROR CODES FROM API ROUTES');
try {
  // More accurate regex to extract error codes
  const grepCmd = 'grep -roh "ResponseBuilder\\.\\(error\\|success\\)([\\"\\\']\\([A-Z_][A-Z_]*\\)[\\"\\\']" apps/api --include="*.ts" | grep -oE "[A-Z_][A-Z_]*" | sort -u';
  const grepOutput = execSync(grepCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const apiErrorCodes = grepOutput.trim().split('\n').filter(Boolean).filter(k => k.length > 1 && k.includes('_'));
  console.log('   Found', apiErrorCodes.length, 'error/success codes in API routes');
  const missingApiInEn = apiErrorCodes.filter(k => !enKeys.includes(k));
  if (missingApiInEn.length > 0) {
    console.log('   ❌ MISSING IN ENGLISH TRANSLATIONS:', missingApiInEn.length);
    missingApiInEn.forEach(k => console.log(`      - ${k}`));
  } else {
    console.log('   ✅ All API route error codes are in English translations!');
  }
} catch (error) {
  console.log('   ⚠️  Could not extract from API routes:', error.message);
}

// 6. Summary
console.log('\n=== SUMMARY ===');
const allCodeErrorCodes = [...new Set([...enumErrorCodes, ...rbErrorCodes, ...rbSuccessCodes])];
const allMissingInEn = allCodeErrorCodes.filter(k => !enKeys.includes(k));
const allMissingInVi = enKeys.filter(k => !viKeys.includes(k));

if (allMissingInEn.length === 0 && allMissingInVi.length === 0) {
  console.log('✅ PERFECT! All error codes are fully translated!');
  console.log('   - All codes in codebase are in English translations');
  console.log('   - All English codes have Vietnamese translations');
} else {
  console.log('⚠️  ISSUES FOUND:');
  if (allMissingInEn.length > 0) {
    console.log(`   - ${allMissingInEn.length} codes in codebase missing from English translations`);
  }
  if (allMissingInVi.length > 0) {
    console.log(`   - ${allMissingInVi.length} English codes missing Vietnamese translations`);
  }
}

