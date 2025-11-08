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

const entries = [
  'index',
  'client',
  'main-db',
  'tenant-db',
  'tenant-db-manager',
  'subdomain-utils',
  'registration',
  'audit-logs',
  'audit',
  'category',
  'customer',
  'email-verification',
  'order-items',
  'order-number-generator',
  'order-optimized',
  'order',
  'outlet',
  'payment',
  'plan',
  'product',
  'sessions',
  'subscription-activity',
  'subscription',
  'types',
  'user',
  'utils'
];

export default defineConfig({
  entry: Object.fromEntries(entries.map((name) => [name, `src/${name}.ts`])),
  format: ['esm', 'cjs'],
  dts: false,
  sourcemap: true,
  minify: false,
  clean: true,
  splitting: false,
  treeshake: false,
  target: 'es2020',
  external: ['@prisma/client', 'pg', ...nodeBuiltins]
});