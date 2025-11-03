import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'unified-auth': 'src/unified-auth.ts',
    client: 'src/client/index.ts',
    admin: 'src/admin/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: false, // Disabled for multi-tenant - auth has complex type issues with merchant references
  external: [
    '@rentalshop/ui',
    '@rentalshop/database',
    '@rentalshop/utils',
    'bcryptjs',
    'jsonwebtoken', 
    'next-auth'
  ],
  clean: true,
  sourcemap: true,
  minify: false,
}); 