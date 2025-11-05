import { createBaseConfig } from '../../tsup.config.base';

// Node.js built-in modules that should not be bundled
const nodeBuiltins = ['fs', 'path', 'child_process', 'crypto', 'util', 'os', 'stream', 'dns', 'net', 'tls', 'http', 'https', 'url', 'querystring', 'buffer', 'events', 'zlib'];

export default createBaseConfig(
  'src/index.ts', 
  ['@prisma/client', 'pg', ...nodeBuiltins], 
  { dts: false }
); 