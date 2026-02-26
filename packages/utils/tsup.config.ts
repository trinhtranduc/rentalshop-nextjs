import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    server: 'src/server.ts',
  },
    format: ['esm', 'cjs'],
    dts: true,
    external: [
      'react',
      'react-dom',
      'next',
      'next/server', // External dependency - should not be bundled
      'zod',
      'date-fns',
      'lucide-react',
      'next-intl',
      // Self-reference - prevent circular resolution during build
      '@rentalshop/utils/server',
      // Auth server exports (built separately)
      '@rentalshop/auth/server'
    ],
  clean: true, // Clean once for all entries
    sourcemap: true,
    minify: false,
    treeshake: true,
  splitting: false, // Disable code splitting to ensure both entries build correctly
}); 