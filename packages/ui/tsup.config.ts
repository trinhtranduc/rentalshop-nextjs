import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm', 'cjs'],
  dts: false, // Disable DTS temporarily
  external: [
    'react',
    'react-dom',
    '@radix-ui/*',
    'lucide-react',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
    'tailwindcss-animate'
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
}); 