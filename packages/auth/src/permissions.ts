import type { AuthUser } from './types';
import { USER_ROLE, type UserRole } from '@rentalshop/constants';

export type Role = UserRole;

function normalizeRole(role: string | undefined | null): Role | null {
  if (!role) return null;
  const upper = role.toUpperCase();
  switch (upper) {
    case USER_ROLE.ADMIN:
      return USER_ROLE.ADMIN;
    case USER_ROLE.MERCHANT:
      return USER_ROLE.MERCHANT;
    case USER_ROLE.OUTLET_ADMIN:
      return USER_ROLE.OUTLET_ADMIN;
    case USER_ROLE.OUTLET_STAFF:
      return USER_ROLE.OUTLET_STAFF;
    default:
      return null;
  }
}

export function hasAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): boolean {
  const role = normalizeRole(user.role);
  return role !== null && allowed.includes(role);
}

export function isMerchantLevel(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT]);
}

export function isOutletTeam(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF]);
}

export function canManageUsers(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN]);
}

export function assertAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): void {
  if (!hasAnyRole(user, allowed)) {
    throw new Error(`Insufficient permissions. Required roles: ${allowed.join(', ')}`);
  }
}

export function canManageOutlets(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT]);
}

export function canManageProducts(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN]);
}

export function canAccessUserManagement(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN]);
}

export function canCreateOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF]);
}

export function canViewOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF]);
}

export function canUpdateOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN]);
}

export function canDeleteOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN]);
}

export function canManageOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN]);
}

export function canExportOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN]);
}

export function canExportProducts(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN]);
}

export function canExportCustomers(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, [USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN]);
}

