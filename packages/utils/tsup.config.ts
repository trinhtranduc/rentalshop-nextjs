import { defineConfig } from 'tsup';

// Official esbuild plugin to exclude React from server-side bundle
// This intercepts React imports at build time and prevents them from being included
const excludeReactPlugin = {
  name: 'exclude-react',
  setup(build) {
    // Intercept React imports and replace with empty module
    build.onResolve({ filter: /^react$/ }, () => ({
      path: 'react',
      namespace: 'react-stub',
    }));
    
    build.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({
      path: 'react/jsx-runtime',
      namespace: 'react-stub',
    }));
    
    build.onResolve({ filter: /^react-dom$/ }, () => ({
      path: 'react-dom',
      namespace: 'react-stub',
    }));
    
    // Provide empty module for React stubs
    build.onLoad({ filter: /.*/, namespace: 'react-stub' }, () => ({
      contents: '// React excluded for server-side bundle',
      loader: 'js',
    }));
  },
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
    treeshake: true,
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
        options.external.push('react', 'react-dom', 'react/jsx-runtime');
      }
      return options;
    },
  }
]); 