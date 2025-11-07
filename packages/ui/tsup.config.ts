import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm', 'cjs'],
  dts: false, // Temporarily disable DTS to avoid circular import issues
  external: [
    // Don't externalize @rentalshop/ui - it causes circular dependency issues
    // '@rentalshop/ui', // REMOVED - causes undefined component issues in Docker
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