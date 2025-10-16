#!/usr/bin/env node

/**
 * Auto-fix API Standardization Issues
 * Tự động sửa các vấn đề về chuẩn hóa API
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Màu sắc cho terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

let fixedFiles = 0;
let totalFixes = 0;

// Fix 1: Add missing ResponseBuilder import
function fixResponseBuilderImport(content, filePath) {
  const hasResponseBuilderUsage = /ResponseBuilder\.(error|success|validationError)/g.test(content);
  const hasResponseBuilderImport = /import.*ResponseBuilder.*from.*@rentalshop\/utils/g.test(content);
  
  if (hasResponseBuilderUsage && !hasResponseBuilderImport) {
    console.log(`   ${colors.yellow}→${colors.reset} Adding ResponseBuilder import`);
    
    // Find existing @rentalshop/utils import
    const utilsImportMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]@rentalshop\/utils['"]/);
    
    if (utilsImportMatch) {
      // Add ResponseBuilder to existing import
      const existingImports = utilsImportMatch[1].trim();
      const newImports = existingImports + ', ResponseBuilder';
      content = content.replace(
        utilsImportMatch[0],
        `import { ${newImports} } from '@rentalshop/utils'`
      );
    } else {
      // Add new import after other imports
      const importMatch = content.match(/^(import[^;]+;?\n)+/m);
      if (importMatch) {
        const lastImportIndex = importMatch[0].lastIndexOf('\n');
        const beforeImports = content.substring(0, importMatch.index + lastImportIndex + 1);
        const afterImports = content.substring(importMatch.index + lastImportIndex + 1);
        content = beforeImports + "import { ResponseBuilder } from '@rentalshop/utils';\n" + afterImports;
      }
    }
    
    totalFixes++;
    return { content, fixed: true };
  }
  
  return { content, fixed: false };
}

// Fix 2: Remove duplicate code/message fields
function fixDuplicateFields(content, filePath) {
  let fixed = false;
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for duplicate "code:" in same line
    const codeMatches = line.match(/code:\s*['"][^'"]+['"]/g);
    if (codeMatches && codeMatches.length > 1) {
      console.log(`   ${colors.yellow}→${colors.reset} Fixing duplicate 'code' field at line ${i + 1}`);
      // Keep only the first occurrence
      let newLine = line;
      for (let j = 1; j < codeMatches.length; j++) {
        newLine = newLine.replace(', ' + codeMatches[j], '');
        newLine = newLine.replace(codeMatches[j] + ', ', '');
      }
      lines[i] = newLine;
      fixed = true;
      totalFixes++;
    }
    
    // Check for duplicate "message:" in same line
    const messageMatches = line.match(/message:\s*['"][^'"]+['"]/g);
    if (messageMatches && messageMatches.length > 1) {
      console.log(`   ${colors.yellow}→${colors.reset} Fixing duplicate 'message' field at line ${i + 1}`);
      // Keep only the last occurrence (usually more descriptive)
      let newLine = line;
      for (let j = 0; j < messageMatches.length - 1; j++) {
        newLine = newLine.replace(', ' + messageMatches[j], '');
        newLine = newLine.replace(messageMatches[j] + ', ', '');
      }
      lines[i] = newLine;
      fixed = true;
      totalFixes++;
    }
  }
  
  if (fixed) {
    content = lines.join('\n');
  }
  
  return { content, fixed };
}

// Fix 3: Add handleApiError or ResponseBuilder.error to catch blocks
function fixCatchBlocks(content, filePath) {
  let fixed = false;
  
  // Pattern to match catch blocks without proper error handling
  const catchBlockPattern = /catch\s*\([^)]*\)\s*{([^}]*)}/g;
  const matches = [...content.matchAll(catchBlockPattern)];
  
  for (const match of matches) {
    const catchBody = match[1];
    const hasHandleApiError = /handleApiError\(/g.test(catchBody);
    const hasResponseBuilderError = /ResponseBuilder\.error\(/g.test(catchBody);
    const hasConsoleError = /console\.error\(/g.test(catchBody);
    
    if (!hasHandleApiError && !hasResponseBuilderError && hasConsoleError) {
      console.log(`   ${colors.yellow}→${colors.reset} Adding proper error handling to catch block`);
      
      // Add handleApiError after console.error
      const newCatchBody = catchBody.replace(
        /(console\.error[^;]+;)/,
        `$1\n    \n    // Use unified error handling system\n    const { response, statusCode } = handleApiError(error);\n    return NextResponse.json(response, { status: statusCode });`
      );
      
      content = content.replace(match[0], match[0].replace(catchBody, newCatchBody));
      fixed = true;
      totalFixes++;
    }
  }
  
  return { content, fixed };
}

// Hàm chính
async function fixAPIFiles() {
  console.log(`${colors.cyan}┌─────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.cyan}│  Auto-fix API Standardization Issues       │${colors.reset}`);
  console.log(`${colors.cyan}└─────────────────────────────────────────────┘${colors.reset}\n`);

  const apiDir = path.join(__dirname, '../apps/api/app/api');
  const files = await glob('**/route.ts', { cwd: apiDir, absolute: false });

  console.log(`${colors.blue}📁 Processing ${files.length} API route files...${colors.reset}\n`);

  for (const file of files) {
    const filePath = path.join(apiDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let fileFixed = false;

    // Apply fixes
    const fix1 = fixResponseBuilderImport(content, filePath);
    if (fix1.fixed) {
      content = fix1.content;
      fileFixed = true;
    }

    const fix2 = fixDuplicateFields(content, filePath);
    if (fix2.fixed) {
      content = fix2.content;
      fileFixed = true;
    }

    // Note: Catch block fixing is more complex and might break code, so we skip it for now
    // const fix3 = fixCatchBlocks(content, filePath);
    // if (fix3.fixed) {
    //   content = fix3.content;
    //   fileFixed = true;
    // }

    if (fileFixed) {
      fs.writeFileSync(filePath, content, 'utf-8');
      fixedFiles++;
      console.log(`${colors.green}✓${colors.reset} ${colors.magenta}${file}${colors.reset}`);
    }
  }

  // Summary
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Summary:${colors.reset}`);
  console.log(`  ${colors.green}Fixed files: ${fixedFiles}${colors.reset}`);
  console.log(`  ${colors.green}Total fixes: ${totalFixes}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n`);

  if (fixedFiles > 0) {
    console.log(`${colors.green}✅ Successfully fixed ${fixedFiles} files!${colors.reset}`);
    console.log(`${colors.yellow}💡 Run audit script again to verify: node scripts/audit-api-standardization.js${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✅ No issues found to fix automatically.${colors.reset}\n`);
  }
}

// Chạy fix
fixAPIFiles().catch(error => {
  console.error(`${colors.red}Error running fix:${colors.reset}`, error);
  process.exit(1);
});

