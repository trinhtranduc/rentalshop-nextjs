import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '../packages/ui/src/components/layout/LanguageSwitcher.tsx'),
  'utf8',
);

it('reloads the public landing page after changing its locale', () => {
  const publicLocaleBranch = source.split('if (publicLocale) {')[1]?.split('\n    }')[0] || '';

  expect(publicLocaleBranch).toMatch(/window\.location\.assign\(/);
});
