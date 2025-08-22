import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client/index.ts',
    admin: 'src/admin/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
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