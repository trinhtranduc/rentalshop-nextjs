/**
 * #509 shop shell: nav visibility per role must match the previous ClientSidebar.
 */
import { describe, expect, it } from '@jest/globals';
import {
  SHELL_MAIN_NAV,
  SHELL_MANAGE_NAV,
  activeNavChild,
  filterNavForRole,
  isNavActive,
  isNavChildActive,
  navChildHref,
} from '../apps/client/app/components/shell/nav';

const hrefs = (role?: string) =>
  filterNavForRole([...SHELL_MAIN_NAV, ...SHELL_MANAGE_NAV], role).map((i) => i.href);

const MAIN = ['/dashboard', '/orders', '/calendar', '/availability', '/products', '/customers'];

describe('filterNavForRole', () => {
  it('MERCHANT sees everything, including loyalty and outlets', () => {
    expect(hrefs('MERCHANT')).toEqual([...MAIN, '/users', '/outlets', '/categories', '/loyalty', '/settings']);
  });

  it('OUTLET_ADMIN sees users but not outlets or loyalty', () => {
    expect(hrefs('OUTLET_ADMIN')).toEqual([...MAIN, '/users', '/categories', '/settings']);
  });

  it('OUTLET_STAFF sees neither users nor outlets', () => {
    expect(hrefs('OUTLET_STAFF')).toEqual([...MAIN, '/categories', '/settings']);
  });

  it('normalises role casing and spaces', () => {
    expect(hrefs(' outlet_staff ')).toEqual(hrefs('OUTLET_STAFF'));
  });

  it('without a role hides role-restricted items', () => {
    expect(hrefs(undefined)).not.toContain('/loyalty');
  });
});

describe('attendance module (#908)', () => {
  const withModules = (role: string | undefined, modules: string[]) =>
    filterNavForRole([...SHELL_MAIN_NAV, ...SHELL_MANAGE_NAV], role, modules).map((i) => i.href);

  it('module off: no Chấm công for anyone, outlet admin still has no Chi nhánh', () => {
    expect(withModules('MERCHANT', [])).not.toContain('/attendance');
    expect(withModules('OUTLET_ADMIN', [])).not.toContain('/attendance');
    expect(withModules('OUTLET_ADMIN', [])).not.toContain('/outlets');
  });

  it('module on: owner and outlet admin see Chấm công; Chi nhánh stays owner-only (#945)', () => {
    expect(withModules('MERCHANT', ['attendance'])).toEqual([...MAIN, '/users', '/attendance', '/outlets', '/categories', '/loyalty', '/settings']);
    expect(withModules('OUTLET_ADMIN', ['attendance'])).toEqual([...MAIN, '/users', '/attendance', '/categories', '/settings']);
  });

  it('staff and kho never see Chấm công or Chi nhánh', () => {
    for (const role of ['OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      expect(withModules(role, ['attendance'])).not.toContain('/attendance');
      expect(withModules(role, ['attendance'])).not.toContain('/outlets');
    }
  });
});

describe('isNavActive', () => {
  it('matches the route and its children only', () => {
    expect(isNavActive('/orders', '/orders')).toBe(true);
    expect(isNavActive('/orders/123', '/orders')).toBe(true);
    expect(isNavActive('/orders-archive', '/orders')).toBe(false);
    expect(isNavActive(null, '/orders')).toBe(false);
  });
});

describe('sub-menu (#960)', () => {
  const visible = (role: string, modules: string[]) =>
    filterNavForRole([...SHELL_MAIN_NAV, ...SHELL_MANAGE_NAV], role, modules);
  const attendance = (role: string, modules: string[]) => visible(role, modules).find((i) => i.key === 'attendance');

  it('Chấm công carries the five screens, in the old tab order', () => {
    for (const role of ['MERCHANT', 'OUTLET_ADMIN']) {
      const item = attendance(role, ['attendance']);
      expect(item?.children?.map((c) => [c.key, c.href])).toEqual([
        ['timesheet', '/attendance'],
        ['person', '/attendance/person'],
        ['shifts', '/attendance/shifts'],
        ['templates', '/attendance/templates'],
        ['locations', '/attendance/locations'],
      ]);
    }
  });

  it('no module or a staff role: no group and no sub-items at all', () => {
    expect(attendance('MERCHANT', [])).toBeUndefined();
    for (const role of ['OUTLET_STAFF', 'OUTLET_INVENTORY']) expect(attendance(role, ['attendance'])).toBeUndefined();
  });

  it('other menu items keep their place and have no children (order not changed here)', () => {
    const others = visible('MERCHANT', ['attendance']).filter((i) => i.key !== 'attendance');
    expect(others.every((i) => !i.children)).toBe(true);
  });

  it('active child: Bảng công only on /attendance, the rest on their route and its children', () => {
    const item = attendance('MERCHANT', ['attendance'])!;
    expect(activeNavChild(item, '/attendance')?.key).toBe('timesheet');
    expect(activeNavChild(item, '/attendance/person')?.key).toBe('person');
    expect(activeNavChild(item, '/attendance/shifts')?.key).toBe('shifts');
    expect(activeNavChild(item, '/attendance/templates')?.key).toBe('templates');
    expect(activeNavChild(item, '/attendance/locations')?.key).toBe('locations');
    expect(activeNavChild(item, '/attendance/locations/12')?.key).toBe('locations');
    expect(activeNavChild(item, '/attendance/locationsx')).toBeUndefined();
    expect(activeNavChild(item, '/orders')).toBeUndefined();
    expect(activeNavChild(item, null)).toBeUndefined();
  });

  it('isNavChildActive: exact children match only themselves', () => {
    expect(isNavChildActive('/attendance', { key: 'timesheet', href: '/attendance', exact: true })).toBe(true);
    expect(isNavChildActive('/attendance/person', { key: 'timesheet', href: '/attendance', exact: true })).toBe(false);
  });

  it('a sub-item link keeps ?outletId and ?month, drops anything else', () => {
    const item = attendance('MERCHANT', ['attendance'])!;
    const person = item.children!.find((c) => c.key === 'person')!;
    expect(navChildHref(item, person, '?outletId=3&month=2026-10&q=x')).toBe('/attendance/person?outletId=3&month=2026-10');
    expect(navChildHref(item, person, '')).toBe('/attendance/person');
    expect(navChildHref(item, person, '?q=x')).toBe('/attendance/person');
  });
});

describe('sidebar wiring (#960)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs') as typeof import('fs');
  const src = fs.readFileSync(require.resolve('../apps/client/app/components/shell/ShopSidebar.tsx'), 'utf8');

  it('renders children from the model, with a collapsible group', () => {
    expect(src).toMatch(/activeNavChild\(/);
    expect(src).toMatch(/aria-expanded=\{open\}/);
  });

  it('hover never paints an item with the active colour', () => {
    expect(src).not.toMatch(/hover:bg-ar-primary-soft/);
  });
});
