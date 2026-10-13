import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet, resolveOutletUser } from '../../../../../lib/attendance/context';
import { attendanceOk, validationFailed } from '../../../../../lib/attendance/http';
import { assertDayOpen, pickableTemplate, todayAndWorked, withScheduleNotice } from '../../../../../lib/attendance/schedule-ops';
import { bodyOf, dateKeySchema, hhmmSchema, idSchema, queryIdSchema, queryOf } from '../../../../../lib/attendance/schemas';
import { assertAllRequired } from '../../../../../lib/attendance/members';

const putSchema = z
  .object({
    outletId: idSchema,
    userId: idSchema,
    date: dateKeySchema,
    templateId: idSchema.optional(),
    custom: z.object({ startTime: hhmmSchema, endTime: hhmmSchema, breakMinutes: z.number().int().min(0).max(600) }).optional(),
    off: z.literal(true).optional(),
  })
  .refine((b) => [b.templateId !== undefined, b.custom !== undefined, b.off === true].filter(Boolean).length === 1, {
    message: 'Exactly one of templateId, custom, off',
    path: ['templateId'],
  });

/**
 * PUT /api/attendance/shifts/day — #907 rules 21-22. MERCHANT, OUTLET_ADMIN (own outlet).
 * Replaces one user's shifts on one day ("Đổi ca", "Giờ riêng", "Xoá ca ngày này").
 * A past or worked day → 409 SHIFT_LOCKED. The user gets SHIFT_CHANGED when the day is in the coming 14.
 * #927 a shift or custom hours for a user the shop did not choose → 409 ATTENDANCE_NOT_REQUIRED; `off` is allowed.
 */
export const PUT = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = putSchema.safeParse(await bodyOf(request));
  if (!parsed.success) return validationFailed(parsed.error);
  const body = parsed.data;
  const outlet = await resolveOutlet(user, body.outletId);
  const target = await resolveOutletUser(user, body.userId, outlet.id);
  if (body.off !== true) assertAllRequired([target]);
  const { today, worked } = await todayAndWorked([body.userId]);
  await assertDayOpen(body.date, today, [body.userId], worked, user.merchantId);
  if (body.templateId !== undefined) await pickableTemplate(user.merchantId, outlet.id, body.templateId);

  const saved = await withScheduleNotice({ merchantId: user.merchantId, outletId: outlet.id, userIds: [body.userId] }, today, worked, () =>
    db.attendance.upsertDayChange({
      merchantId: user.merchantId,
      outletId: outlet.id,
      userId: body.userId,
      dateKey: body.date,
      off: body.off === true,
      templateId: body.templateId ?? null,
      startTime: body.custom?.startTime ?? null,
      endTime: body.custom?.endTime ?? null,
      breakMinutes: body.custom ? body.custom.breakMinutes : null,
      createdById: user.id,
    })
  );
  return attendanceOk('SHIFT_DAY_UPDATED', {
    userId: saved.userId,
    date: saved.dateKey,
    off: saved.off,
    templateId: saved.templateId ?? null,
    startTime: saved.startTime ?? null,
    endTime: saved.endTime ?? null,
    breakMinutes: saved.breakMinutes ?? null,
  });
});

/**
 * DELETE /api/attendance/shifts/day?outletId&userId&date — #907 rule 21. Drops the one-day change; the day
 * returns to the weekly rules. A past or worked day → 409 SHIFT_LOCKED.
 */
export const DELETE = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = z.object({ outletId: queryIdSchema, userId: queryIdSchema, date: dateKeySchema }).safeParse(queryOf(request.url));
  if (!parsed.success) return validationFailed(parsed.error);
  const { outletId, userId, date } = parsed.data;
  const outlet = await resolveOutlet(user, outletId);
  await resolveOutletUser(user, userId, outlet.id);
  const { today, worked } = await todayAndWorked([userId]);
  await assertDayOpen(date, today, [userId], worked, user.merchantId);
  const removed = await withScheduleNotice({ merchantId: user.merchantId, outletId: outlet.id, userIds: [userId] }, today, worked, () =>
    db.attendance.deleteDayChange(userId, date)
  );
  return attendanceOk('SHIFT_DAY_DELETED', { userId, date, removed: removed > 0 });
});
