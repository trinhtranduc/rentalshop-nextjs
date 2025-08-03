import { createBaseConfig } from '../../tsup.config.base';

export default createBaseConfig('src/index.tsx', [
  'react',
  'react-dom',
  'lucide-react',
  '@radix-ui/react-slot',
  'class-variance-authority',
  'clsx',
  'tailwind-merge'
]); 