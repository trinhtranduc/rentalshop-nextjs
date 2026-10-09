/**
 * #682 — Nhân viên kho (OUTLET_INVENTORY): staff + product and category management.
 */
import { ROLE_PERMISSIONS, CRITICAL_PERMISSIONS } from '../../../packages/auth/src/permissions';
import { USER_ROLE, isOutletRole, isStaffLikeRole } from '../../../packages/constants/src/status';
import { canAssignRole, isRoleAssignable } from '../../../apps/api/lib/user-scope';

const PRODUCT_KEYS = ['products.manage', 'products.create', 'products.update', 'products.export'];

describe('#682 OUTLET_INVENTORY permissions', () => {
  const inventory = ROLE_PERMISSIONS.OUTLET_INVENTORY;
  const staff = ROLE_PERMISSIONS.OUTLET_STAFF;

  it('is staff plus the four product keys, nothing else', () => {
    const expected = new Set([...staff, ...PRODUCT_KEYS]);
    expect(new Set(inventory)).toEqual(expected);
    expect(inventory.length).toBe(expected.size);
  });

  it('sees no revenue and cannot delete orders, manage users or the outlet', () => {
    for (const key of ['analytics.view.revenue', 'analytics.view', 'orders.delete', 'orders.export', 'users.manage', 'users.view', 'outlet.manage', 'bankAccounts.view', 'customers.export']) {
      expect(inventory).not.toContain(key);
    }
  });

  it('has products.manage as critical, on top of the staff critical keys', () => {
    expect(CRITICAL_PERMISSIONS.OUTLET_INVENTORY).toEqual(expect.arrayContaining([...CRITICAL_PERMISSIONS.OUTLET_STAFF, 'products.manage']));
    for (const key of CRITICAL_PERMISSIONS.OUTLET_INVENTORY) expect(inventory).toContain(key);
  });

  it('leaves every other role unchanged', () => {
    const others = Object.fromEntries(
      Object.entries(ROLE_PERMISSIONS).filter(([role]) => role !== 'OUTLET_INVENTORY').map(([role, keys]) => [role, [...keys].sort()])
    );
    // Recorded from the code before #682
    expect(others).toEqual(require('./__fixtures__/role-permissions-before-682.json'));
  });
});

describe('#682 role helpers', () => {
  it('counts the new role as an outlet role and as staff for money', () => {
    expect(USER_ROLE.OUTLET_INVENTORY).toBe('OUTLET_INVENTORY');
    expect(isOutletRole('OUTLET_INVENTORY')).toBe(true);
    expect(isOutletRole('OUTLET_ADMIN')).toBe(true);
    expect(isOutletRole('MERCHANT')).toBe(false);
    expect(isStaffLikeRole('OUTLET_INVENTORY')).toBe(true);
    expect(isStaffLikeRole('OUTLET_STAFF')).toBe(true);
    expect(isStaffLikeRole('OUTLET_ADMIN')).toBe(false);
  });
});

describe('#682 assigning the role', () => {
  it('merchant and outlet admin may give it; staff and inventory staff may not give anything', () => {
    expect(canAssignRole({ role: 'MERCHANT' }, 'OUTLET_INVENTORY', null)).toBe(true);
    expect(canAssignRole({ role: 'OUTLET_ADMIN' }, 'OUTLET_INVENTORY', 'OUTLET_STAFF')).toBe(true);
    expect(canAssignRole({ role: 'OPS' }, 'OUTLET_INVENTORY', null)).toBe(true);
    expect(canAssignRole({ role: 'OUTLET_STAFF' }, 'OUTLET_INVENTORY', null)).toBe(false);
    expect(canAssignRole({ role: 'OUTLET_INVENTORY' }, 'OUTLET_STAFF', null)).toBe(false);
  });

  it('cannot be given while INVENTORY_ROLE_ENABLED is not true; other roles are not affected', () => {
    expect(isRoleAssignable('OUTLET_INVENTORY', {})).toBe(false);
    expect(isRoleAssignable('OUTLET_INVENTORY', { INVENTORY_ROLE_ENABLED: 'false' })).toBe(false);
    expect(isRoleAssignable('OUTLET_INVENTORY', { INVENTORY_ROLE_ENABLED: 'true' })).toBe(true);
    expect(isRoleAssignable('OUTLET_STAFF', {})).toBe(true);
  });
});
