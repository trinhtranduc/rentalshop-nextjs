import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
  },
  format: ['esm', 'cjs'],
  dts: true, // Giữ type definitions
  external: [
    '@prisma/client',
    'sharp',
    '@xenova/transformers',
    '@qdrant/js-client-rest',
    // Workspace packages - mark as external so types resolve correctly
    '@rentalshop/env',
    '@rentalshop/utils',
    '@rentalshop/types',
    '@rentalshop/constants',
    '@rentalshop/auth',
    '@rentalshop/auth/server', // Server-only exports (built separately)
  ],
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  splitting: false, // Disable code splitting to ensure both entries build correctly
  treeshake: true,
}); 