import { defineConfig } from 'tsup';

const nodeBuiltins = [
  'fs',
  'path',
  'child_process',
  'crypto',
  'util',
  'os',
  'stream',
  'dns',
  'net',
  'tls',
  'http',
  'https',
  'url',
  'querystring',
  'buffer',
  'events',
  'zlib'
];

export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  bundle: false,
  splitting: false,
  dts: false,
  sourcemap: true,
  minify: false,
  clean: true,
  target: 'es2020',
  external: [
    '@prisma/client',
    'pg',
    '@rentalshop/utils',
    '@rentalshop/utils/api',
    '@rentalshop/auth',
    '@rentalshop/constants',
    '@rentalshop/env',
    '@rentalshop/errors',
    '@rentalshop/validation',
    ...nodeBuiltins
  ]
});