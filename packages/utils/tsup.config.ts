import { defineConfig } from 'tsup';

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
      'next',
      'zod',
      'date-fns',
      '@prisma/client',
      'pg',
      '@rentalshop/auth', // External workspace package
      '@rentalshop/middleware' // External workspace package
    ],
    sourcemap: true,
    minify: false,
    treeshake: true,
  }
]); 