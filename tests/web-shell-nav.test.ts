/**
 * #509 shop shell: nav visibility per role must match the previous ClientSidebar.
 */
import { describe, expect, it } from '@jest/globals';
import {
  SHELL_NAV_ITEMS,
  activeNavChild,
  filterNavGroups,
  navItemTone,
  filterNavForRole,
  isNavActive,
  isNavChildActive,
  navChildHref,
} from '../apps/client/app/components/shell/nav';

const hrefs = (role?: string) =>
  filterNavForRole(SHELL_NAV_ITEMS, role).map((i) => i.href);

// #960 menu order (owner option A): Tổng quan · Bán & cho thuê · Hàng hoá · Khách hàng · Nhân sự · Cửa hàng.
const SALES = ['/dashboard', '/orders', '/calendar', '/availability', '/products', '/categories', '/customers'];

describe('filterNavForRole', () => {
  it('MERCHANT sees everything but module items, including outlets', () => {
    expect(hrefs('MERCHANT')).toEqual([...SALES, '/users', '/outlets', '/settings']);
  });

  it('OUTLET_ADMIN sees users but not outlets or loyalty', () => {
    expect(hrefs('OUTLET_ADMIN')).toEqual([...SALES, '/users', '/settings']);
  });

  it('OUTLET_STAFF sees neither users nor outlets', () => {
    expect(hrefs('OUTLET_STAFF')).toEqual([...SALES, '/settings']);
  });

  it('normalises role casing and spaces', () => {
    expect(hrefs(' outlet_staff ')).toEqual(hrefs('OUTLET_STAFF'));
  });

  it('without a role hides role-restricted items', () => {
    expect(hrefs(undefined)).not.toContain('/loyalty');
  });
});

describe('loyalty module (#967): Khách thân thiết needs merchant.modules to have loyalty (plan or add-on)', () => {
  const withModules = (role: string | undefined, modules: string[]) =>
    filterNavForRole(SHELL_NAV_ITEMS, role, modules).map((i) => i.href);

  it('off: no Khách thân thiết even for the owner', () => {
    expect(withModules('MERCHANT', [])).not.toContain('/loyalty');
    expect(withModules('MERCHANT', ['attendance'])).not.toContain('/loyalty');
  });

  it('on: the owner sees it, other roles still do not', () => {
    expect(withModules('MERCHANT', ['loyalty'])).toEqual([...SALES, '/loyalty', '/users', '/outlets', '/settings']);
    for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      expect(withModules(role, ['loyalty'])).not.toContain('/loyalty');
    }
  });
});

describe('attendance module (#908)', () => {
  const withModules = (role: string | undefined, modules: string[]) =>
    filterNavForRole(SHELL_NAV_ITEMS, role, modules).map((i) => i.href);

  it('module off: no Chấm công for anyone, outlet admin still has no Chi nhánh', () => {
    expect(withModules('MERCHANT', [])).not.toContain('/attendance');
    expect(withModules('OUTLET_ADMIN', [])).not.toContain('/attendance');
    expect(withModules('OUTLET_ADMIN', [])).not.toContain('/outlets');
  });

  it('module on: owner and outlet admin see Chấm công; Chi nhánh stays owner-only (#945)', () => {
    expect(withModules('MERCHANT', ['attendance', 'loyalty'])).toEqual([...SALES, '/loyalty', '/users', '/attendance', '/outlets', '/settings']);
    expect(withModules('OUTLET_ADMIN', ['attendance'])).toEqual([...SALES, '/users', '/attendance', '/settings']);
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
    filterNavForRole(SHELL_NAV_ITEMS, role, modules);
  const attendance = (role: string, modules: string[]) => visible(role, modules).find((i) => i.key === 'attendance');

  it('Chấm công carries four screens; Chi tiết theo người is opened from Bảng công, not the menu', () => {
    for (const role of ['MERCHANT', 'OUTLET_ADMIN']) {
      const item = attendance(role, ['attendance']);
      expect(item?.children?.map((c) => [c.key, c.href])).toEqual([
        ['timesheet', '/attendance'],
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
    expect(activeNavChild(item, '/attendance/person')?.key).toBe('timesheet');
    expect(activeNavChild(item, '/attendance/shifts')?.key).toBe('shifts');
    expect(activeNavChild(item, '/attendance/templates')?.key).toBe('templates');
    expect(activeNavChild(item, '/attendance/locations')?.key).toBe('locations');
    expect(activeNavChild(item, '/attendance/locations/12')?.key).toBe('locations');
    expect(activeNavChild(item, '/attendance/locationsx')).toBeUndefined();
    expect(activeNavChild(item, '/orders')).toBeUndefined();
    expect(activeNavChild(item, null)).toBeUndefined();
  });

  it('isNavChildActive: exact children match only themselves, plus their `also` pages', () => {
    expect(isNavChildActive('/attendance', { key: 'timesheet', href: '/attendance', exact: true })).toBe(true);
    expect(isNavChildActive('/attendance/shifts', { key: 'timesheet', href: '/attendance', exact: true })).toBe(false);
    expect(isNavChildActive('/attendance/person', { key: 'timesheet', href: '/attendance', exact: true })).toBe(false);
    expect(isNavChildActive('/attendance/person', { key: 'timesheet', href: '/attendance', exact: true, also: ['/attendance/person'] })).toBe(true);
  });

  it('a sub-item link keeps ?outletId and ?month, drops anything else', () => {
    const item = attendance('MERCHANT', ['attendance'])!;
    const shifts = item.children!.find((c) => c.key === 'shifts')!;
    expect(navChildHref(item, shifts, '?outletId=3&month=2026-10&q=x')).toBe('/attendance/shifts?outletId=3&month=2026-10');
    expect(navChildHref(item, shifts, '')).toBe('/attendance/shifts');
    expect(navChildHref(item, shifts, '?q=x')).toBe('/attendance/shifts');
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

  it('rows take their tone from navItemTone (one highlighted row)', () => {
    expect(src).toMatch(/navItemTone\(/);
  });
});

describe('menu groups (#960, option A)', () => {
  const groups = (role: string | undefined, modules: string[] = []) =>
    filterNavGroups(role, modules).map((g) => `${g.key ?? '-'}: ${g.items.map((i) => i.key).join(',')}`);

  it('MERCHANT with the module: every group, Chấm công under Nhân sự', () => {
    expect(groups('MERCHANT', ['attendance', 'loyalty'])).toEqual([
      '-: overview',
      'sales: orders,calendar,availability',
      'goods: products,categories',
      'customers: customers,loyalty',
      'people: staff,attendance',
      'shop: outlets,settings',
    ]);
  });

  it('MERCHANT without the module: Nhân sự keeps Nhân viên only', () => {
    expect(groups('MERCHANT')).toContain('people: staff');
  });

  it('OUTLET_ADMIN: no Khách thân thiết, no Chi nhánh', () => {
    expect(groups('OUTLET_ADMIN', ['attendance'])).toEqual([
      '-: overview',
      'sales: orders,calendar,availability',
      'goods: products,categories',
      'customers: customers',
      'people: staff,attendance',
      'shop: settings',
    ]);
  });

  it('staff and kho: the Nhân sự header disappears with its items', () => {
    for (const role of ['OUTLET_STAFF', 'OUTLET_INVENTORY']) {
      expect(groups(role, ['attendance'])).toEqual([
        '-: overview',
        'sales: orders,calendar,availability',
        'goods: products,categories',
        'customers: customers',
        'shop: settings',
      ]);
    }
  });

  it('every visible item is in exactly one group', () => {
    const flat = filterNavGroups('MERCHANT', ['attendance']).flatMap((g) => g.items.map((i) => i.key));
    expect(new Set(flat).size).toBe(flat.length);
    expect(flat).toEqual(filterNavForRole(SHELL_NAV_ITEMS, 'MERCHANT', ['attendance']).map((i) => i.key));
  });
});

describe('one highlighted row (#960)', () => {
  it('a hovered row never takes the active background', () => {
    expect(navItemTone(false)).not.toMatch(/bg-ar-primary-soft|bg-ar-subtle/);
    expect(navItemTone(true)).toMatch(/bg-ar-primary-soft/);
  });

  it('only one menu href matches any page', () => {
    for (const p of ['/dashboard', '/orders/12', '/users/3', '/categories', '/attendance/person', '/outlets', '/loyalty']) {
      expect(SHELL_NAV_ITEMS.filter((i) => isNavActive(p, i.href))).toHaveLength(1);
    }
  });
});
