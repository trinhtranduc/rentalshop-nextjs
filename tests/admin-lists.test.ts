/**
 * #805 (step 3 of #802): the 8 admin list pages follow the portal list style and work on a phone.
 * Static checks: styling lives in apps/admin/app/lists.css, scoped by `.admin-list`, so packages/ui
 * (shared with apps/client) is not changed.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const css = read('apps/admin/app/lists.css');
const PAGES = ['merchants', 'subscriptions', 'payments', 'products', 'customers', 'orders', 'users', 'plans'];

describe('admin list pages (#805)', () => {
  it.each(PAGES)('%s page imports lists.css and wraps in .admin-list', (name) => {
    const src = read(`apps/admin/app/${name}/page.tsx`);
    expect(src).toMatch(/import ['"]\.\.\/lists\.css['"]/);
    expect(src).toMatch(/className="[^"]*\badmin-list\b/);
  });

  it('every rule is scoped to .admin-list (no global leak)', () => {
    const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?=\{)/g) || [];
    const bad = selectors.map((s) => s.trim()).filter((s) => s && !/^@/.test(s) && !/^(from|to|\d+%)/.test(s) && !s.split(',').every((x) => x.trim().startsWith('.admin-list')));
    expect(bad).toEqual([]);
  });

  it('desktop: sticky table header, bordered white surface, ar tokens', () => {
    expect(css).toMatch(/\.admin-list[^{]*thead[^{]*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(/rgb\(var\(--ar-line\)\)/);
    expect(css).toMatch(/rgb\(var\(--ar-surface\)\)/);
  });

  it('phone: chip row scrolls sideways, actions are 44px, card title first', () => {
    const phone = css.slice(css.indexOf('@media (max-width: 767px)'));
    expect(phone).toMatch(/overflow-x:\s*auto/);
    expect(phone).toMatch(/min-height:\s*44px/);
    expect(phone).toMatch(/td\[data-primary\][^{]*\{[^}]*order:\s*-1/);
  });
});
