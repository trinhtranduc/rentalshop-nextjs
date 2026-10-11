/**
 * #797: every link of the admin sidebar has a page (Settings → Admin Info, /settings/admin, was a 404).
 */
import * as fs from 'fs';
import * as path from 'path';

const ADMIN = path.resolve(__dirname, '../apps/admin/app');
const sidebar = fs.readFileSync(path.resolve(__dirname, '../packages/ui/src/components/layout/AdminSidebar.tsx'), 'utf8');
const hrefs = [...new Set([...sidebar.matchAll(/href: '([^']+)'/g)].map((m) => m[1]))];

describe('admin sidebar links (#797)', () => {
  it.each(hrefs)('%s has a page', (href) => {
    expect(fs.existsSync(path.join(ADMIN, href, 'page.tsx'))).toBe(true);
  });

  it('/settings goes to Admin Info, the first Settings item', () => {
    expect(fs.readFileSync(path.join(ADMIN, 'settings/page.tsx'), 'utf8')).toMatch(/redirect\('\/settings\/admin'\)/);
  });
});
