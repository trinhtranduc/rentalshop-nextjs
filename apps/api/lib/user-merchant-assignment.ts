import type { NextRequest } from 'next/server';
import { db } from '@rentalshop/database';
import { assertPlanLimit } from '@rentalshop/utils/server';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * Changing a user's merchant, outlet or role (#443).
 *
 * Runs after the scope checks in `user-scope.ts` (#366): those decide whether the caller may touch the user
 * and place it inside its own merchant/outlet. This adds the rules for moving an account to another
 * merchant, which only ADMIN may do. Products, orders and customers stay with the source merchant; only the
 * user's access scope changes. Any change of merchant, outlet or role sets `permissionsChangedAt`, and the
 * route must then invalidate the user's sessions.
 */

type Actor = { role: string };
type ExistingUser = {
  role: string;
  merchantId?: number | null;
  outletId?: number | null;
  isActive?: boolean | null;
};

/** The parsed update body; only these keys are read or set here. */
type AccessUpdate = {
  role?: string;
  merchantId?: number | null;
  outletId?: number | null;
  isActive?: boolean;
  permissionsChangedAt?: Date;
  [key: string]: unknown;
};

export type AccessChangeResult =
  | { ok: true; accessChanged: boolean }
  | { ok: false; code: string; status: number };

const OUTLET_ROLES: string[] = [USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF, USER_ROLE.OUTLET_INVENTORY];
const NO_TENANT_ROLES: string[] = [USER_ROLE.ARTICLE, USER_ROLE.OPS];

const fail = (code: string, status: number): AccessChangeResult => ({ ok: false, code, status });

/**
 * Validates a merchant/outlet/role change and normalises `updateData` in place
 * (drops the old outlet on a merchant move, clears tenant ids for ARTICLE/OPS, sets `permissionsChangedAt`).
 */
export async function applyUserAccessChange(
  actor: Actor,
  existingUser: ExistingUser,
  updateData: AccessUpdate
): Promise<AccessChangeResult> {
  const currentMerchantId = existingUser.merchantId ?? null;
  const currentOutletId = existingUser.outletId ?? null;
  const targetRole: string = updateData.role ?? existingUser.role;

  // CMS and platform-ops accounts keep no tenant access
  if (NO_TENANT_ROLES.includes(targetRole)) {
    updateData.merchantId = null;
    updateData.outletId = null;
  }

  const targetMerchantId: number | null =
    updateData.merchantId !== undefined ? updateData.merchantId ?? null : currentMerchantId;
  const merchantChanged = targetMerchantId !== currentMerchantId;

  // An outlet of merchant A is never carried over to merchant B
  if (merchantChanged && updateData.outletId === undefined) {
    updateData.outletId = null;
  }
  const targetOutletId: number | null =
    updateData.outletId !== undefined ? updateData.outletId ?? null : currentOutletId;
  const outletChanged = targetOutletId !== currentOutletId;
  const roleChanged = targetRole !== existingUser.role;
  const accessChanged = merchantChanged || outletChanged || roleChanged;
  if (!accessChanged) return { ok: true, accessChanged: false };

  const movesToMerchant = merchantChanged && targetMerchantId !== null;
  if (movesToMerchant && actor.role !== USER_ROLE.ADMIN) {
    return fail('MERCHANT_TRANSFER_ADMIN_ONLY', 403);
  }
  if (movesToMerchant) {
    const merchant = await db.merchants.findById(targetMerchantId as number);
    if (!merchant || merchant.isActive === false) return fail('MERCHANT_NOT_FOUND', 404);
  }

  // An owner is tied to its merchant; ownership moves need their own workflow
  if (movesToMerchant && (existingUser.role === USER_ROLE.MERCHANT || targetRole === USER_ROLE.MERCHANT)) {
    return fail('MERCHANT_OWNER_TRANSFER_NOT_SUPPORTED', 409);
  }

  const isTenantRole = targetRole !== USER_ROLE.ADMIN && !NO_TENANT_ROLES.includes(targetRole);
  if (isTenantRole && targetMerchantId === null) {
    return fail('MERCHANT_ASSOCIATION_REQUIRED', 400);
  }
  if (merchantChanged && OUTLET_ROLES.includes(targetRole) && targetOutletId === null) {
    return fail('OUTLET_ASSIGNMENT_REQUIRED', 400);
  }

  if (targetOutletId !== null && (outletChanged || merchantChanged)) {
    const outlet = await db.outlets.findById(targetOutletId);
    if (!outlet || outlet.isActive === false) return fail('OUTLET_NOT_FOUND', 404);
    if (outlet.merchantId !== targetMerchantId) return fail('OUTLET_MERCHANT_MISMATCH', 400);
  }

  // Never leave a merchant without an active owner
  const leavesOwnerRole =
    existingUser.role === USER_ROLE.MERCHANT &&
    existingUser.isActive !== false &&
    currentMerchantId !== null &&
    (targetRole !== USER_ROLE.MERCHANT || merchantChanged);
  if (leavesOwnerRole) {
    const owners = await db.users.getStats({ merchantId: currentMerchantId, role: USER_ROLE.MERCHANT, isActive: true });
    if (owners <= 1) return fail('CANNOT_TRANSFER_LAST_MERCHANT_OWNER', 409);
  }

  // The destination merchant must have room for one more active user
  const staysActive = existingUser.isActive !== false && updateData.isActive !== false;
  if (movesToMerchant && isTenantRole && staysActive) {
    try {
      await assertPlanLimit(targetMerchantId as number, 'users');
    } catch (error) {
      const planError = error as { code?: string; statusCode?: number } | null;
      if (planError?.code === 'PLAN_LIMIT_EXCEEDED') return fail('PLAN_LIMIT_EXCEEDED', planError.statusCode ?? 403);
      throw error;
    }
  }

  // Tokens issued before this moment carry the old merchant/outlet/role
  updateData.permissionsChangedAt = new Date();
  return { ok: true, accessChanged: true };
}

/** Audit context for user routes (actor, scope, request metadata). */
export function buildUserAuditContext(
  request: NextRequest,
  user: { id: number; email: string; role: string },
  userScope: { merchantId?: number | null; outletId?: number | null }
) {
  return {
    userId: String(user.id),
    userEmail: user.email,
    userRole: user.role,
    merchantId: userScope.merchantId != null ? String(userScope.merchantId) : undefined,
    outletId: userScope.outletId != null ? String(userScope.outletId) : undefined,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || undefined,
  };
}
