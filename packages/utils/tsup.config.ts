import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// ESBUILD PLUGIN: Exclude React and UI utilities from server-side bundle
// ============================================================================
// This intercepts React imports and UI utility files at build time
const excludeReactPlugin = {
  name: 'exclude-react',
  setup(build) {
    // Intercept all React-related module paths
    const reactModules = [
      /^react$/,
      /^react\/jsx-runtime$/,
      /^react\/jsx-dev-runtime$/,
      /^react-dom$/,
      /^react-dom\/client$/,
      /^react-dom\/server$/,
      /^lucide-react$/,
    ];
    
    reactModules.forEach(filter => {
      build.onResolve({ filter }, () => ({
        path: 'react-stub',
        namespace: 'react-stub',
      }));
    });
    
    // Exclude UI utility files (contain React components)
    // These should only be used in client-side code
    // Use more specific filters to avoid matching everything
    const uiUtilityFiles = [
      /badge-utils\.tsx?$/,
      /customer-utils\.tsx?$/,
      /product-utils\.tsx?$/,
      /user-utils\.tsx?$/,
    ];
    
    uiUtilityFiles.forEach(filter => {
      build.onResolve({ filter }, () => ({
        path: 'ui-stub',
        namespace: 'ui-stub',
      }));
    });
    
    // Provide empty module for React stubs
    build.onLoad({ filter: /.*/, namespace: 'react-stub' }, () => ({
      contents: '// React excluded for server-side bundle',
      loader: 'js',
    }));
    
    // Provide empty module for UI utility stubs
    build.onLoad({ filter: /.*/, namespace: 'ui-stub' }, () => ({
      contents: '// UI utilities excluded for server-side bundle',
      loader: 'js',
    }));
  },
};

// ============================================================================
// POST-BUILD: Simple cleanup and verification
// ============================================================================
const postProcessApiBundle = (outDir: string) => {
  const esmPath = join(outDir, 'index.mjs');
  const cjsPath = join(outDir, 'index.js');
  
  // Simple cleanup: Remove any remaining React import statements and UI utilities
  const cleanup = (content: string): string => {
    // Remove React imports
    content = content.replace(/import\s+.*from\s+['"]react['"];?\n?/g, '');
    content = content.replace(/import\s+.*from\s+['"]react\/[^'"]*['"];?\n?/g, '');
    content = content.replace(/import\s+.*from\s+['"]lucide-react['"];?\n?/g, '');
    content = content.replace(/require\(['"]react['"]\)[^;]*;?\n?/g, '');
    content = content.replace(/require\(['"]lucide-react['"]\)[^;]*;?\n?/g, '');
    
    // Remove UI utility file blocks (badge-utils, customer-utils, product-utils, user-utils)
    // These contain React components and should not be in server-side bundle
    const uiUtilityPatterns = [
      /\/\/ src\/core\/badge-utils\.tsx[\s\S]*?(?=\/\/ src\/core\/|\nvar [a-zA-Z]|$)/g,
      /\/\/ src\/core\/customer-utils\.tsx[\s\S]*?(?=\/\/ src\/core\/|\nvar [a-zA-Z]|$)/g,
      /\/\/ src\/core\/product-utils\.tsx[\s\S]*?(?=\/\/ src\/core\/|\nvar [a-zA-Z]|$)/g,
      /\/\/ src\/core\/user-utils\.tsx[\s\S]*?(?=\/\/ src\/core\/|\nvar [a-zA-Z]|$)/g,
    ];
    uiUtilityPatterns.forEach(pattern => {
      content = content.replace(pattern, '');
    });
    
    // Remove client-only functions (should not be in API bundle)
    // These are exported from main package (@rentalshop/utils), not from API package
    const clientOnlyFunctions = [
      'formatSubscriptionPeriod',
      'getSubscriptionStatusBadge'
    ];
    
    // Remove entire variable definition lines for client-only functions
    clientOnlyFunctions.forEach(funcName => {
      // Match: var funcName = ...; (entire line)
      content = content.replace(new RegExp(`^var\\s+${funcName}\\s*=.*?;\\s*$`, 'gm'), '');
    });
    
    // Remove functions from UI utilities from export list
    const uiUtilityExports = [
      'getStatusBadgeConfig', 'getStatusBadge', 'getRoleBadgeConfig', 'getRoleBadge',
      'getLocationBadgeConfig', 'getLocationBadge', 'getAvailabilityBadgeConfig', 'getAvailabilityBadge',
      'getPriceTrendBadgeConfig', 'getPriceTrendBadge', 'getCustomerStatusBadge', 'getCustomerLocationBadge',
      'getProductStatusBadge', 'getUserStatusBadge'
    ];
    
    // Remove client-only functions from export list (only within export statement)
    const exportMatch = content.match(/export\s*\{([\s\S]*?)\};/);
    if (exportMatch) {
      let exportList = exportMatch[1];
      const allClientOnly = [...clientOnlyFunctions, ...uiUtilityExports];
      
      // Remove each client-only function from export list
      // Process line by line to preserve comma structure
      const lines = exportList.split('\n');
      const filteredLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Check if this line contains a client-only function
        const isClientOnly = allClientOnly.some(name => {
          // Match: "  exportName," or "  exportName" (with or without comma)
          return new RegExp(`^\\s*${name}\\s*,?\\s*$`).test(trimmed);
        });
        
        if (!isClientOnly) {
          filteredLines.push(line);
        }
        // If it's client-only, skip the line entirely
      }
      
      exportList = filteredLines.join('\n');
      
      // Clean up: remove double commas, empty lines
      exportList = exportList.replace(/,\s*,/g, ','); // Double commas -> single comma
      exportList = exportList.replace(/\n\s*\n+/g, '\n'); // Multiple empty lines -> single
      exportList = exportList.trim(); // Remove leading/trailing whitespace
      
      // Update content if export list changed
      if (exportList !== exportMatch[1]) {
        content = content.replace(exportMatch[0], `export {${exportList}};`);
      }
    }
    
    // Remove incomplete import blocks (leftover from lucide-react cleanup)
    content = content.replace(/^import\s+\{\s*$/gm, (match, offset, string) => {
      const after = string.substring(offset + match.length);
      const nextLine = after.split('\n').find(line => line.trim()) || '';
      // If followed by another import or code, remove this incomplete import
      if (/^\s*import\s+/.test(nextLine) || /^\s*(var|let|const|function|class|export)/.test(nextLine)) {
        return '';
      }
      return match;
    });
    
    return content;
  };
  
  // Ensure critical exports are included in export statement
  const ensureExports = (content: string): string => {
    // Find the export statement
    const exportMatch = content.match(/export\s*\{([\s\S]*?)\};/);
    if (!exportMatch) return content;
    
    const exportList = exportMatch[1];
    const requiredExports = ['getSubscriptionError', 'getPlanLimitError', 'validateSubscriptionAccess', 'getTenantDbFromRequest', 'withTenantDb'];
    const missing = requiredExports.filter(name => !new RegExp(`\\b${name}\\b`).test(exportList));
    
    if (missing.length > 0) {
      // Find the closing brace position
      const insertPos = exportMatch.index! + exportMatch[0].lastIndexOf('}');
      const beforeClose = content.substring(0, insertPos);
      const afterClose = content.substring(insertPos);
      
      // Add missing exports before closing brace
      const additions = missing.map(name => `  ${name}`).join(',\n');
      return beforeClose + ',\n' + additions + '\n' + afterClose;
    }
    
    return content;
  };
  
  // Process ESM
  try {
    let content = readFileSync(esmPath, 'utf-8');
    if (content.includes('getTenantDbFromRequest')) {
      console.log('🔍 Pre-cleanup: getTenantDbFromRequest present in ESM bundle');
    } else {
      console.warn('⚠️ Pre-cleanup: getTenantDbFromRequest missing in ESM bundle');
    }
    const original = content;
    content = cleanup(content);
    content = ensureExports(content);
    if (content !== original) {
      writeFileSync(esmPath, content);
    }
  } catch (e) {
    // File might not exist
  }
  
  // Process CJS
  try {
    let content = readFileSync(cjsPath, 'utf-8');
    if (content.includes('getTenantDbFromRequest')) {
      console.log('🔍 Pre-cleanup: getTenantDbFromRequest present in CJS bundle');
    } else {
      console.warn('⚠️ Pre-cleanup: getTenantDbFromRequest missing in CJS bundle');
    }
    const original = content;
    content = cleanup(content);
    if (content !== original) {
      writeFileSync(cjsPath, content);
    }
  } catch (e) {
    // File might not exist
  }
};

// ============================================================================
// VERIFICATION: Check for React imports
// ============================================================================
const verifyNoReact = (outDir: string) => {
  const esmPath = join(outDir, 'index.mjs');
  try {
    const content = readFileSync(esmPath, 'utf-8');
    if (/import\s+.*from\s+['"]react['"]/im.test(content) || 
        /require\(['"]react['"]\)/i.test(content)) {
      throw new Error('❌ React imports detected in API bundle!');
    }
    console.log('✅ Build verification passed: No React imports in API bundle');
  } catch (e) {
    if (e instanceof Error && e.message.includes('React imports')) {
      throw e;
    }
  }
};

// ============================================================================
// TSUP CONFIGURATION
// ============================================================================
export default defineConfig([
  // API subpath (server-only utilities) - Build FIRST to avoid circular dependencies
  {
    entry: {
      index: 'src/api/index.ts',
      'tenant-utils': 'src/api/tenant-utils.ts'
    },
    outDir: 'dist/api',
    format: ['esm', 'cjs'],
    dts: false,
    splitting: false,
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom/client',
      'react-dom/server',
      'lucide-react',
      // 'next' removed - need to bundle NextRequest/NextResponse for getTenantDbFromRequest
      'zod',
      'date-fns',
      '@prisma/client',
      'pg',
      '@rentalshop/auth',
      '@rentalshop/middleware',
      '@rentalshop/constants',
    ],
    sourcemap: true,
    minify: false,
    treeshake: false, // Keep all exports for Railway build
    noExternal: ['next/server'], // Bundle next/server to include NextRequest/NextResponse
    esbuildOptions(options) {
      options.plugins = options.plugins || [];
      options.plugins.push(excludeReactPlugin);
      options.external = options.external || [];
      options.external.push('react', 'react-dom', 'react/jsx-runtime', 'lucide-react');
      // Don't externalize 'next' or 'next/server' - need to bundle NextRequest/NextResponse
      // Remove 'next' and 'next/server' from external if present
      if (options.external) {
        options.external = options.external.filter(
          (ext: string) => ext !== 'next' && ext !== 'next/server'
        );
      }
      return options;
    },
    onSuccess: async () => {},
  },
  // Main entry (client-safe utilities) - Build AFTER API bundle
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: false,
    external: [
      'react',
      'react-dom',
      'next',
      'zod',
      'date-fns',
      '@rentalshop/utils/api', // External to prevent circular resolution
    ],
    clean: true,
    sourcemap: true,
    minify: false,
    treeshake: true,
  },
]);
