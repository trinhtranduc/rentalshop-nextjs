import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  external: [
    '@prisma/client',
    'sharp',
    '@xenova/transformers',
    '@qdrant/js-client-rest',
  ],
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  splitting: false, // Disable code splitting to ensure both entries build correctly
  treeshake: true,
}); 