import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false, // Disable DTS temporarily
  external: [
    'zod',
    'date-fns'
  ],
}); 