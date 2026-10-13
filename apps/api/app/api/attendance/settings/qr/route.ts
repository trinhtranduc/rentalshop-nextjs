import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet } from '../../../../../lib/attendance/context';
import { attendanceOk, validationFailed } from '../../../../../lib/attendance/http';
import { bodyOf, idSchema } from '../../../../../lib/attendance/schemas';
import { settingView } from '../../../../../lib/attendance/views';

/**
 * POST /api/attendance/settings/qr { outletId } — #907 rule 9. MERCHANT, OUTLET_ADMIN of that outlet.
 * "Tạo mã QR" / "Tạo mã mới": qrVersion + 1, every older code stops working at once.
 */
export const POST = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = z.object({ outletId: idSchema }).safeParse(await bodyOf(request));
  if (!parsed.success) return validationFailed(parsed.error);
  const outlet = await resolveOutlet(user, parsed.data.outletId);
  const setting = await db.attendance.bumpQrVersion(outlet.id, user.merchantId);
  return attendanceOk('ATTENDANCE_QR_CREATED', settingView(outlet.id, setting, new Date()));
});
