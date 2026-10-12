/** #907 Manual record edits (rule 29): validation shared by PATCH and POST /api/attendance/records. */
import { db } from '@rentalshop/database';
import { AttendanceHttpError } from './http';
import type { AttendanceUser } from './context';

export const MAX_RECORD_MS = 24 * 60 * 60 * 1000;

/** checkOutAt > checkInAt and at most 24 h later, else 400 INVALID_PAYLOAD. */
export function assertRecordTimes(checkInAt: Date, checkOutAt: Date) {
  const span = checkOutAt.getTime() - checkInAt.getTime();
  if (!(span > 0) || span > MAX_RECORD_MS) throw new AttendanceHttpError('INVALID_PAYLOAD', 400);
}

/** OUTLET_ADMIN may not edit their own records (the owner does it). */
export function assertMayEditRecordOf(user: AttendanceUser, userId: number) {
  if (user.role !== 'MERCHANT' && userId === user.id) throw new AttendanceHttpError('INSUFFICIENT_PERMISSIONS', 403);
}

export async function assertMonthOpen(outletId: number, dateKey: string) {
  if (await db.attendance.isMonthLocked(outletId, dateKey.slice(0, 7))) {
    throw new AttendanceHttpError('MONTH_LOCKED', 409);
  }
}

export function recordAudit(r: { checkInAt: Date; checkOutAt: Date | null; status: string; dateKey?: string }) {
  return {
    checkInAt: r.checkInAt ? new Date(r.checkInAt).toISOString() : null,
    checkOutAt: r.checkOutAt ? new Date(r.checkOutAt).toISOString() : null,
    status: r.status,
    ...(r.dateKey ? { dateKey: r.dateKey } : {}),
  };
}
