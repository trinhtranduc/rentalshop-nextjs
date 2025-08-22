import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
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