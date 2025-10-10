import { createBaseConfig } from '../../tsup.config.base';

export default createBaseConfig('src/index.ts', ['react'], {
  dts: false, // Skip TypeScript declaration files to avoid build errors
});

