import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// ESBUILD PLUGIN: Exclude React from server-side bundle
// ============================================================================
// This intercepts React imports at build time and replaces them with empty modules
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
    
    // Provide empty module for React stubs
    build.onLoad({ filter: /.*/, namespace: 'react-stub' }, () => ({
      contents: '// React excluded for server-side bundle',
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
  
  // Simple cleanup: Remove any remaining React import statements
  const cleanup = (content: string): string => {
    // Remove React imports
    content = content.replace(/import\s+.*from\s+['"]react['"];?\n?/g, '');
    content = content.replace(/import\s+.*from\s+['"]react\/[^'"]*['"];?\n?/g, '');
    content = content.replace(/import\s+.*from\s+['"]lucide-react['"];?\n?/g, '');
    content = content.replace(/require\(['"]react['"]\)[^;]*;?\n?/g, '');
    content = content.replace(/require\(['"]lucide-react['"]\)[^;]*;?\n?/g, '');
    
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
  
  // Note: Exports are already included by tsup with treeshake: false
  // This function is kept for safety but should not be needed
  const ensureExports = (content: string): string => {
    // Check if critical exports exist
    const hasExports = /getSubscriptionError|getPlanLimitError|validateSubscriptionAccess/.test(content);
    if (!hasExports) {
      console.warn('⚠️  Warning: Critical exports may be missing from API bundle');
    }
    return content;
  };
  
  // Process ESM
  try {
    let content = readFileSync(esmPath, 'utf-8');
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
    entry: { index: 'src/api/index.ts' },
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
      'lucide-react',
      'next',
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
    esbuildOptions(options) {
      options.plugins = options.plugins || [];
      options.plugins.push(excludeReactPlugin);
      options.external = options.external || [];
      options.external.push('react', 'react-dom', 'react/jsx-runtime', 'lucide-react');
      return options;
    },
    onSuccess: async () => {
      postProcessApiBundle('dist/api');
      verifyNoReact('dist/api');
    },
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
