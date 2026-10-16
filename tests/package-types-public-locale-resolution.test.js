const fs = require('fs');
const path = require('path');

describe('@rentalshop/types package declarations', () => {
  it('links @rentalshop/constants to the current workspace instead of a file snapshot', () => {
    const repoRoot = path.resolve(__dirname, '..');
    const typesPackage = require(path.join(repoRoot, 'packages/types/package.json'));
    const constantsPackagePath = path.join(
      repoRoot,
      'packages/types/node_modules/@rentalshop/constants',
    );

    expect(typesPackage.dependencies['@rentalshop/constants']).toBe('^1.0.1');
    expect(fs.realpathSync(constantsPackagePath)).toBe(
      fs.realpathSync(path.join(repoRoot, 'packages/constants')),
    );
  });
});
