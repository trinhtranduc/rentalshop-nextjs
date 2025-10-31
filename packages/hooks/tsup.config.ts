import { createBaseConfig } from '../../tsup.config.base';

export default createBaseConfig('src/index.ts', ['react', 'next'], {
  dts: false, // Skip TypeScript declaration files (has type errors in other hooks)
});

