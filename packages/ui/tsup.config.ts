import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm', 'cjs'],
  dts: false, // Temporarily disable DTS to avoid circular import issues
  external: [
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
    '@radix-ui/react-radio-group',
    '@radix-ui/react-dialog',
    '@radix-ui/react-select',
    '@radix-ui/react-tabs',
    '@radix-ui/react-toast',
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