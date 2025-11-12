import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'unified-auth': 'src/unified-auth.ts',
    client: 'src/client/index.ts',
    admin: 'src/admin/index.ts',
    permissions: 'src/permissions.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  external: [
    '@rentalshop/ui',
    '@rentalshop/database',
    '@rentalshop/utils',
    'bcryptjs',
    'jsonwebtoken', 
    'next-auth',
    'next',
    'next/server',
    'next/navigation',
    'next/headers',
    'next/cache'
  ],
  clean: true,
  sourcemap: true,
  minify: false,
}); 