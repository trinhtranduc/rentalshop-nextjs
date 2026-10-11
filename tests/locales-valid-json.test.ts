/**
 * Every locale file must be valid JSON. Merging two PRs that both appended an error code left a missing comma in
 * locales/{ja,ko,zh}/errors.json (fixed in this PR); any web build that loads them then fails.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../locales');
const files = fs.readdirSync(root).flatMap((lang) => {
  const dir = path.join(root, lang);
  return fs.statSync(dir).isDirectory() ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => `${lang}/${f}`) : [];
});

describe('locale files', () => {
  it('there are locale files', () => expect(files.length).toBeGreaterThan(10));
  it.each(files)('%s is valid JSON', (file) => {
    expect(() => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))).not.toThrow();
  });

  // Two PRs that both appended the same codes left each code twice; JSON.parse keeps the LAST (older) text silently.
  it.each(files)('%s has no key twice at the same level', (file) => {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const data = JSON.parse(text);
    if (Object.values(data).some((v) => v && typeof v === 'object')) return; // nested files: checked by their own tests
    const keys = [...text.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((m) => m[1]);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });
});
