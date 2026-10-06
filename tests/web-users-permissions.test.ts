/**
 * #542 Phân quyền / Quyền theo vai trò (shop web). Pure model only.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh (no date logic, kept for the suite rule).
 */
import { describe, expect, it } from '@jest/globals';
import {
  EXTRA_PERMISSION_GROUPS,
  ROLE_PERMISSION_GROUPS,
  canManagePermissions,
  extraPermissionKeys,
  groupState,
  permissionPayload,
  permissionsFromRows,
  roleGrants,
  toggleGroup,
} from '../apps/client/app/users/permissions/permissions-model';

describe('canManagePermissions', () => {
  it('lets merchants, outlet admins and platform admins in', () => {
    expect(canManagePermissions('MERCHANT')).toBe(true);
    expect(canManagePermissions('outlet_admin')).toBe(true);
    expect(canManagePermissions('ADMIN')).toBe(true);
  });
  it('keeps outlet staff and unknown roles out', () => {
    expect(canManagePermissions('OUTLET_STAFF')).toBe(false);
    expect(canManagePermissions('')).toBe(false);
    expect(canManagePermissions(undefined)).toBe(false);
  });
});

describe('extra permission groups', () => {
  it('are the 7 keys of the old page', () => {
    expect(extraPermissionKeys()).toEqual([
      'orders.export',
      'orders.delete',
      'products.export',
      'customers.export',
      'users.view',
      'users.manage',
      'analytics.view',
    ]);
    expect(EXTRA_PERMISSION_GROUPS.map((g) => g.id)).toEqual(['orders', 'products', 'customers', 'users', 'dashboard']);
  });
});

describe('permissionPayload', () => {
  it('sends every key, switched-off ones as false (the old page dropped them)', () => {
    const payload = permissionPayload({ 'orders.export': true, 'orders.delete': false });
    expect(payload).toHaveLength(7);
    expect(payload).toContainEqual({ permission: 'orders.export', enabled: true });
    expect(payload).toContainEqual({ permission: 'orders.delete', enabled: false });
    expect(payload).toContainEqual({ permission: 'analytics.view', enabled: false });
  });
  it('ignores keys that are not on the page', () => {
    const payload = permissionPayload({ 'orders.manage': true });
    expect(payload.find((p) => p.permission === 'orders.manage')).toBeUndefined();
    expect(payload.every((p) => p.enabled === false)).toBe(true);
  });
});

describe('permissionsFromRows', () => {
  it('reads GET /api/users/{id}/permissions rows into switches', () => {
    const rows = [
      { permission: 'orders.export', enabled: true },
      { permission: 'users.view', enabled: false },
      { permission: 'something.else', enabled: true },
    ];
    expect(permissionsFromRows({ userId: 5, permissions: rows })).toEqual({
      'orders.export': true,
      'orders.delete': false,
      'products.export': false,
      'customers.export': false,
      'users.view': false,
      'users.manage': false,
      'analytics.view': false,
    });
  });
  it('treats a missing or odd body as all off', () => {
    expect(Object.values(permissionsFromRows(null)).every((v) => v === false)).toBe(true);
    expect(Object.values(permissionsFromRows({ permissions: 'x' })).every((v) => v === false)).toBe(true);
  });
});

describe('toggleGroup / groupState', () => {
  it('turns a whole module on, then off', () => {
    const on = toggleGroup({}, 'orders');
    expect(on['orders.export']).toBe(true);
    expect(on['orders.delete']).toBe(true);
    expect(groupState(on, 'orders')).toBe('all');
    const off = toggleGroup(on, 'orders');
    expect(groupState(off, 'orders')).toBe('none');
    expect(groupState({ 'orders.export': true }, 'orders')).toBe('some');
  });
  it('does not touch other modules', () => {
    const next = toggleGroup({ 'users.view': true }, 'orders');
    expect(next['users.view']).toBe(true);
  });
});

describe('roleGrants', () => {
  const defaults = {
    OUTLET_ADMIN: ['orders.view', 'orders.create', 'users.view', 'products.manage'],
    OUTLET_STAFF: ['orders.view', 'orders.create'],
  };
  it('marks each permission of the role view granted or not', () => {
    const staff = roleGrants(defaults, 'OUTLET_STAFF');
    const orders = staff.find((g) => g.id === 'orders');
    expect(orders?.items.find((i) => i.key === 'orders.view')?.granted).toBe(true);
    expect(orders?.items.find((i) => i.key === 'orders.delete')?.granted).toBe(false);
    const users = roleGrants(defaults, 'OUTLET_ADMIN').find((g) => g.id === 'users');
    expect(users?.items.find((i) => i.key === 'users.view')?.granted).toBe(true);
  });
  it('lists the same modules as the old shared view', () => {
    expect(ROLE_PERMISSION_GROUPS.map((g) => g.id)).toEqual(['outlet', 'users', 'products', 'orders', 'customers', 'dashboard']);
    expect(roleGrants({}, 'OUTLET_STAFF').every((g) => g.items.every((i) => !i.granted))).toBe(true);
  });
});
