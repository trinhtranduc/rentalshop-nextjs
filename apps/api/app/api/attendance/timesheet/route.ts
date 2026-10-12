import { z } from 'zod';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet } from '../../../../lib/attendance/context';
import { attendanceOk, validationFailed } from '../../../../lib/attendance/http';
import { monthSchema, queryIdSchema, queryOf } from '../../../../lib/attendance/schemas';
import { loadTimesheet } from '../../../../lib/attendance/timesheet';

/**
 * GET /api/attendance/timesheet?outletId&month=YYYY-MM — #907 rules 26-27. MERCHANT, OUTLET_ADMIN (own outlet).
 * Per user per VN day { hours, dayCredit, flags }, user totals, summary and `locked`.
 * Indexed: AttendanceRecord(outletId, dateKey).
 */
export const GET = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = z.object({ outletId: queryIdSchema, month: monthSchema }).safeParse(queryOf(request.url));
  if (!parsed.success) return validationFailed(parsed.error);
  const outlet = await resolveOutlet(user, parsed.data.outletId);
  const sheet = await loadTimesheet(outlet.id, parsed.data.month);
  return attendanceOk('ATTENDANCE_TIMESHEET_SUCCESS', {
    outletId: sheet.outletId,
    month: sheet.month,
    locked: sheet.locked,
    users: sheet.users,
    summary: sheet.summary,
  });
});
