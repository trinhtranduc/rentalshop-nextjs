import type { AuthUser } from './types';

export type Role = 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';

function normalizeRole(role: string | undefined | null): Role | null {
  if (!role) return null;
  const upper = role.toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'MERCHANT') return 'MERCHANT';
  if (upper === 'OUTLET_ADMIN') return 'OUTLET_ADMIN';
  if (upper === 'OUTLET_STAFF') return 'OUTLET_STAFF';
  return null;
}

export function hasAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): boolean {
  const r = normalizeRole(user.role);
  return !!r && allowed.includes(r);
}

export function assertAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): void {
  if (!hasAnyRole(user, allowed)) {
    const roles = allowed.join(', ');
    throw new Error(`Forbidden: requires role ${roles}`);
  }
}

export function getUserScope(user: Partial<AuthUser>): { merchantId?: string; outletId?: string } {
  const merchantId = (user as any)?.merchant?.id as string | undefined;
  const outletId = (user as any)?.outlet?.id as string | undefined;
  return { merchantId, outletId };
}

export function isMerchantLevel(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT']);
}

export function isOutletTeam(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['OUTLET_ADMIN', 'OUTLET_STAFF']);
}


