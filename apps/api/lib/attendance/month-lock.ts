/** #907 Month lock / unlock (rule 30), MERCHANT only, both audited. */
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_OWNER_ROLES, attendanceRoute, resolveOutlet } from './context';
import { attendanceOk, validationFailed } from './http';
import { bodyOf, idSchema, monthSchema } from './schemas';

export function monthLockRoute(lock: boolean) {
  return attendanceRoute(ATTENDANCE_OWNER_ROLES, async (request, { user }) => {
    const parsed = z.object({ outletId: idSchema, month: monthSchema }).safeParse(await bodyOf(request));
    if (!parsed.success) return validationFailed(parsed.error);
    const outlet = await resolveOutlet(user, parsed.data.outletId);
    const { month } = parsed.data;
    if (lock) await db.attendance.lockMonth(outlet.id, month, user.id);
    else await db.attendance.unlockMonth(outlet.id, month);
    await db.auditLogs.create({
      entityType: 'ATTENDANCE_MONTH',
      entityId: `${outlet.id}:${month}`,
      action: lock ? 'ATTENDANCE_MONTH_LOCKED' : 'ATTENDANCE_MONTH_UNLOCKED',
      details: JSON.stringify({ outletId: outlet.id, month }),
      userId: user.id,
      merchantId: user.merchantId,
      outletId: outlet.id,
    });
    return attendanceOk(lock ? 'ATTENDANCE_MONTH_LOCKED' : 'ATTENDANCE_MONTH_UNLOCKED', { outletId: outlet.id, month, locked: lock });
  });
}
