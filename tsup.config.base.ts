import { defineConfig } from 'tsup';

export const createBaseConfig = (entry: string, external: string[] = []) => 
  defineConfig({
    entry: [entry],
    format: ['esm', 'cjs'],
    dts: true,
    external: [
      '@rentalshop/ui',
      '@rentalshop/auth', 
      '@rentalshop/database',
      '@rentalshop/utils',
      ...external
    ],
    clean: true,
    sourcemap: true,
    minify: false,
  }); 