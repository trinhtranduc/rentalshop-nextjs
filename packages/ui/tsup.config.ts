import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.tsx',
    base: 'src/base.ts',
  },
  format: ['esm', 'cjs'],
  dts: false, // Temporarily disable DTS to avoid circular import issues
  external: [
    // Externalize @rentalshop/ui to prevent circular dependency during build
    // Components inside @rentalshop/ui can import from @rentalshop/ui,
    // but tsup will treat it as external and resolve it at runtime
    '@rentalshop/ui',
    '@rentalshop/auth', 
    '@rentalshop/database',
    '@rentalshop/utils',
    '@rentalshop/constants',
    '@rentalshop/types',
    '@rentalshop/hooks',
    'react',
    'react-dom',
    'lucide-react',
    '@radix-ui/react-slot',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
    'next',
    'next/navigation',
    'next/link'
  ],
  clean: true,
  sourcemap: true,
  minify: false,
}); 