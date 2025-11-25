import { defineConfig } from 'tsup';

export default defineConfig([
  // Main entry point (server-side safe)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    external: [
      'react',
      'react-dom',
      'next',
      'zod',
      'date-fns',
      'lucide-react',
      'next-intl'
    ],
    clean: true, // Only clean on first entry
    sourcemap: true,
    minify: false,
    treeshake: true,
  },
  // Client-side entry point (React components)
  {
    entry: ['src/client.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    external: [
      'react',
      'react-dom',
      'next',
      'zod',
      'date-fns',
      'lucide-react',
      'next-intl'
    ],
    clean: false, // Don't clean - preserve files from first entry
    sourcemap: true,
    minify: false,
    treeshake: true,
  }
]); 