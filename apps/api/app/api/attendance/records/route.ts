import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet, resolveOutletUser } from '../../../../lib/attendance/context';
import { attendanceOk, validationFailed } from '../../../../lib/attendance/http';
import { assertMayEditRecordOf, assertMonthOpen, assertRecordTimes, recordAudit } from '../../../../lib/attendance/records';
import { addDaysToDateKey, matchShiftForInstant, vnDateKey } from '../../../../lib/attendance/rules';
import { effectiveShiftsForDay } from '../../../../lib/attendance/schedule';
import { bodyOf, idSchema, isoInstantSchema, reasonSchema } from '../../../../lib/attendance/schemas';
import { recordView } from '../../../../lib/attendance/views';

const createSchema = z.object({
  outletId: idSchema,
  userId: idSchema,
  checkInAt: isoInstantSchema,
  checkOutAt: isoInstantSchema,
  reason: reasonSchema,
});

/**
 * POST /api/attendance/records — #907 rule 29 ("+ Thêm lượt"). MERCHANT, OUTLET_ADMIN (own outlet, not
 * their own records). A DONE MANUAL record with an AttendanceEdit (reason, editor). Locked month → 409.
 */
export const POST = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = createSchema.safeParse(await bodyOf(request));
  if (!parsed.success) return validationFailed(parsed.error);
  const body = parsed.data;
  const checkInAt = new Date(body.checkInAt);
  const checkOutAt = new Date(body.checkOutAt);
  assertRecordTimes(checkInAt, checkOutAt);

  const outlet = await resolveOutlet(user, body.outletId);
  await resolveOutletUser(user, body.userId, outlet.id);
  assertMayEditRecordOf(user, body.userId);

  const inDay = vnDateKey(checkInAt);
  const from = addDaysToDateKey(inDay, -1);
  const to = addDaysToDateKey(inDay, 1);
  const schedule = await db.attendance.getScheduleData({ merchantId: user.merchantId, userIds: [body.userId], from, to });
  const match = matchShiftForInstant(
    checkInAt,
    [from, inDay, to].map((dateKey) => ({
      dateKey,
      shifts: effectiveShiftsForDay(body.userId, dateKey, schedule.rules, schedule.dayChanges, schedule.templates),
    }))
  );
  const dateKey = match?.dateKey ?? inDay;
  await assertMonthOpen(outlet.id, dateKey);

  const data = {
    merchantId: user.merchantId,
    outletId: outlet.id,
    userId: body.userId,
    dateKey,
    shiftTemplateId: match?.shift.templateId ?? null,
    shiftName: match?.shift.name ?? null,
    shiftStart: match?.shift.start ?? null,
    shiftEnd: match?.shift.end ?? null,
    shiftBreak: match?.shift.breakMinutes ?? null,
    checkInAt,
    checkOutAt,
    status: 'DONE',
    source: 'MANUAL',
    suspectReasons: [] as string[],
  };
  const record = await db.attendance.createRecordWithEdit(data, {
    editedById: user.id,
    before: null,
    after: recordAudit(data),
    reason: body.reason,
  });
  return attendanceOk('ATTENDANCE_RECORD_CREATED', recordView(record));
});
