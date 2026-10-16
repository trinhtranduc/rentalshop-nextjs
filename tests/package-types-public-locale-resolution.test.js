const { spawnSync } = require('child_process');
const path = require('path');

describe('@rentalshop/types package declarations', () => {
  it('resolves PublicLocale from the current @rentalshop/constants workspace', () => {
    const repoRoot = path.resolve(__dirname, '..');
    const result = spawnSync(
      'yarn',
      ['--cwd', 'packages/types', 'tsc', '--noEmit', '-p', 'tsconfig.json'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    const output = `${result.stdout || ''}${result.stderr || ''}`;

    expect(output).not.toContain("has no exported member 'PublicLocale'");
  });
});
