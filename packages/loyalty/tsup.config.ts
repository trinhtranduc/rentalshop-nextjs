import { createBaseConfig } from '../../tsup.config.base';

export default createBaseConfig('src/index.ts', [
  '@rentalshop/database',
  '@rentalshop/constants',
  '@rentalshop/types',
  '@prisma/client',
], {
  dts: {
    resolve: true,
  },
});
