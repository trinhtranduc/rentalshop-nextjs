const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const EN_DIR = path.join(LOCALES_DIR, 'en');
const VI_DIR = path.join(LOCALES_DIR, 'vi');
const REPORT_FILE = path.join(__dirname, '..', 'TRANSLATION_AUDIT_REPORT.md');

// Results storage
const results = {
  translationFiles: {
    missingInVi: [],
    orphanInVi: [],
    totalFiles: 0,
    totalKeys: { en: 0, vi: 0 }
  },
  hardcodedStrings: {
    components: [],
    apiRoutes: [],
    validation: [],
    consoleAlerts: []
  },
  summary: {
    totalIssues: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
};

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    if (key.startsWith('_')) continue; // Skip metadata keys
    
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Get nested value from object by dot-notation key
 */
function getNestedValue(obj, key) {
  const parts = key.split('.');
  let value = obj;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  return value;
}

/**
 * Compare translation files between en and vi
 */
function compareTranslationFiles() {
  console.log('\n=== 1. COMPARING TRANSLATION FILES ===\n');
  
  const enFiles = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json'));
  const viFiles = fs.readdirSync(VI_DIR).filter(f => f.endsWith('.json'));
  
  results.translationFiles.totalFiles = enFiles.length;
  
  for (const file of enFiles) {
    const enPath = path.join(EN_DIR, file);
    const viPath = path.join(VI_DIR, file);
    
    if (!fs.existsSync(viPath)) {
      console.log(`⚠️  Missing Vietnamese file: ${file}`);
      results.translationFiles.missingInVi.push({
        file,
        reason: 'File does not exist'
      });
      continue;
    }
    
    try {
      const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
      const viContent = JSON.parse(fs.readFileSync(viPath, 'utf8'));
      
      const enKeys = getAllKeys(enContent);
      const viKeys = getAllKeys(viContent);
      
      results.translationFiles.totalKeys.en += enKeys.length;
      results.translationFiles.totalKeys.vi += viKeys.length;
      
      // Find keys missing in Vietnamese
      const missingInVi = enKeys.filter(key => {
        const viValue = getNestedValue(viContent, key);
        return viValue === undefined || viValue === '';
      });
      
      // Find orphan keys in Vietnamese (not in English)
      const orphanInVi = viKeys.filter(key => {
        const enValue = getNestedValue(enContent, key);
        return enValue === undefined;
      });
      
      if (missingInVi.length > 0) {
        results.translationFiles.missingInVi.push({
          file,
          keys: missingInVi.map(key => ({
            key,
            enValue: getNestedValue(enContent, key)
          }))
        });
        console.log(`❌ ${file}: ${missingInVi.length} keys missing in Vietnamese`);
      }
      
      if (orphanInVi.length > 0) {
        results.translationFiles.orphanInVi.push({
          file,
          keys: orphanInVi.map(key => ({
            key,
            viValue: getNestedValue(viContent, key)
          }))
        });
        console.log(`⚠️  ${file}: ${orphanInVi.length} orphan keys in Vietnamese`);
      }
      
      if (missingInVi.length === 0 && orphanInVi.length === 0) {
        console.log(`✅ ${file}: All keys translated`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  // Check for files in vi but not in en
  for (const file of viFiles) {
    if (!enFiles.includes(file)) {
      console.log(`⚠️  Extra Vietnamese file (not in English): ${file}`);
      results.translationFiles.orphanInVi.push({
        file,
        reason: 'File exists in vi but not in en'
      });
    }
  }
}

/**
 * Check if a string is likely a hardcoded text (not a translation key)
 */
function isLikelyHardcodedText(str, context = '') {
  // Clean the string
  const cleanStr = str.trim();
  
  // Skip if it's a translation key pattern (e.g., "common.save", "errors.NOT_FOUND")
  if (/^[a-z]+\.[a-z._]+$/i.test(cleanStr)) return false;
  
  // Skip if it's a variable name, import path, or type
  if (/^[A-Z][a-zA-Z]*$/.test(cleanStr) && cleanStr.length < 20) return false;
  if (cleanStr.includes('/') || cleanStr.includes('\\')) return false;
  if (cleanStr.startsWith('@') || cleanStr.startsWith('#') || cleanStr.startsWith('$')) return false;
  
  // Skip if it's a number or boolean
  if (/^\d+$/.test(cleanStr) || cleanStr === 'true' || cleanStr === 'false' || cleanStr === 'null' || cleanStr === 'undefined') return false;
  
  // Skip if it's a URL or path
  if (/^(https?|ftp|file):\/\//.test(cleanStr)) return false;
  
  // Skip if it's a CSS class or ID
  if (cleanStr.includes('className') || cleanStr.includes('class=') || cleanStr.includes('id=')) return false;
  
  // Skip if it's a code identifier (camelCase, snake_case, PascalCase)
  if (/^[a-z_][a-z0-9_]*$/i.test(cleanStr) && cleanStr.length < 15 && !cleanStr.includes(' ')) return false;
  
  // Skip single character or very short strings
  if (cleanStr.length < 4) return false;
  
  // Skip if it contains template variables (${...} or {variable})
  if (cleanStr.includes('${') || cleanStr.includes('{') && cleanStr.includes('}')) {
    // But allow if it's a complete sentence with template variables
    if (cleanStr.length > 30 && cleanStr.includes(' ')) {
      // This might be a template string with variables, check if it's user-facing
    } else {
      return false; // Likely a code template
    }
  }
  
  // Skip if it's a file extension or path
  if (/\.(ts|tsx|js|jsx|json|css|scss|png|jpg|svg)$/i.test(cleanStr)) return false;
  
  // Skip if it's a hex color or CSS value
  if (/^#[0-9a-f]{3,6}$/i.test(cleanStr) || /^(rgb|rgba|hsl|hsla)\(/.test(cleanStr)) return false;
  
  // Skip if it's a date format string
  if (/^(YYYY|MM|DD|HH|mm|ss|yyyy|mm|dd|hh|MMM|DDD)/.test(cleanStr)) return false;
  
  // Skip if it contains only special characters or code-like patterns
  if (/^[^a-zA-Z0-9\s]+$/.test(cleanStr)) return false;
  
  // Check if it contains spaces and looks like a sentence (user-facing text)
  if (cleanStr.includes(' ') && cleanStr.length > 5) {
    // Check if it starts with capital letter (likely a sentence)
    if (/^[A-Z]/.test(cleanStr)) {
      // Check if it contains common English words (likely user-facing)
      const commonWords = ['the', 'is', 'are', 'and', 'or', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'this', 'that', 'you', 'your', 'please', 'error', 'success', 'failed', 'required', 'invalid'];
      const lowerStr = cleanStr.toLowerCase();
      if (commonWords.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerStr);
      })) {
        return true;
      }
    }
    
    // Check for error/success message patterns
    if (/^(An?|The|You|Your|Please|Error|Success|Warning|Info|Failed|Required|Invalid|Valid)/i.test(cleanStr)) {
      return true;
    }
  }
  
  // Check for common UI text patterns (single words only)
  const uiWords = ['Save', 'Cancel', 'Delete', 'Edit', 'Add', 'Search', 'Filter', 'Submit', 'Confirm', 
    'Close', 'Back', 'Next', 'Previous', 'Create', 'Update', 'View', 'Download', 'Upload', 'Reset', 
    'Clear', 'Apply', 'Remove', 'Select', 'Choose', 'Enter', 'Type', 'Click', 'Loading', 'Error', 
    'Success', 'Warning', 'Info', 'Required', 'Invalid', 'Valid', 'Optional', 'Yes', 'No', 'OK', 
    'Done', 'Continue', 'Skip', 'Finish', 'Send', 'Get', 'Set', 'Show', 'Hide', 'Open', 'Start', 
    'Stop', 'Pause', 'Resume'];
  
  // Only check single words for UI patterns
  if (cleanStr.length < 15 && !cleanStr.includes(' ') && uiWords.some(word => 
    new RegExp(`^${word}$`, 'i').test(cleanStr)
  )) {
    return true;
  }
  
  // Check for placeholder patterns (but only if it's actually a placeholder)
  if (context.toLowerCase().includes('placeholder') && cleanStr.length > 5 && cleanStr.length < 50) {
    // Check if it looks like a user instruction
    if (/^(Enter|Type|Select|Choose|Pick|Click|Press|Tap|Swipe|Scroll|Drag|Drop|Move|Copy|Paste|Cut|Undo|Redo|Save|Load|Import|Export|Print|Share|Email|SMS|Call|Message|Chat|Video|Audio|Image|File|Folder|Document)/i.test(cleanStr)) {
      return true;
    }
  }
  
  // Check for error message patterns (sentences starting with common error words)
  if (cleanStr.length > 10 && /^(An?|The|You|Your|Please|Error|Success|Warning|Info|Failed|Required|Invalid|Valid|Missing|Not|Cannot|Can't|Don't|Won't|Should|Must|Need)/i.test(cleanStr)) {
    return true;
  }
  
  return false;
}

/**
 * Find hardcoded strings in TSX/TS files
 */
function findHardcodedStrings() {
  console.log('\n=== 2. SCANNING FOR HARDCODED STRINGS ===\n');
  
  const directories = [
    'packages/ui/src/components',
    'apps/admin/app',
    'apps/client/app'
  ];
  
  const fileExtensions = ['.tsx', '.ts'];
  
  for (const dir of directories) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Directory not found: ${dir}`);
      continue;
    }
    
    try {
      // Find all TSX/TS files
      const findCmd = `find "${fullPath}" -type f \\( -name "*.tsx" -o -name "*.ts" \\) -not -path "*/node_modules/*" -not -path "*/dist/*"`;
      const files = execSync(findCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
        .trim()
        .split('\n')
        .filter(Boolean);
      
      console.log(`Scanning ${files.length} files in ${dir}...`);
      
      for (const filePath of files) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          
          // Patterns to find hardcoded strings
          const patterns = [
            // String literals: "text" or 'text'
            /["']([^"']{4,})["']/g,
            // Template literals: `text`
            /`([^`]{4,})`/g,
            // JSX text content: <div>text</div>
            />([^<>{}\n]{4,})</g,
            // Placeholder attributes: placeholder="text"
            /placeholder\s*=\s*["']([^"']{4,})["']/gi,
            // Title/alt attributes: title="text"
            /(title|alt|aria-label)\s*=\s*["']([^"']{4,})["']/gi
          ];
          
          for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            
            // Skip comments
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
            
            // Skip import statements
            if (line.trim().startsWith('import ')) continue;
            
            // Skip type definitions
            if (line.includes(':') && (line.includes('string') || line.includes('number'))) {
              // Might be a type, skip if it's a type definition
              if (line.match(/:\s*(string|number|boolean)\s*[;=]/)) continue;
            }
            
            // Skip lines that are clearly code (imports, exports, type definitions)
            if (line.trim().startsWith('import ') || 
                line.trim().startsWith('export ') ||
                line.trim().startsWith('type ') ||
                line.trim().startsWith('interface ') ||
                line.trim().startsWith('const ') && line.includes(':') && line.includes('string') ||
                line.includes('useTranslation') ||
                line.includes('useTranslations') ||
                line.includes('t(') && line.includes(')')) {
              continue;
            }
            
            // Check for hardcoded strings
            for (const pattern of patterns) {
              let match;
              // Reset regex lastIndex
              pattern.lastIndex = 0;
              while ((match = pattern.exec(line)) !== null) {
                const text = match[1] || match[2] || match[0];
                if (!text) continue;
                
                const context = line.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30);
                
                // Skip if it's clearly a translation function call
                if (context.includes('t(') || context.includes('useTranslation')) continue;
                
                // Skip if it's in a comment
                if (context.trim().startsWith('//') || context.trim().startsWith('*')) continue;
                
                if (isLikelyHardcodedText(text, context)) {
                  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
                  
                  // Categorize by context
                  if (context.toLowerCase().includes('placeholder')) {
                    results.hardcodedStrings.components.push({
                      file: relativePath,
                      line: lineNum + 1,
                      text: text.trim(),
                      context: line.trim(),
                      category: 'placeholder'
                    });
                  } else if (context.toLowerCase().includes('error') || 
                             text.toLowerCase().includes('error') ||
                             text.toLowerCase().includes('failed') ||
                             text.toLowerCase().includes('invalid') ||
                             text.toLowerCase().includes('required')) {
                    results.hardcodedStrings.validation.push({
                      file: relativePath,
                      line: lineNum + 1,
                      text: text.trim(),
                      context: line.trim(),
                      category: 'error'
                    });
                  } else {
                    results.hardcodedStrings.components.push({
                      file: relativePath,
                      line: lineNum + 1,
                      text: text.trim(),
                      context: line.trim(),
                      category: 'ui'
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error reading ${filePath}:`, error.message);
        }
      }
    } catch (error) {
      console.log(`⚠️  Error scanning ${dir}:`, error.message);
    }
  }
  
  console.log(`Found ${results.hardcodedStrings.components.length} hardcoded strings in components`);
  console.log(`Found ${results.hardcodedStrings.validation.length} hardcoded validation messages`);
}

/**
 * Check API routes for hardcoded messages
 */
function checkApiRoutes() {
  console.log('\n=== 3. CHECKING API ROUTES ===\n');
  
  const apiDir = path.join(__dirname, '..', 'apps', 'api', 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.log('⚠️  API directory not found');
    return;
  }
  
  try {
    const findCmd = `find "${apiDir}" -type f -name "*.ts" -not -path "*/node_modules/*"`;
    const files = execSync(findCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
      .trim()
      .split('\n')
      .filter(Boolean);
    
    console.log(`Scanning ${files.length} API route files...`);
    
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];
          
          // Check for ResponseBuilder with hardcoded messages
          const responseBuilderPattern = /ResponseBuilder\.(error|success)\s*\(\s*['"]([A-Z_]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
          let match;
          while ((match = responseBuilderPattern.exec(line)) !== null) {
            const message = match[3];
            if (isLikelyHardcodedText(message)) {
              const relativePath = path.relative(path.join(__dirname, '..'), filePath);
              results.hardcodedStrings.apiRoutes.push({
                file: relativePath,
                line: lineNum + 1,
                code: match[2],
                message: message,
                context: line.trim()
              });
            }
          }
          
          // Check for message: 'hardcoded text' patterns
          const messagePattern = /message\s*:\s*['"]([^'"]{10,})['"]/g;
          while ((match = messagePattern.exec(line)) !== null) {
            const message = match[1];
            if (isLikelyHardcodedText(message)) {
              const relativePath = path.relative(path.join(__dirname, '..'), filePath);
              results.hardcodedStrings.apiRoutes.push({
                file: relativePath,
                line: lineNum + 1,
                message: message,
                context: line.trim(),
                category: 'message_property'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
      }
    }
    
    console.log(`Found ${results.hardcodedStrings.apiRoutes.length} hardcoded messages in API routes`);
  } catch (error) {
    console.log(`⚠️  Error scanning API routes:`, error.message);
  }
}

/**
 * Check for console.log/alert/confirm with hardcoded text
 */
function checkConsoleAlerts() {
  console.log('\n=== 4. CHECKING CONSOLE/ALERT MESSAGES ===\n');
  
  const directories = [
    'packages',
    'apps'
  ];
  
  for (const dir of directories) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) continue;
    
    try {
      const findCmd = `find "${fullPath}" -type f \\( -name "*.ts" -o -name "*.tsx" \\) -not -path "*/node_modules/*" -not -path "*/dist/*"`;
      const files = execSync(findCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
        .trim()
        .split('\n')
        .filter(Boolean);
      
      for (const filePath of files) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          
          for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            
            // Check for console.log/error/warn with strings
            const consolePattern = /console\.(log|error|warn|info)\s*\(\s*['"]([^'"]{10,})['"]/g;
            let match;
            while ((match = consolePattern.exec(line)) !== null) {
              const message = match[2];
              if (isLikelyHardcodedText(message)) {
                const relativePath = path.relative(path.join(__dirname, '..'), filePath);
                results.hardcodedStrings.consoleAlerts.push({
                  file: relativePath,
                  line: lineNum + 1,
                  type: `console.${match[1]}`,
                  message: message,
                  context: line.trim()
                });
              }
            }
            
            // Check for alert/confirm
            const alertPattern = /(alert|confirm)\s*\(\s*['"]([^'"]{10,})['"]/g;
            while ((match = alertPattern.exec(line)) !== null) {
              const message = match[2];
              if (isLikelyHardcodedText(message)) {
                const relativePath = path.relative(path.join(__dirname, '..'), filePath);
                results.hardcodedStrings.consoleAlerts.push({
                  file: relativePath,
                  line: lineNum + 1,
                  type: match[1],
                  message: message,
                  context: line.trim()
                });
              }
            }
          }
        } catch (error) {
          // Skip errors
        }
      }
    } catch (error) {
      // Skip errors
    }
  }
  
  console.log(`Found ${results.hardcodedStrings.consoleAlerts.length} console/alert messages`);
}

/**
 * Calculate summary statistics
 */
function calculateSummary() {
  // Critical: Missing translation keys
  results.summary.critical = results.translationFiles.missingInVi.reduce(
    (sum, item) => sum + (item.keys ? item.keys.length : 1), 0
  );
  
  // High: Hardcoded strings in UI components
  results.summary.high = results.hardcodedStrings.components.length;
  
  // Medium: Hardcoded API messages
  results.summary.medium = results.hardcodedStrings.apiRoutes.length;
  
  // Low: Console/alert messages
  results.summary.low = results.hardcodedStrings.consoleAlerts.length;
  
  results.summary.totalIssues = 
    results.summary.critical + 
    results.summary.high + 
    results.summary.medium + 
    results.summary.low;
}

/**
 * Generate markdown report
 */
function generateReport() {
  console.log('\n=== 5. GENERATING REPORT ===\n');
  
  let report = `# Translation Audit Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Issues Found**: ${results.summary.totalIssues}\n`;
  report += `- **Critical** (Missing Translation Keys): ${results.summary.critical}\n`;
  report += `- **High** (Hardcoded UI Strings): ${results.summary.high}\n`;
  report += `- **Medium** (Hardcoded API Messages): ${results.summary.medium}\n`;
  report += `- **Low** (Console/Alert Messages): ${results.summary.low}\n\n`;
  
  // Translation Files Section
  report += `## 1. Translation Files Comparison\n\n`;
  report += `**Total Files**: ${results.translationFiles.totalFiles}\n`;
  report += `**Total Keys (EN)**: ${results.translationFiles.totalKeys.en}\n`;
  report += `**Total Keys (VI)**: ${results.translationFiles.totalKeys.vi}\n\n`;
  
  if (results.translationFiles.missingInVi.length > 0) {
    report += `### Missing Keys in Vietnamese\n\n`;
    for (const item of results.translationFiles.missingInVi) {
      report += `#### ${item.file}\n\n`;
      if (item.reason) {
        report += `- ${item.reason}\n\n`;
      } else if (item.keys) {
        report += `**Missing ${item.keys.length} keys:**\n\n`;
        for (const keyItem of item.keys) {
          report += `- \`${keyItem.key}\`: "${keyItem.enValue}"\n`;
        }
        report += `\n`;
      }
    }
  } else {
    report += `✅ All translation files are complete!\n\n`;
  }
  
  if (results.translationFiles.orphanInVi.length > 0) {
    report += `### Orphan Keys in Vietnamese (not in English)\n\n`;
    for (const item of results.translationFiles.orphanInVi) {
      report += `#### ${item.file}\n\n`;
      if (item.reason) {
        report += `- ${item.reason}\n\n`;
      } else if (item.keys) {
        for (const keyItem of item.keys) {
          report += `- \`${keyItem.key}\`: "${keyItem.viValue}"\n`;
        }
        report += `\n`;
      }
    }
  }
  
  // Hardcoded Strings Section
  if (results.hardcodedStrings.components.length > 0) {
    report += `## 2. Hardcoded Strings in Components\n\n`;
    report += `**Total Found**: ${results.hardcodedStrings.components.length}\n\n`;
    
    // Group by file
    const byFile = {};
    for (const item of results.hardcodedStrings.components) {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push(item);
    }
    
    for (const [file, items] of Object.entries(byFile)) {
      report += `### ${file}\n\n`;
      for (const item of items) {
        report += `- **Line ${item.line}** (${item.category}): \`"${item.text}"\`\n`;
        report += `  \`\`\`\n  ${item.context}\n  \`\`\`\n\n`;
      }
    }
  }
  
  // API Routes Section
  if (results.hardcodedStrings.apiRoutes.length > 0) {
    report += `## 3. Hardcoded Messages in API Routes\n\n`;
    report += `**Total Found**: ${results.hardcodedStrings.apiRoutes.length}\n\n`;
    
    // Group by file
    const byFile = {};
    for (const item of results.hardcodedStrings.apiRoutes) {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push(item);
    }
    
    for (const [file, items] of Object.entries(byFile)) {
      report += `### ${file}\n\n`;
      for (const item of items) {
        report += `- **Line ${item.line}**: \`"${item.message}"\`\n`;
        if (item.code) {
          report += `  Code: \`${item.code}\`\n`;
        }
        report += `  \`\`\`\n  ${item.context}\n  \`\`\`\n\n`;
      }
    }
  }
  
  // Validation Messages Section
  if (results.hardcodedStrings.validation.length > 0) {
    report += `## 4. Hardcoded Validation Messages\n\n`;
    report += `**Total Found**: ${results.hardcodedStrings.validation.length}\n\n`;
    
    // Group by file
    const byFile = {};
    for (const item of results.hardcodedStrings.validation) {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push(item);
    }
    
    for (const [file, items] of Object.entries(byFile)) {
      report += `### ${file}\n\n`;
      for (const item of items) {
        report += `- **Line ${item.line}**: \`"${item.text}"\`\n`;
        report += `  \`\`\`\n  ${item.context}\n  \`\`\`\n\n`;
      }
    }
  }
  
  // Console/Alert Messages Section
  if (results.hardcodedStrings.consoleAlerts.length > 0) {
    report += `## 5. Console/Alert Messages\n\n`;
    report += `**Total Found**: ${results.hardcodedStrings.consoleAlerts.length}\n\n`;
    
    // Group by file
    const byFile = {};
    for (const item of results.hardcodedStrings.consoleAlerts) {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push(item);
    }
    
    for (const [file, items] of Object.entries(byFile)) {
      report += `### ${file}\n\n`;
      for (const item of items) {
        report += `- **Line ${item.line}** (${item.type}): \`"${item.message}"\`\n`;
        report += `  \`\`\`\n  ${item.context}\n  \`\`\`\n\n`;
      }
    }
  }
  
  // Recommendations
  report += `## Recommendations\n\n`;
  report += `1. **Priority 1 (Critical)**: Add missing translation keys to Vietnamese files\n`;
  report += `2. **Priority 2 (High)**: Replace hardcoded UI strings with translation keys\n`;
  report += `3. **Priority 3 (Medium)**: Move API error messages to translation files\n`;
  report += `4. **Priority 4 (Low)**: Consider translating console/alert messages for better UX\n\n`;
  
  report += `## Next Steps\n\n`;
  report += `1. Review this report and prioritize fixes\n`;
  report += `2. Add missing translation keys to \`locales/vi/*.json\` files\n`;
  report += `3. Replace hardcoded strings with \`t('namespace.key')\` calls\n`;
  report += `4. Run this script again to verify fixes\n\n`;
  
  // Write report
  fs.writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`✅ Report generated: ${REPORT_FILE}`);
}

/**
 * Main execution
 */
function main() {
  console.log('=== TRANSLATION AUDIT STARTED ===\n');
  
  compareTranslationFiles();
  findHardcodedStrings();
  checkApiRoutes();
  checkConsoleAlerts();
  calculateSummary();
  generateReport();
  
  console.log('\n=== TRANSLATION AUDIT COMPLETED ===');
  console.log(`\nTotal Issues: ${results.summary.totalIssues}`);
  console.log(`Report saved to: ${REPORT_FILE}`);
}

// Run the audit
main();

