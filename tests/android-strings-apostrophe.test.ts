/**
 * #1595 aapt2 rejects an apostrophe without a backslash in an Android string ("Los geht's"):
 * `:app:mergeDebugResources` fails and no Android build can be made (059b02ce3, de / fr / ko).
 */
import * as fs from 'fs';
import * as path from 'path';

const res = path.resolve(__dirname, '../apps/mobile-android/app/src/main/res');
const files = fs
  .readdirSync(res)
  .filter((dir) => dir.startsWith('values'))
  .map((dir) => path.join(dir, 'strings.xml'))
  .filter((file) => fs.existsSync(path.join(res, file)));

function unescaped(file: string): string[] {
  const xml = fs.readFileSync(path.join(res, file), 'utf8');
  return [...xml.matchAll(/<(string|item)\b[^>]*>([^<]*)<\/\1>/g)]
    .map((m) => m[2])
    .filter((text) => !/^\s*"[\s\S]*"\s*$/.test(text) && /(^|[^\\])'/.test(text));
}

describe('#1595 Android strings', () => {
  it('finds the string files of every app language', () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
  });

  it.each(files)('%s has no apostrophe without a backslash', (file) => {
    expect(unescaped(file)).toEqual([]);
  });
});
