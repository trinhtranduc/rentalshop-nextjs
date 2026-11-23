import { defineConfig } from 'tsup';

/**
 * Two builds, because they run in different places: `index` is plain TypeScript for the API and for server code,
 * `ui` is client components and keeps its "use client" boundary after bundling (same as @rentalshop/ui).
 * `src/` is a git subtree of trinhtranduc/seo-agent: wrappers and tests live beside it, never inside.
 */
const shared = { format: ['esm', 'cjs'] as ('esm' | 'cjs')[], dts: true, sourcemap: true, minify: false, external: ['react', 'react-dom'] };

export default defineConfig([
  { ...shared, entry: { index: 'entries/index.ts' }, clean: true },
  { ...shared, entry: { ui: 'entries/ui.ts' }, clean: false, banner: { js: "'use client';" } },
]);
