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

describe('isNavActive', () => {
  it('matches the route and its children only', () => {
    expect(isNavActive('/orders', '/orders')).toBe(true);
    expect(isNavActive('/orders/123', '/orders')).toBe(true);
    expect(isNavActive('/orders-archive', '/orders')).toBe(false);
    expect(isNavActive(null, '/orders')).toBe(false);
  });
});
