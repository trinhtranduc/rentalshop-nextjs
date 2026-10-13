import { z } from 'zod';
import { db } from '@rentalshop/database';
import {
  ATTENDANCE_ROLES,
  attendanceRoute,
  isManager,
  requireSelfOrManager,
  resolveOutlet,
  resolveOutletUser,
} from '../../../../lib/attendance/context';
import { attendanceError, attendanceOk, validationFailed } from '../../../../lib/attendance/http';
import { addDaysToDateKey, vnToday } from '../../../../lib/attendance/rules';
import { effectiveSchedule, isDayLocked } from '../../../../lib/attendance/schedule';
import { dateKeySchema, queryIdSchema, queryOf } from '../../../../lib/attendance/schemas';
import { fullName } from '../../../../lib/attendance/timesheet';
import { listedPeople } from '../../../../lib/attendance/members';

const MAX_SHIFT_RANGE_DAYS = 62;

/**
 * GET /api/attendance/shifts?outletId&from&to[&userId] — #907 rule 23. Effective schedule per user per day
 * (rules + one-day changes), max 62 days. Managers see the outlet's users; OUTLET_STAFF / OUTLET_INVENTORY
 * only themselves (another userId → 403). Each shift says whether its day is locked (past or worked).
 * Days changed to "off" are listed with `off: true` and no shifts.
 * #927 the manager list = people chosen to clock in (owner included when chosen) + anyone with records at the
 * outlet in from..to.
 */
export const GET = attendanceRoute(ATTENDANCE_ROLES, async (request, { user }) => {
  const parsed = z
    .object({ outletId: queryIdSchema, from: dateKeySchema, to: dateKeySchema, userId: queryIdSchema.optional() })
    .safeParse(queryOf(request.url));
  if (!parsed.success) return validationFailed(parsed.error);
  const { outletId, from, to, userId } = parsed.data;
  if (to < from || addDaysToDateKey(from, MAX_SHIFT_RANGE_DAYS - 1) < to) return attendanceError('INVALID_QUERY', 400);
  if (userId) requireSelfOrManager(user, userId);

  const outlet = await resolveOutlet(user, outletId);
  let users: Array<{ id: number; firstName?: string | null; lastName?: string | null }>;
  if (userId) {
    users = [await resolveOutletUser(user, userId, outlet.id)];
  } else if (isManager(user)) {
    const [members, records] = await Promise.all([
      db.attendance.listMembers(outlet.id, user.merchantId),
      db.attendance.listRecords({ outletId: outlet.id, from, to }),
    ]);
    const { listed, missing } = listedPeople(members, records.map((r: { userId: number }) => r.userId));
    users = [...listed, ...(missing.length > 0 ? await db.attendance.findUsersByIds(missing) : [])];
  } else {
    users = [await resolveOutletUser(user, user.id, outlet.id)];
  }
  const userIds = users.map((u) => u.id);
  const [data, workedKeys] = await Promise.all([
    db.attendance.getScheduleData({ merchantId: user.merchantId, userIds, from, to }),
    db.attendance.workedDays(userIds, from, to),
  ]);
  const worked = new Set<string>(workedKeys);
  const today = vnToday();

  type Item = { userId: number; date: string; shifts: unknown[]; off?: boolean; locked?: boolean };
  const items: Item[] = effectiveSchedule({ userIds, from, to, ...data }).map((row) => ({
    userId: row.userId,
    date: row.date,
    shifts: row.shifts.map((s) => ({ ...s, locked: isDayLocked(row.userId, row.date, today, worked) })),
  }));
  for (const change of data.dayChanges) {
    if (change.off && userIds.includes(change.userId)) {
      items.push({ userId: change.userId, date: change.dateKey, shifts: [], off: true, locked: isDayLocked(change.userId, change.dateKey, today, worked) });
    }
  }
  items.sort((a, b) => a.userId - b.userId || a.date.localeCompare(b.date));

  return attendanceOk('ATTENDANCE_SHIFTS_SUCCESS', {
    outletId: outlet.id,
    from,
    to,
    users: users.map((u) => ({ id: u.id, name: fullName(u) })),
    items,
  });
});
