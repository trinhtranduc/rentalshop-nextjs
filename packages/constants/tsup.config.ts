import { createBaseConfig } from '../../tsup.config.base';

export default createBaseConfig('src/index.ts', [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom/client',
  'react-dom/server'
]);
