import { createBaseConfig } from '../../tsup.config.base';

export default createBaseConfig('src/index.ts', ['react', 'next'], {
  dts: false, // Skip TypeScript declaration files (has type errors in other hooks)
  // tsup removes per-file directives while bundling. This package only exports
  // React hooks, so keep the client boundary on the published entrypoint.
  banner: {
    js: "'use client';",
  },
});
