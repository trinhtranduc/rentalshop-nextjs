#!/usr/bin/env node

/**
 * API Standardization Audit Script
 * Kiểm tra tất cả API route files để đảm bảo tuân thủ chuẩn hóa
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

// Các quy tắc kiểm tra
const rules = {
  // Rule 1: ResponseBuilder usage
  responseBuilder: {
    name: 'ResponseBuilder Import & Usage',
    check: (content, filePath) => {
      const issues = [];
      const hasResponseBuilderUsage = /ResponseBuilder\.(error|success|validationError)/g.test(content);
      const hasResponseBuilderImport = /import.*ResponseBuilder.*from.*@rentalshop\/utils/g.test(content);
      
      if (hasResponseBuilderUsage && !hasResponseBuilderImport) {
        issues.push({
          severity: 'error',
          message: 'File uses ResponseBuilder but missing import',
          line: null
        });
      }
      
      return issues;
    }
  },

  // Rule 2: withAuthRoles usage (except auth endpoints)
  authMiddleware: {
    name: 'Authentication Middleware',
    check: (content, filePath) => {
      const issues = [];
      const isAuthEndpoint = filePath.includes('/api/auth/') || 
                            filePath.includes('/health/') ||
                            filePath.includes('/docs/') ||
                            filePath.includes('/test/');
      
      if (!isAuthEndpoint) {
        const hasWithAuthRoles = /withAuthRoles\(/g.test(content);
        const hasExportFunction = /export\s+(const|async\s+function)\s+(GET|POST|PUT|PATCH|DELETE)/g.test(content);
        
        if (hasExportFunction && !hasWithAuthRoles) {
          issues.push({
            severity: 'warning',
            message: 'Endpoint should use withAuthRoles() for authentication',
            line: null
          });
        }
      }
      
      return issues;
    }
  },

  // Rule 3: handleApiError usage in catch blocks
  errorHandling: {
    name: 'Error Handling',
    check: (content, filePath) => {
      const issues = [];
      const catchBlocks = content.match(/catch\s*\([^)]*\)\s*{[^}]*}/g) || [];
      
      catchBlocks.forEach((catchBlock, index) => {
        const hasHandleApiError = /handleApiError\(/g.test(catchBlock);
        const hasResponseBuilderError = /ResponseBuilder\.error\(/g.test(catchBlock);
        
        if (!hasHandleApiError && !hasResponseBuilderError) {
          issues.push({
            severity: 'warning',
            message: `Catch block ${index + 1} should use handleApiError() or ResponseBuilder.error()`,
            line: null
          });
        }
      });
      
      return issues;
    }
  },

  // Rule 4: Duplicate object keys
  duplicateKeys: {
    name: 'Duplicate Object Keys',
    check: (content, filePath) => {
      const issues = [];
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for duplicate "code:" in same line
        const codeMatches = line.match(/code:\s*['"][^'"]+['"]/g);
        if (codeMatches && codeMatches.length > 1) {
          issues.push({
            severity: 'error',
            message: `Duplicate 'code' field in response object`,
            line: index + 1
          });
        }
        
        // Check for duplicate "message:" in same line
        const messageMatches = line.match(/message:\s*['"][^'"]+['"]/g);
        if (messageMatches && messageMatches.length > 1) {
          issues.push({
            severity: 'error',
            message: `Duplicate 'message' field in response object`,
            line: index + 1
          });
        }
      });
      
      return issues;
    }
  },

  // Rule 5: Input validation with schemas
  inputValidation: {
    name: 'Input Validation',
    check: (content, filePath) => {
      const issues = [];
      const hasPostOrPut = /export\s+(const|async\s+function)\s+(POST|PUT|PATCH)/g.test(content);
      
      if (hasPostOrPut) {
        const hasSchemaValidation = /\.safeParse\(|\.parse\(/g.test(content);
        
        if (!hasSchemaValidation) {
          issues.push({
            severity: 'warning',
            message: 'POST/PUT/PATCH endpoints should validate input with schemas',
            line: null
          });
        }
      }
      
      return issues;
    }
  },

  // Rule 6: Consistent response format
  responseFormat: {
    name: 'Response Format',
    check: (content, filePath) => {
      const issues = [];
      const returnStatements = content.match(/return\s+NextResponse\.json\([^)]+\)/g) || [];
      
      returnStatements.forEach((statement, index) => {
        // Check if response has "success" field
        const hasSuccessField = /success:\s*(true|false)/g.test(statement);
        const hasResponseBuilder = /ResponseBuilder\./g.test(statement);
        
        if (!hasSuccessField && !hasResponseBuilder) {
          issues.push({
            severity: 'info',
            message: `Response ${index + 1} should include 'success' field or use ResponseBuilder`,
            line: null
          });
        }
      });
      
      return issues;
    }
  },

  // Rule 7: Database access through simplified API
  databaseAccess: {
    name: 'Database Access',
    check: (content, filePath) => {
      const issues = [];
      const hasDirectPrismaImport = /import.*prisma.*from.*@prisma\/client/gi.test(content);
      const hasDbImport = /import.*db.*from.*@rentalshop\/database/gi.test(content);
      
      if (hasDirectPrismaImport && !hasDbImport) {
        issues.push({
          severity: 'warning',
          message: 'Should use simplified db API from @rentalshop/database instead of direct Prisma',
          line: null
        });
      }
      
      return issues;
    }
  }
};

// Hàm chính
async function auditAPIFiles() {
  console.log(`${colors.cyan}┌─────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.cyan}│  API Standardization Audit Report          │${colors.reset}`);
  console.log(`${colors.cyan}└─────────────────────────────────────────────┘${colors.reset}\n`);

  const apiDir = path.join(__dirname, '../apps/api/app/api');
  const files = await glob('**/route.ts', { cwd: apiDir, absolute: false });

  console.log(`${colors.blue}📁 Found ${files.length} API route files${colors.reset}\n`);

  let totalIssues = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  const fileIssues = [];

  for (const file of files) {
    const filePath = path.join(apiDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];

    // Chạy tất cả các rules
    Object.entries(rules).forEach(([ruleId, rule]) => {
      const ruleIssues = rule.check(content, filePath);
      issues.push(...ruleIssues);
    });

    if (issues.length > 0) {
      fileIssues.push({ file, issues });
      totalIssues += issues.length;
      
      // Đếm severity
      issues.forEach(issue => {
        if (issue.severity === 'error') errorCount++;
        else if (issue.severity === 'warning') warningCount++;
        else if (issue.severity === 'info') infoCount++;
      });
    }
  }

  // In ra kết quả
  if (fileIssues.length === 0) {
    console.log(`${colors.green}✅ All API files follow standardization rules!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  Found issues in ${fileIssues.length} files:${colors.reset}\n`);

    fileIssues.forEach(({ file, issues }) => {
      console.log(`${colors.magenta}📄 ${file}${colors.reset}`);
      
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        const color = issue.severity === 'error' ? colors.red : issue.severity === 'warning' ? colors.yellow : colors.blue;
        const lineInfo = issue.line ? ` (line ${issue.line})` : '';
        
        console.log(`   ${icon} ${color}${issue.message}${lineInfo}${colors.reset}`);
      });
      
      console.log('');
    });
  }

  // Summary
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Summary:${colors.reset}`);
  console.log(`  ${colors.red}Errors:   ${errorCount}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings: ${warningCount}${colors.reset}`);
  console.log(`  ${colors.blue}Info:     ${infoCount}${colors.reset}`);
  console.log(`  ${colors.cyan}Total:    ${totalIssues}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n`);

  // Đề xuất hành động
  if (errorCount > 0) {
    console.log(`${colors.red}🚨 Critical issues found! Please fix errors before deployment.${colors.reset}\n`);
    process.exit(1);
  } else if (warningCount > 0) {
    console.log(`${colors.yellow}⚠️  Warnings found. Consider fixing them for better code quality.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✨ Great! Your API follows all standardization rules.${colors.reset}\n`);
  }
}

// Chạy audit
auditAPIFiles().catch(error => {
  console.error(`${colors.red}Error running audit:${colors.reset}`, error);
  process.exit(1);
});

