import { z } from 'zod';
import { db } from '@rentalshop/database';
import {
  ATTENDANCE_MANAGER_ROLES,
  attendanceRoute,
  resolveOutlet,
  resolveOutletUser,
} from '../../../../lib/attendance/context';
import { attendanceError, attendanceOk, validationFailed } from '../../../../lib/attendance/http';
import {
  assertDayOpen,
  assertNoRuleOverlap,
  pickableTemplate,
  todayAndWorked,
  withScheduleNotice,
} from '../../../../lib/attendance/schedule-ops';
import { bodyOf, dateKeySchema, idSchema, queryIdSchema, queryOf, weekdaysSchema } from '../../../../lib/attendance/schemas';
import { ruleView } from '../../../../lib/attendance/templates';

/**
 * GET /api/attendance/shift-rules?outletId= — #907 rule 20. MERCHANT, OUTLET_ADMIN (own outlet).
 * Every rule of the outlet, ended ones included (history). Indexed: ShiftRule.outletId.
 */
export const GET = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = z.object({ outletId: queryIdSchema }).safeParse(queryOf(request.url));
  if (!parsed.success) return validationFailed(parsed.error);
  const outlet = await resolveOutlet(user, parsed.data.outletId);
  const rules = await db.attendance.listRules({ merchantId: user.merchantId, outletId: outlet.id });
  return attendanceOk('SHIFT_RULES_SUCCESS', rules.map(ruleView));
});

const createSchema = z.object({
  outletId: idSchema,
  templateId: idSchema,
  userIds: z.array(idSchema).min(1).max(100),
  weekdays: weekdaysSchema,
  startDate: dateKeySchema,
  endDate: dateKeySchema.nullable().optional(),
});

/**
 * POST /api/attendance/shift-rules — #907 rule 20. One rule row per user, repeating weekly.
 * startDate ≥ today (VN) else 409 SHIFT_LOCKED; overlap with another rule of a user → 409 SHIFT_OVERLAP.
 */
export const POST = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = createSchema.safeParse(await bodyOf(request));
  if (!parsed.success) return validationFailed(parsed.error);
  const body = parsed.data;
  const endDate = body.endDate ?? null;
  if (endDate && endDate < body.startDate) return attendanceError('INVALID_PAYLOAD', 400);

  const outlet = await resolveOutlet(user, body.outletId);
  const userIds = [...new Set(body.userIds)];
  for (const id of userIds) await resolveOutletUser(user, id, outlet.id);
  const template = await pickableTemplate(user.merchantId, outlet.id, body.templateId);

  const { today, worked } = await todayAndWorked(userIds);
  assertDayOpen(body.startDate, today, userIds, worked);

  const rows = userIds.map((userId) => ({
    merchantId: user.merchantId,
    outletId: outlet.id,
    userId,
    templateId: template.id,
    weekdays: body.weekdays,
    startDate: body.startDate,
    endDate,
    createdById: user.id,
  }));
  await assertNoRuleOverlap(user.merchantId, rows.map((r, i) => ({ ...r, id: -1 - i })));

  const created = await withScheduleNotice({ merchantId: user.merchantId, outletId: outlet.id, userIds }, today, worked, () =>
    db.attendance.createRules(rows)
  );
  return attendanceOk('SHIFT_RULES_CREATED', created.map(ruleView));
});
