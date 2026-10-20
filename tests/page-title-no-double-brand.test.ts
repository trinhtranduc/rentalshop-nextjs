/**
 * #1147: the root layout adds the template "%s | AnyRent", so a page title that already ends in "| AnyRent"
 * rendered "… | AnyRent | AnyRent" (/pricing, /tim-san-pham-bang-hinh-anh, /features, /cho-thue-*).
 * Such a title must be { absolute: '…' }.
 */
import * as fs from 'fs';
import * as path from 'path';

const appDir = path.join(__dirname, '..', 'apps', 'client', 'app');
const pages = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? pages(p) : e.name === 'page.tsx' || e.name === 'layout.tsx' ? [p] : [];
  });

describe('page titles do not repeat the brand (#1147)', () => {
  it('no top-level metadata title ends in "| AnyRent" without absolute', () => {
    const bad = pages(appDir)
      .filter((f) => !f.endsWith(path.join('app', 'layout.tsx')))
      .filter((f) => /^ {2}title: ['"`][^'"`]*\| AnyRent['"`]/m.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(appDir, f));
    expect(bad).toEqual([]);
  });
});
