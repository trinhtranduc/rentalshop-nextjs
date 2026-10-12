/**
 * #907 Attendance route plumbing: auth roles, the module gate (403 MODULE_NOT_ENABLED after auth, before
 * anything else), outlet / user scope and error mapping.
 *
 * Roles (spec rule 33): MERCHANT everything; OUTLET_ADMIN its own outlet (no coordinates / radius / month
 * lock, not its own records); OUTLET_STAFF / OUTLET_INVENTORY punch, me, own shifts and own month only.
 * ADMIN / OPS use only /api/merchants/[id]/modules. Another merchant's outlet / user / row → 404.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { MODULE_KEY, type UserRole } from '@rentalshop/constants';
import { AttendanceHttpError, asAttendanceErrorResponse, attendanceError } from './http';

export const ATTENDANCE_ROLES = ['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'] as const;
export const ATTENDANCE_MANAGER_ROLES = ['MERCHANT', 'OUTLET_ADMIN'] as const;
export const ATTENDANCE_OWNER_ROLES = ['MERCHANT'] as const;

export interface AttendanceUser {
  id: number;
  role: string;
  merchantId: number;
  outletId: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface AttendanceContext {
  user: AttendanceUser;
  userScope: unknown;
}

type Handler = (request: NextRequest, ctx: AttendanceContext) => Promise<NextResponse>;

export const isOwner = (user: AttendanceUser) => user.role === 'MERCHANT';
export const isManager = (user: AttendanceUser) => user.role === 'MERCHANT' || user.role === 'OUTLET_ADMIN';

/** 403 MODULE_NOT_ENABLED unless the merchant has the attendance module active. */
export async function requireAttendanceModule(merchantId: number | null | undefined): Promise<NextResponse | null> {
  if (!merchantId) return attendanceError('MODULE_NOT_ENABLED', 403);
  const active = await db.merchantModules.isActive(merchantId, MODULE_KEY.ATTENDANCE);
  return active ? null : attendanceError('MODULE_NOT_ENABLED', 403);
}

export function mapAttendanceError(error: unknown): NextResponse {
  const known = asAttendanceErrorResponse(error);
  if (known) return known;
  const { response, statusCode } = handleApiError(error);
  return NextResponse.json(response, { status: statusCode });
}

/** Auth wrapper + module gate + error mapping for every authenticated attendance route. */
export function attendanceRoute(roles: readonly string[], handler: Handler) {
  return withAuthRoles([...roles] as UserRole[])(async (request: NextRequest, ctx: { user: AttendanceUser; userScope: { merchantId?: number; outletId?: number } }) => {
    try {
      const user: AttendanceUser = {
        ...ctx.user,
        id: Number(ctx.user.id),
        merchantId: Number(ctx.user.merchantId ?? ctx.userScope?.merchantId),
        outletId: ctx.user.outletId ?? ctx.userScope?.outletId ?? null,
      };
      const gate = await requireAttendanceModule(user.merchantId);
      if (gate) return gate;
      return await handler(request, { user, userScope: ctx.userScope });
    } catch (error) {
      return mapAttendanceError(error);
    }
  });
}

export function forbid(): never {
  throw new AttendanceHttpError('INSUFFICIENT_PERMISSIONS', 403);
}

export function requireManager(user: AttendanceUser) {
  if (!isManager(user)) forbid();
}

/** The outlet if it belongs to the caller's merchant (else 404) and an outlet role is in it (else 403). */
export async function resolveOutlet(user: AttendanceUser, outletId: number) {
  const outlet = await db.attendance.getOutlet(outletId, user.merchantId);
  if (!outlet) throw new AttendanceHttpError('OUTLET_NOT_FOUND', 404);
  if (!isOwner(user) && user.outletId !== outlet.id) forbid();
  return outlet;
}

/** A user of the caller's merchant who works at `outletId` (else 404). */
export async function resolveOutletUser(user: AttendanceUser, userId: number, outletId: number) {
  const target = await db.attendance.getUserInMerchant(userId, user.merchantId);
  if (!target || (target.outletId !== outletId && !(target.role === 'MERCHANT' && target.id === user.id))) {
    throw new AttendanceHttpError('USER_NOT_FOUND', 404);
  }
  return target;
}

/** Staff may only ask about themselves. */
export function requireSelfOrManager(user: AttendanceUser, userId: number) {
  if (!isManager(user) && userId !== user.id) forbid();
}
