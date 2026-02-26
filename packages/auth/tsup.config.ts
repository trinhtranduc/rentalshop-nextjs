import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'unified-auth': 'src/unified-auth.ts',
    client: 'src/client/index.ts',
    admin: 'src/admin/index.ts',
    server: 'src/server.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  external: [
    '@rentalshop/ui',
    '@rentalshop/database',
    '@rentalshop/utils',
    '@rentalshop/utils/server', // Server-only exports (built separately)
    '@rentalshop/constants', // Constants package
    'bcryptjs',
    'jsonwebtoken', 
    'next-auth'
  ],
  clean: true,
  sourcemap: true,
  minify: false,
}); 