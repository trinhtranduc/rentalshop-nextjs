/**
 * #960 shop shell top bar: a breadcrumb built from the nav model replaces the wide search field; search stays
 * behind an icon and the "/" shortcut.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { buildBreadcrumb, isSearchShortcut } from '../apps/client/app/components/shell/breadcrumb';

/** Crumbs as `labelKey|label → href` strings, easy to read in a failure. */
const crumbs = (pathname: string | null) =>
  buildBreadcrumb(pathname).map((c) => `${c.labelKey ?? c.label}${c.href ? ` → ${c.href}` : ''}`);

describe('buildBreadcrumb', () => {
  it('a top-level page is one crumb, not a link', () => {
    expect(crumbs('/dashboard')).toEqual(['shell.nav.overview']);
    expect(crumbs('/orders')).toEqual(['shell.nav.orders']);
    expect(crumbs('/outlets')).toEqual(['shell.nav.outlets']);
    expect(crumbs('/settings')).toEqual(['shell.nav.settings']);
  });

  it('attendance pages: Chấm công › the active sub-item', () => {
    expect(crumbs('/attendance')).toEqual(['shell.nav.attendance → /attendance', 'shell.nav.attendanceSub.timesheet']);
    // Chi tiết theo người hangs under Bảng công (opened from a name there)
    expect(crumbs('/attendance/person')).toEqual([
      'shell.nav.attendance → /attendance',
      'shell.nav.attendanceSub.timesheet → /attendance',
      'shell.crumbs.person',
    ]);
    expect(crumbs('/attendance/shifts')).toEqual(['shell.nav.attendance → /attendance', 'shell.nav.attendanceSub.shifts']);
    expect(crumbs('/attendance/templates')).toEqual(['shell.nav.attendance → /attendance', 'shell.nav.attendanceSub.templates']);
    expect(crumbs('/attendance/locations/12')).toEqual([
      'shell.nav.attendance → /attendance',
      'shell.nav.attendanceSub.locations → /attendance/locations',
      '#12',
    ]);
  });

  it('the page can name the last crumb (the person on Chi tiết theo người)', () => {
    expect(buildBreadcrumb('/attendance/person', 'Nguyễn Lan').map((c) => c.labelKey ?? c.label)).toEqual([
      'shell.nav.attendance',
      'shell.nav.attendanceSub.timesheet',
      'Nguyễn Lan',
    ]);
    expect(buildBreadcrumb('/attendance/person', 'Nguyễn Lan').pop()?.href).toBeUndefined();
    expect(buildBreadcrumb('/attendance/person', null).pop()?.labelKey).toBe('shell.crumbs.person');
  });

  it('an id becomes #id; detail pages link back up the path', () => {
    expect(crumbs('/orders/652066')).toEqual(['shell.nav.orders → /orders', '#652066']);
    expect(crumbs('/orders/652066/edit')).toEqual(['shell.nav.orders → /orders', '#652066 → /orders/652066', 'shell.crumbs.edit']);
    expect(crumbs('/customers/7/orders')).toEqual(['shell.nav.customers → /customers', '#7 → /customers/7', 'shell.crumbs.orders']);
  });

  it('known words get a label', () => {
    expect(crumbs('/orders/create')).toEqual(['shell.nav.orders → /orders', 'shell.crumbs.create']);
    expect(crumbs('/products/add')).toEqual(['shell.nav.products → /products', 'shell.crumbs.add']);
    expect(crumbs('/products/import')).toEqual(['shell.nav.products → /products', 'shell.crumbs.import']);
    expect(crumbs('/products/labels')).toEqual(['shell.nav.products → /products', 'shell.crumbs.labels']);
    expect(crumbs('/users/role-permissions')).toEqual(['shell.nav.staff → /users', 'shell.crumbs.rolePermissions']);
    expect(crumbs('/dashboard/related')).toEqual(['shell.nav.overview → /dashboard', 'shell.crumbs.related']);
  });

  it('a branch id has no page of its own, so it is not a link', () => {
    expect(crumbs('/outlets/5/bank-accounts')).toEqual(['shell.nav.outlets → /outlets', '#5', 'shell.crumbs.bankAccounts']);
  });

  it('signed-in pages outside the menu', () => {
    expect(crumbs('/notifications')).toEqual(['shell.crumbs.notifications']);
    expect(crumbs('/subscription')).toEqual(['shell.crumbs.subscription']);
    expect(crumbs('/plans')).toEqual(['shell.crumbs.plans']);
  });

  it('unknown or empty paths give no crumbs; trailing slash and query are ignored', () => {
    expect(crumbs('/somewhere')).toEqual([]);
    expect(crumbs(null)).toEqual([]);
    expect(crumbs('/orders/')).toEqual(['shell.nav.orders']);
    expect(crumbs('/orders?q=abc')).toEqual(['shell.nav.orders']);
    expect(crumbs('/ordersx')).toEqual([]);
  });

  it('decodes ids', () => {
    expect(crumbs('/orders/ab%20c')).toEqual(['shell.nav.orders → /orders', '#ab c']);
  });
});

describe('isSearchShortcut', () => {
  const input = { tagName: 'INPUT', isContentEditable: false };
  const body = { tagName: 'BODY', isContentEditable: false };

  it('"/" outside a field opens search', () => {
    expect(isSearchShortcut({ key: '/', target: body })).toBe(true);
  });

  it('not while typing, not with a modifier, not other keys', () => {
    expect(isSearchShortcut({ key: '/', target: input })).toBe(false);
    expect(isSearchShortcut({ key: '/', target: { tagName: 'TEXTAREA' } })).toBe(false);
    expect(isSearchShortcut({ key: '/', target: { tagName: 'DIV', isContentEditable: true } })).toBe(false);
    expect(isSearchShortcut({ key: '/', target: body, metaKey: true })).toBe(false);
    expect(isSearchShortcut({ key: '/', target: body, ctrlKey: true })).toBe(false);
    expect(isSearchShortcut({ key: '/', target: body, altKey: true })).toBe(false);
    expect(isSearchShortcut({ key: 'k', target: body })).toBe(false);
  });
});

describe('top bar wiring', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../apps/client/app/components/shell/ShopTopBar.tsx'), 'utf8');

  it('shows the breadcrumb and a search icon; the search field lives in the popover', () => {
    expect(src).toMatch(/buildBreadcrumb\(/);
    expect(src).toMatch(/isSearchShortcut\(/);
    expect(src).toMatch(/aria-label=\{t\('shell\.breadcrumb'\)\}/);
    expect(src).toMatch(/role="search"/);
    expect(src).toMatch(/\/orders\?q=/);
  });
});
