import { db } from '@rentalshop/database';
import { ATTENDANCE_ROLES, attendanceRoute } from '../../../../lib/attendance/context';
import { attendanceOk } from '../../../../lib/attendance/http';
import { vnToday } from '../../../../lib/attendance/rules';
import { effectiveShiftsForDay } from '../../../../lib/attendance/schedule';
import { recordView } from '../../../../lib/attendance/views';
import { isRequired } from '../../../../lib/attendance/members';

/**
 * GET /api/attendance/me — #907 rule 32. Any role with the module (403 MODULE_NOT_ENABLED otherwise).
 * The app's Settings row and the one button: open record, today's shifts and status, last action.
 * status: IN_SHIFT (open record) | DONE (a closed record today) | NOT_STARTED.
 * #927 `required`: the shop chose this person to clock in (the app shows its clock card only then).
 */
export const GET = attendanceRoute(ATTENDANCE_ROLES, async (_request, { user }) => {
  const now = new Date();
  const today = vnToday(now);
  await db.attendance.autoCloseOverdue({ userId: user.id }, now);
  const [open, last, schedule, self] = await Promise.all([
    db.attendance.findOpenRecord(user.id),
    db.attendance.lastRecord(user.id),
    db.attendance.getScheduleData({ merchantId: user.merchantId, userIds: [user.id], from: today, to: today }),
    db.attendance.getUserInMerchant(user.id, user.merchantId),
  ]);
  const shifts = effectiveShiftsForDay(user.id, today, schedule.rules, schedule.dayChanges, schedule.templates);
  const status = open ? 'IN_SHIFT' : last && last.dateKey === today && last.status === 'DONE' ? 'DONE' : 'NOT_STARTED';
  const lastAction = last
    ? last.checkOutAt
      ? { action: 'OUT', at: last.checkOutAt, recordId: last.id }
      : { action: 'IN', at: last.checkInAt, recordId: last.id }
    : null;
  return attendanceOk('ATTENDANCE_ME_SUCCESS', {
    enabled: true,
    required: isRequired(self ?? { role: user.role }),
    openRecord: open ? recordView(open) : null,
    today: { date: today, shifts, status },
    lastAction,
  });
});
