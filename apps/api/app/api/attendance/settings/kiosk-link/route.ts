import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet } from '../../../../../lib/attendance/context';
import { attendanceOk, validationFailed } from '../../../../../lib/attendance/http';
import { bodyOf, idSchema } from '../../../../../lib/attendance/schemas';
import { settingView } from '../../../../../lib/attendance/views';

/**
 * POST /api/attendance/settings/kiosk-link { outletId } — #907 rule 11. MERCHANT, OUTLET_ADMIN of that outlet.
 * Creates or replaces the counter-screen token (32 random bytes, base64url). The old link stops at once.
 */
export const POST = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = z.object({ outletId: idSchema }).safeParse(await bodyOf(request));
  if (!parsed.success) return validationFailed(parsed.error);
  const outlet = await resolveOutlet(user, parsed.data.outletId);
  const token = randomBytes(32).toString('base64url');
  const setting = await db.attendance.setKioskToken(outlet.id, user.merchantId, token);
  return attendanceOk('ATTENDANCE_KIOSK_LINK_CREATED', settingView(outlet.id, setting, new Date()));
});
