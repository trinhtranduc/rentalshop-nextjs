import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false, // Disabled for multi-tenant - package has complex type issues with subscription/merchant references
  external: [
    'react',
    'react-dom',
    'next',
    'zod',
    'date-fns'
  ],
  clean: true,
  sourcemap: true,
  minify: false,
  treeshake: true,
}); 