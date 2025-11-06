import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Official esbuild plugin to exclude React from server-side bundle
// This intercepts ALL React-related imports at build time and prevents them from being included
const excludeReactPlugin = {
  name: 'exclude-react',
  setup(build) {
    // Intercept all React module paths - comprehensive coverage
    const reactPaths = [
      /^react$/,                    // react
      /^react\/jsx-runtime$/,       // react/jsx-runtime
      /^react\/jsx-dev-runtime$/,   // react/jsx-dev-runtime
      /^react-dom$/,                // react-dom
      /^react-dom\/client$/,        // react-dom/client
      /^react-dom\/server$/,        // react-dom/server
      /^lucide-react$/,            // lucide-react (contains React components)
    ];
    
    reactPaths.forEach(filter => {
      build.onResolve({ filter }, (args) => {
        // Return stub namespace for all React imports
        return {
          path: args.path,
          namespace: 'react-stub',
        };
      });
    });
    
    // Also catch any imports that start with 'react' (defensive)
    build.onResolve({ filter: /^react\// }, (args) => {
      return {
        path: args.path,
        namespace: 'react-stub',
      };
    });
    
    // Intercept lucide-react (contains React components)
    build.onResolve({ filter: /^lucide-react$/ }, () => ({
      path: 'lucide-react',
      namespace: 'react-stub',
    }));
    
    // Provide empty module for ALL React stubs
    build.onLoad({ filter: /.*/, namespace: 'react-stub' }, () => ({
      contents: '// React excluded for server-side bundle',
      loader: 'js',
    }));
  },
};

// Post-build: Remove React imports from generated files (comprehensive cleanup)
// This ensures React imports are completely removed even if plugin doesn't catch everything
const removeReactImports = (outDir: string) => {
  const esmPath = join(outDir, 'index.mjs');
  const cjsPath = join(outDir, 'index.js');
  
  // Comprehensive ESM import removal patterns
  const removeESMImports = (content: string): string => {
        // Default imports: import React from 'react' or import React2 from 'react'
        content = content.replace(/import\s+React\d*\s+from\s+['"]react['"];?\n?/g, '');
        
        // Named imports: import { useState, useEffect } from 'react'
        content = content.replace(/import\s+\{[^}]*\}\s+from\s+['"]react['"];?\n?/g, '');
        
        // Mixed imports: import React, { useState } from 'react'
        content = content.replace(/import\s+React\d*\s*,\s*\{[^}]*\}\s+from\s+['"]react['"];?\n?/g, '');
        content = content.replace(/import\s+\{[^}]*\}\s*,\s*React\d*\s+from\s+['"]react['"];?\n?/g, '');
        
        // Any import with React in it: import * as React from 'react'
        content = content.replace(/import\s+.*\bReact\d*\b.*from\s+['"]react['"];?\n?/g, '');
    
    // Side-effect imports: import 'react' or import 'react/jsx-runtime'
    content = content.replace(/import\s+['"]react['"];?\n?/g, '');
    content = content.replace(/import\s+['"]react\/jsx-runtime['"];?\n?/g, '');
    content = content.replace(/import\s+['"]react\/jsx-dev-runtime['"];?\n?/g, '');
    content = content.replace(/import\s+['"]react-dom['"];?\n?/g, '');
    content = content.replace(/import\s+['"]react-dom\/client['"];?\n?/g, '');
    content = content.replace(/import\s+['"]react-dom\/server['"];?\n?/g, '');
    content = content.replace(/import\s+['"]lucide-react['"];?\n?/g, '');
    
    // Any import from react/* paths
    content = content.replace(/import\s+.*from\s+['"]react\/[^'"]*['"];?\n?/g, '');
    
    // Any import from lucide-react (including partial lines like "} from 'lucide-react'")
    // First, remove complete import statements
    content = content.replace(/import\s+.*from\s+['"]lucide-react['"];?\n?/g, '');
    
    // Remove closing braces and "from 'lucide-react'" lines
    content = content.replace(/}\s+from\s+['"]lucide-react['"];?\n?/g, '');
    content = content.replace(/,\s*\}\s+from\s+['"]lucide-react['"];?\n?/g, '');
    
    // Remove orphaned icon names that were part of lucide-react imports
    // Pattern: sequences of PascalCase identifiers (icon names) followed by an import statement
    // This catches cases like "TrendingUp,\nTrendingDown,\nAlertTriangle\nimport { ... }"
    // where we've already removed the "} from 'lucide-react'" part
    content = content.replace(/(?:^\s*[A-Z][a-zA-Z0-9]+(?:\s+as\s+[A-Z][a-zA-Z0-9]+)?\s*,?\s*\n)+/gm, (match, offset, string) => {
      // Check if this sequence is followed by an import statement (orphaned icons)
      const afterMatch = string.substring(offset + match.length);
      const nextNonEmptyLine = afterMatch.split('\n').find(line => line.trim()) || '';
      if (/^\s*import\s+/.test(nextNonEmptyLine)) {
        return ''; // Remove orphaned icon names
      }
      return match; // Keep if it's part of valid code
    });
    
    // Replace icon references in object properties (e.g., icon: TrendingUp -> icon: null)
    // This handles cases where icons are used in code but the import was removed
    // Also handles renamed icons (e.g., TrendingUp2, XCircle2) from esbuild
    const iconNames = [
      'TrendingUp', 'TrendingDown', 'AlertTriangle', 'UserCheck', 'UserX',
      'CheckCircle', 'XCircle', 'MapPin', 'Building2', 'Store', 'UserIcon',
      'Shield', 'Package', 'DollarSign', 'ShoppingCart', 'User', 'Phone',
      'Mail', 'Calendar', 'FileText'
    ];
    iconNames.forEach(iconName => {
      // Replace icon: IconName, with icon: null, (including renamed variants like IconName2)
      content = content.replace(new RegExp(`icon:\\s*${iconName}\\d*\\s*,`, 'g'), 'icon: null,');
      // Replace icon: IconName\n with icon: null\n
      content = content.replace(new RegExp(`icon:\\s*${iconName}\\d*\\s*\\n`, 'g'), 'icon: null\n');
      // Replace icon: IconName} with icon: null}
      content = content.replace(new RegExp(`icon:\\s*${iconName}\\d*\\s*\\}`, 'g'), 'icon: null}');
    });
    
    // Dynamic imports: import('react')
    content = content.replace(/import\(['"]react['"]\)/g, 'Promise.resolve({})');
    content = content.replace(/import\(['"]react\/[^'"]*['"]\)/g, 'Promise.resolve({})');
    
    // Re-exports: export * from 'react'
    content = content.replace(/export\s+\*\s+from\s+['"]react['"];?\n?/g, '');
    content = content.replace(/export\s+\*\s+from\s+['"]react\/[^'"]*['"];?\n?/g, '');
    
    // Remove incomplete import statements (e.g., "import {\nimport { ... }" -> "import { ... }")
    // This handles cases where icon names were removed, leaving behind "import {"
    content = content.replace(/^import\s+\{\s*\n\s*import\s+/gm, 'import ');
    
    // Remove incomplete import blocks: "import {\n  IconName\nvar ..." -> "var ..."
    // These are leftover from lucide-react imports where we removed the "} from 'lucide-react'" part
    // Match: import { followed by icon names (PascalCase) and then code
    const lines = content.split('\n');
    const cleanedLines: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // Check if this is an incomplete "import {" line
      if (/^import\s+\{\s*$/.test(line)) {
        // Look ahead to see what follows
        let foundIcon = false;
        let j = i + 1;
        // Skip empty lines and look for icon names or code
        while (j < lines.length && j < i + 10) {
          const nextLine = lines[j].trim();
          if (!nextLine) {
            j++;
            continue;
          }
          // If we find code (var, let, const, function, class, export), this is incomplete
          if (/^(var|let|const|function|class|export|\/\/)/.test(nextLine)) {
            // Remove the incomplete import and icon names, keep the code
            i = j; // Skip to the code line
            foundIcon = true;
            break;
          }
          // If we find another import, remove this incomplete one
          if (/^import\s+/.test(nextLine)) {
            i = j; // Skip to the next import
            foundIcon = true;
            break;
          }
          // If it's an icon name (PascalCase), continue
          if (/^[A-Z][a-zA-Z0-9]+/.test(nextLine)) {
            j++;
            continue;
          }
          // Otherwise, might be valid, keep it
          break;
        }
        if (!foundIcon) {
          cleanedLines.push(line);
          i++;
        }
      } else {
        cleanedLines.push(line);
        i++;
      }
    }
    content = cleanedLines.join('\n');
    
    return content;
  };

  // Comprehensive CJS require removal patterns
  const removeCJSRequires = (content: string): string => {
    // const React = require('react') or const React2 = require('react')
    content = content.replace(/const\s+React\d*\s*=\s*require\(['"]react['"]\)[^;]*;?\n?/g, '');
    
    // const { useState } = require('react')
    content = content.replace(/const\s+\{[^}]*\}\s*=\s*require\(['"]react['"]\)[^;]*;?\n?/g, '');
    
    // const React = require('react'), { useState } = require('react')
    content = content.replace(/const\s+.*\bReact\d*\b.*=\s*require\(['"]react['"]\)[^;]*;?\n?/g, '');
    
    // var React = require('react') or var React2 = require('react')
    content = content.replace(/var\s+React\d*\s*=\s*require\(['"]react['"]\)[^;]*;?\n?/g, '');
    content = content.replace(/var\s+\{[^}]*\}\s*=\s*require\(['"]react['"]\)[^;]*;?\n?/g, '');
    
    // let React = require('react') or let React2 = require('react')
    content = content.replace(/let\s+React\d*\s*=\s*require\(['"]react['"]\)[^;]*;?\n?/g, '');
    content = content.replace(/let\s+\{[^}]*\}\s*=\s*require\(['"]react['"]\)[^;]*;?\n?/g, '');
    
    // Standalone require('react')
    content = content.replace(/require\(['"]react['"]\)[^;]*;?\n?/g, '');
    content = content.replace(/require\(['"]react\/jsx-runtime['"]\)[^;]*;?\n?/g, '');
    content = content.replace(/require\(['"]react\/jsx-dev-runtime['"]\)[^;]*;?\n?/g, '');
    content = content.replace(/require\(['"]react-dom['"]\)[^;]*;?\n?/g, '');
    content = content.replace(/require\(['"]react\/[^'"]*['"]\)[^;]*;?\n?/g, '');
    content = content.replace(/require\(['"]lucide-react['"]\)[^;]*;?\n?/g, '');
    
    return content;
  };
  
  // Remove from ESM output
  try {
    let content = readFileSync(esmPath, 'utf-8');
    const originalContent = content;
    content = removeESMImports(content);
    
    // Only write if content changed (avoid unnecessary file writes)
    if (content !== originalContent) {
      writeFileSync(esmPath, content);
    }
  } catch (e) {
    // File might not exist, that's ok
  }

  // Remove from CJS output
  try {
    let content = readFileSync(cjsPath, 'utf-8');
    const originalContent = content;
    content = removeCJSRequires(content);
    
    // Only write if content changed
    if (content !== originalContent) {
      writeFileSync(cjsPath, content);
    }
  } catch (e) {
    // File might not exist, that's ok
  }
};

// Build verification: Check if React imports remain after cleanup
const verifyNoReactImports = (outDir: string): void => {
  const esmPath = join(outDir, 'index.mjs');
  const cjsPath = join(outDir, 'index.js');
  
  // Only check for actual import/require statements, not function names in code
  const reactImportPatterns = [
    /^import\s+.*\bReact\b.*from\s+['"]react['"]/im,      // import React from 'react'
    /^import\s+.*from\s+['"]react['"]/im,                 // import ... from 'react'
    /^import\s+.*from\s+['"]react\/[^'"]*['"]/im,        // import ... from 'react/...'
    /^import\s+.*from\s+['"]lucide-react['"]/im,         // import ... from 'lucide-react'
    /^import\s+['"]react['"]/im,                          // import 'react'
    /^import\s+['"]react\/[^'"]*['"]/im,                  // import 'react/...'
    /^import\s+['"]lucide-react['"]/im,                   // import 'lucide-react'
    /require\(['"]react['"]\)/i,                          // require('react')
    /require\(['"]react\/[^'"]*['"]\)/i,                   // require('react/...')
    /require\(['"]lucide-react['"]\)/i,                   // require('lucide-react')
  ];
  
  const checkFile = (filePath: string, format: string): void => {
    try {
      const content = readFileSync(filePath, 'utf-8');
      
      for (const pattern of reactImportPatterns) {
        if (pattern.test(content)) {
          const match = content.match(pattern);
          throw new Error(
            `❌ BUILD VERIFICATION FAILED: React import detected in ${format} output!\n` +
            `   File: ${filePath}\n` +
            `   Pattern: ${pattern}\n` +
            `   Match: ${match?.[0]}\n` +
            `   This will cause Next.js build to fail. Please review the build configuration.`
          );
        }
      }
    } catch (e) {
      // If it's our verification error, throw it
      if (e instanceof Error && e.message.includes('BUILD VERIFICATION FAILED')) {
        throw e;
      }
      // If file doesn't exist, that's ok (might not be built yet)
    }
  };
  
  checkFile(esmPath, 'ESM');
  checkFile(cjsPath, 'CJS');
  
  console.log('✅ Build verification passed: No React imports detected in API bundle');
};

export default defineConfig([
  // Main entry point (client-safe utilities)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: false, // Disabled for multi-tenant - package has complex type issues with subscription/merchant references
    external: [
      'react',
      'react-dom',
      'next',
      'zod',
      'date-fns',
      '@rentalshop/utils/api', // External to prevent circular resolution during build
      '@rentalshop/auth', // External workspace package
      '@rentalshop/middleware' // External workspace package
    ],
    clean: true,
    sourcemap: true,
    minify: false,
    treeshake: true,
  },
  // API subpath entry point (server-only utilities)
  {
    entry: {
      index: 'src/api/index.ts'
    },
    outDir: 'dist/api',
    format: ['esm', 'cjs'],
    dts: false,
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom/client',
      'react-dom/server',
      'lucide-react', // External to prevent React bundling through icon dependencies
      'next',
      'zod',
      'date-fns',
      '@prisma/client',
      'pg',
      '@rentalshop/auth', // External workspace package
      '@rentalshop/middleware', // External workspace package
      '@rentalshop/constants' // External workspace package
    ],
    sourcemap: true,
    minify: false,
    treeshake: false, // Disable tree-shaking to ensure all exports are included (fixes Railway build)
    // Note: React imports are still excluded via esbuild plugin and post-processing
    // Use esbuild plugin to exclude React at build time (official solution)
    // This intercepts React imports and replaces them with empty modules
    esbuildOptions(options) {
      // Add esbuild plugin to exclude React
      if (!options.plugins) {
        options.plugins = [];
      }
      options.plugins.push(excludeReactPlugin);
      
      // Mark React as external at esbuild level to prevent any bundling
      if (!options.external) {
        options.external = [];
      }
      if (!options.external.includes('react')) {
        options.external.push('react', 'react-dom', 'react/jsx-runtime', 'lucide-react');
      }
      return options;
    },
    // Post-build cleanup: Remove React imports as backup solution
    onSuccess: async () => {
      removeReactImports('dist/api');
      // Verify no React imports remain (fail build if detected)
      verifyNoReactImports('dist/api');
    },
  }
]); 