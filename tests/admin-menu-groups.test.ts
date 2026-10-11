/**
 * #815: the admin side menu is shown in 6 groups. Routes and role filtering do not change.
 */
import * as fs from 'fs';
import * as path from 'path';
import { NAV_GROUPS, groupNavItems } from '../apps/admin/app/components/shell/nav-groups';

const shell = (f: string) => fs.readFileSync(path.resolve(__dirname, '../apps/admin/app/components/shell', f), 'utf8');

// Every route of the menu before the grouping (#804). None may be lost.
const OLD_HREFS = [
  '/dashboard', '/merchants', '/referrals', '/affiliate/stats', '/subscriptions', '/payments', '/plans', '/plans/billing',
  '/orders', '/customers', '/products', '/users', '/system-users', '/posts', '/posts/categories', '/posts/tags', '/media',
  '/settings', '/settings/admin', '/system/audit-logs', '/request-logs', '/system/deleted-records', '/sync',
];

describe('admin menu groups (#815)', () => {
  it('has the six groups in order', () => {
    expect([...NAV_GROUPS]).toEqual(['Overview', 'Merchants & Plans', 'Shop data', 'Content', 'Growth', 'System']);
  });

  it('groups items in group order and hides empty groups', () => {
    const items = [
      { label: 'Orders', group: 'Shop data' as const },
      { label: 'Dashboard', group: 'Overview' as const },
      { label: 'Users', group: 'Shop data' as const },
    ];
    expect(groupNavItems(items).map((g) => [g.label, g.items.map((i) => i.label)])).toEqual([
      ['Overview', ['Dashboard']],
      ['Shop data', ['Orders', 'Users']],
    ]);
  });

  it('every menu item names one of the groups', () => {
    const nav = shell('nav.ts');
    const top = nav.slice(nav.indexOf('export const ADMIN_NAV'), nav.indexOf('/** `/merchants/2` keeps'));
    const labels = [...top.matchAll(/^  \{\s*label: '([^']+)'/gm)].map((m) => m[1]);
    const withGroup = [...top.matchAll(/^  \{[^]*?group: '([^']+)'/gm)].map((m) => m[1]);
    expect(labels.length).toBe(13);
    expect(withGroup.length).toBe(13);
    withGroup.forEach((g) => expect(NAV_GROUPS as readonly string[]).toContain(g));
  });

  it.each(OLD_HREFS)('%s is still in the menu', (href) => {
    expect(shell('nav.ts')).toContain(`href: '${href}'`);
  });

  it('the side nav shows the groups with a heading and keeps the role filter first', () => {
    const side = shell('AdminSideNav.tsx');
    expect(side).toMatch(/groupNavItems\(/);
    expect(side.indexOf('filterAdminMenuByRole(ADMIN_NAV')).toBeGreaterThan(-1);
    expect(side).toMatch(/group\.label/);
  });

  it('Subscription and Plans show their pages inline, Blog and Settings stay expandable', () => {
    const nav = shell('nav.ts');
    const block = (label: string) => nav.slice(nav.indexOf(`label: '${label}', href`), nav.indexOf(`label: '${label}', href`) + 400);
    expect(block('Subscription')).toMatch(/inline: true/);
    expect(block('Plans')).toMatch(/inline: true/);
    expect(block('Blog')).not.toMatch(/inline: true/);
    expect(block('Settings')).not.toMatch(/inline: true/);
  });
});
