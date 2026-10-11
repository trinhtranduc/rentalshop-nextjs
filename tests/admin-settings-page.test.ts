/**
 * #797: the admin menu's Settings item links to /settings, which must be a page (it was a 404).
 */
import * as fs from 'fs';
import * as path from 'path';

const ADMIN = path.resolve(__dirname, '../apps/admin/app');

describe('admin Settings menu item (#797)', () => {
  it('every settings href in the navigation has a page', () => {
    const nav = fs.readFileSync(path.join(ADMIN, 'components/AdminNavigation.tsx'), 'utf8');
    expect(nav).toMatch(/href: '\/settings'/);
    expect(fs.existsSync(path.join(ADMIN, 'settings/page.tsx'))).toBe(true);
  });

  it('/settings goes to the Billing settings page', () => {
    const page = fs.readFileSync(path.join(ADMIN, 'settings/page.tsx'), 'utf8');
    expect(page).toMatch(/redirect\('\/settings\/billing'\)/);
    expect(fs.existsSync(path.join(ADMIN, 'settings/billing/page.tsx'))).toBe(true);
  });
});
