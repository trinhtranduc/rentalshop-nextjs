import { USER_ROLE, OUTLET_USER_ROLES, isPlatformOpsRole } from '@rentalshop/constants';

/**
 * Who may read or change which user (user routes).
 * - ADMIN / OPS: every user.
 * - MERCHANT: users of its merchant.
 * - OUTLET_ADMIN / OUTLET_STAFF / OUTLET_INVENTORY: users of its outlet.
 * Out-of-scope users are answered as "not found" by the routes, so ids cannot be probed.
 */

type Actor = { role: string };
type Scope = { merchantId?: number | null; outletId?: number | null };
type TargetUser = {
  role?: string | null;
  merchantId?: number | null;
  outletId?: number | null;
  merchant?: { id?: number | null } | null;
  outlet?: { id?: number | null } | null;
};

const OUTLET_ROLES: string[] = [...OUTLET_USER_ROLES];

export function canAccessUser(actor: Actor, scope: Scope, target: TargetUser): boolean {
  if (isPlatformOpsRole(actor.role)) return true;
  const targetMerchantId = target.merchantId ?? target.merchant?.id ?? null;
  const targetOutletId = target.outletId ?? target.outlet?.id ?? null;
  if (OUTLET_ROLES.includes(actor.role)) {
    return scope.outletId != null && targetOutletId === scope.outletId;
  }
  return scope.merchantId != null && targetMerchantId === scope.merchantId;
}

/**
 * May `actor` give `newRole` to a user whose role is now `currentRole` (null when creating)?
 * Nobody but ADMIN hands out ADMIN or OPS; merchant and outlet users never hand out system roles.
 */
export function canAssignRole(actor: Actor, newRole: string, currentRole: string | null): boolean {
  if (actor.role === USER_ROLE.ADMIN) return true;
  if (actor.role === USER_ROLE.OPS) {
    return newRole !== USER_ROLE.ADMIN && newRole !== USER_ROLE.OPS;
  }
  if (actor.role === USER_ROLE.MERCHANT) {
    if (OUTLET_ROLES.includes(newRole)) return true;
    // A merchant keeps an owner an owner, or adds a co-owner of its own merchant
    return newRole === USER_ROLE.MERCHANT && (currentRole === null || currentRole === USER_ROLE.MERCHANT);
  }
  if (actor.role === USER_ROLE.OUTLET_ADMIN) {
    return OUTLET_ROLES.includes(newRole);
  }
  return false;
}

/**
 * #682: Nhân viên kho can be given only once `INVENTORY_ROLE_ENABLED=true` (both new app versions released:
 * an old Android app reads the role as UNKNOWN). Users who already have it keep it. Other roles always pass.
 */
export function isRoleAssignable(role: string, env: Record<string, string | undefined> = process.env): boolean {
  if (role !== USER_ROLE.OUTLET_INVENTORY) return true;
  return env.INVENTORY_ROLE_ENABLED === 'true';
}

/**
 * For merchant and outlet callers: a requested merchant must be their own, a requested outlet must belong to
 * their merchant (outlet roles: be their own outlet). Platform roles are not limited here.
 */
export async function isAllowedPlacement(
  actor: Actor,
  scope: Scope,
  requested: { merchantId?: number | null; outletId?: number | null },
  findOutlet: (id: number) => Promise<{ merchantId: number } | null>
): Promise<boolean> {
  if (isPlatformOpsRole(actor.role)) return true;
  if (requested.merchantId != null && requested.merchantId !== scope.merchantId) return false;
  if (requested.outletId != null) {
    if (OUTLET_ROLES.includes(actor.role) && requested.outletId !== scope.outletId) return false;
    const outlet = await findOutlet(requested.outletId);
    if (!outlet || outlet.merchantId !== scope.merchantId) return false;
  }
  return true;
}

/** A user object as it may leave the API: never with the password hash. */
export function toPublicUser<T extends Record<string, any> | null | undefined>(user: T): T {
  if (!user || typeof user !== 'object') return user;
  const { password: _password, ...rest } = user as Record<string, any>;
  return rest as T;
}
