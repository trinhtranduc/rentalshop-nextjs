/**
 * Unit tests for @rentalshop/auth - Permissions & Role definitions
 */
import { ROLE_PERMISSIONS, CRITICAL_PERMISSIONS } from '../../../packages/auth/src/permissions';
import type { Permission, Role } from '../../../packages/auth/src/permissions';

describe('@rentalshop/auth - Permissions', () => {
  const ALL_ROLES: Role[] = ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'];

  describe('ROLE_PERMISSIONS', () => {
    it('should define permissions for all roles', () => {
      ALL_ROLES.forEach(role => {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      });
    });

    it('ADMIN should have the most permissions', () => {
      const adminPerms = ROLE_PERMISSIONS['ADMIN'];
      ALL_ROLES.forEach(role => {
        expect(adminPerms.length).toBeGreaterThanOrEqual(ROLE_PERMISSIONS[role].length);
      });
    });

    it('ADMIN should have system.manage permission', () => {
      expect(ROLE_PERMISSIONS['ADMIN']).toContain('system.manage');
    });

    it('OUTLET_STAFF should NOT have system.manage', () => {
      expect(ROLE_PERMISSIONS['OUTLET_STAFF']).not.toContain('system.manage');
    });

    it('OUTLET_STAFF should NOT have orders.delete', () => {
      expect(ROLE_PERMISSIONS['OUTLET_STAFF']).not.toContain('orders.delete');
    });

    it('OUTLET_STAFF should have orders.create and orders.view', () => {
      expect(ROLE_PERMISSIONS['OUTLET_STAFF']).toContain('orders.create');
      expect(ROLE_PERMISSIONS['OUTLET_STAFF']).toContain('orders.view');
    });

    it('MERCHANT should have outlet.manage', () => {
      expect(ROLE_PERMISSIONS['MERCHANT']).toContain('outlet.manage');
    });

    it('OUTLET_STAFF should NOT have analytics.view.system', () => {
      expect(ROLE_PERMISSIONS['OUTLET_STAFF']).not.toContain('analytics.view.system');
    });

    it('only ADMIN should have analytics.view.system', () => {
      expect(ROLE_PERMISSIONS['ADMIN']).toContain('analytics.view.system');
      expect(ROLE_PERMISSIONS['MERCHANT']).not.toContain('analytics.view.system');
      expect(ROLE_PERMISSIONS['OUTLET_ADMIN']).not.toContain('analytics.view.system');
      expect(ROLE_PERMISSIONS['OUTLET_STAFF']).not.toContain('analytics.view.system');
    });

    it('should not have duplicate permissions within a role', () => {
      ALL_ROLES.forEach(role => {
        const perms = ROLE_PERMISSIONS[role];
        const unique = new Set(perms);
        expect(unique.size).toBe(perms.length);
      });
    });
  });

  describe('CRITICAL_PERMISSIONS', () => {
    it('should define critical permissions for all roles', () => {
      ALL_ROLES.forEach(role => {
        expect(CRITICAL_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(CRITICAL_PERMISSIONS[role])).toBe(true);
      });
    });

    it('ADMIN should have no critical permissions (unrestricted)', () => {
      expect(CRITICAL_PERMISSIONS['ADMIN']).toHaveLength(0);
    });

    it('critical permissions should be a subset of role permissions', () => {
      ALL_ROLES.forEach(role => {
        const critical = CRITICAL_PERMISSIONS[role];
        const rolePerms = ROLE_PERMISSIONS[role];
        critical.forEach(perm => {
          expect(rolePerms).toContain(perm);
        });
      });
    });

    it('MERCHANT should have products.manage as critical', () => {
      expect(CRITICAL_PERMISSIONS['MERCHANT']).toContain('products.manage');
    });

    it('OUTLET_ADMIN should have users.manage as critical', () => {
      expect(CRITICAL_PERMISSIONS['OUTLET_ADMIN']).toContain('users.manage');
    });
  });

  describe('Permission hierarchy', () => {
    it('higher roles should have all permissions of lower roles (general pattern)', () => {
      // OUTLET_STAFF basic permissions should exist in OUTLET_ADMIN
      const staffPerms = ROLE_PERMISSIONS['OUTLET_STAFF'];
      const adminPerms = ROLE_PERMISSIONS['OUTLET_ADMIN'];

      // Staff view permissions should be in admin
      const staffViewPerms = staffPerms.filter(p => p.endsWith('.view'));
      staffViewPerms.forEach(perm => {
        expect(adminPerms).toContain(perm);
      });
    });
  });
});
