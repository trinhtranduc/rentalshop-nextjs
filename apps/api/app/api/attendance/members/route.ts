import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, forbid, isOwner, resolveOutlet, resolveOutletUser } from '../../../../lib/attendance/context';
import { attendanceOk, validationFailed } from '../../../../lib/attendance/http';
import { memberView, storedRequired } from '../../../../lib/attendance/members';
import { bodyOf, idSchema, queryIdSchema, queryOf } from '../../../../lib/attendance/schemas';

/**
 * GET /api/attendance/members?outletId — #927. MERCHANT, OUTLET_ADMIN (own outlet).
 * "Ai cần chấm công ở chi nhánh này": the outlet's people and the shop owner(s), each with `required`
 * (must clock in) and `isDefault` (no choice stored: role default, staff / inventory yes, others no).
 */
export const GET = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = z.object({ outletId: queryIdSchema }).safeParse(queryOf(request.url));
  if (!parsed.success) return validationFailed(parsed.error);
  const outlet = await resolveOutlet(user, parsed.data.outletId);
  const members = await db.attendance.listMembers(outlet.id, user.merchantId);
  return attendanceOk('ATTENDANCE_MEMBERS_SUCCESS', { items: members.map(memberView) });
});

const putSchema = z.object({ outletId: idSchema, userId: idSchema, required: z.boolean() });

/**
 * PUT /api/attendance/members { outletId, userId, required } — #927. Same roles. Stores null when `required`
 * equals the role default. The owner's flag is shop-wide, so only a MERCHANT changes a MERCHANT row.
 */
export const PUT = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = putSchema.safeParse(await bodyOf(request));
  if (!parsed.success) return validationFailed(parsed.error);
  const body = parsed.data;
  const outlet = await resolveOutlet(user, body.outletId);
  const target = await resolveOutletUser(user, body.userId, outlet.id);
  if (target.role === 'MERCHANT' && !isOwner(user)) forbid();
  const saved = await db.attendance.setRequired(target.id, storedRequired(target.role, body.required));
  return attendanceOk('ATTENDANCE_MEMBER_UPDATED', memberView(saved));
});
