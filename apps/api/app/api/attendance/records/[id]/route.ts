import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet } from '../../../../../lib/attendance/context';
import { AttendanceHttpError, attendanceError, attendanceOk, validationFailed } from '../../../../../lib/attendance/http';
import { assertMayEditRecordOf, assertMonthOpen, assertRecordTimes, recordAudit } from '../../../../../lib/attendance/records';
import { bodyOf, isoInstantSchema, paramId, reasonSchema } from '../../../../../lib/attendance/schemas';
import { recordView } from '../../../../../lib/attendance/views';

type Params = { params: Promise<{ id: string }> | { id: string } };

const patchSchema = z
  .object({ checkInAt: isoInstantSchema.optional(), checkOutAt: isoInstantSchema.optional(), reason: reasonSchema })
  .refine((b) => b.checkInAt !== undefined || b.checkOutAt !== undefined, { message: 'Nothing to change', path: ['checkOutAt'] });

/**
 * PATCH /api/attendance/records/[id] { checkInAt?, checkOutAt?, reason } — #907 rule 29.
 * MERCHANT, OUTLET_ADMIN (own outlet, not their own records). ISO 8601 with offset; OUT after IN, ≤ 24 h;
 * status becomes DONE; an AttendanceEdit keeps before / after / reason / editor. Locked month → 409.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  return attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (req, { user }) => {
    const id = paramId((await Promise.resolve(params)).id);
    const parsed = patchSchema.safeParse(await bodyOf(req));
    if (!parsed.success) return validationFailed(parsed.error);
    const record = id ? await db.attendance.getRecord(id, user.merchantId) : null;
    if (!record) throw new AttendanceHttpError('NOT_FOUND', 404);
    await resolveOutlet(user, record.outletId);
    assertMayEditRecordOf(user, record.userId);
    await assertMonthOpen(record.outletId, record.dateKey);

    const checkInAt = parsed.data.checkInAt ? new Date(parsed.data.checkInAt) : new Date(record.checkInAt);
    const checkOutAt = parsed.data.checkOutAt ? new Date(parsed.data.checkOutAt) : record.checkOutAt ? new Date(record.checkOutAt) : null;
    if (!checkOutAt) return attendanceError('INVALID_PAYLOAD', 400);
    assertRecordTimes(checkInAt, checkOutAt);

    const data = { checkInAt, checkOutAt, status: 'DONE' };
    const updated = await db.attendance.updateRecordWithEdit(record.id, data, {
      editedById: user.id,
      before: recordAudit(record),
      after: recordAudit(data),
      reason: parsed.data.reason,
    });
    return attendanceOk('ATTENDANCE_RECORD_UPDATED', recordView(updated));
  })(request);
}
