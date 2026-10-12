/**
 * #509 shop shell: nav visibility per role must match the previous ClientSidebar.
 */
import { describe, expect, it } from '@jest/globals';
import {
  SHELL_MAIN_NAV,
  SHELL_MANAGE_NAV,
  filterNavForRole,
  isNavActive,
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

  it('module on: owner and outlet admin see Chấm công; outlet admin sees Chi nhánh', () => {
    expect(withModules('MERCHANT', ['attendance'])).toEqual([...MAIN, '/users', '/attendance', '/outlets', '/categories', '/loyalty', '/settings']);
    expect(withModules('OUTLET_ADMIN', ['attendance'])).toEqual([...MAIN, '/users', '/attendance', '/outlets', '/categories', '/settings']);
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
