import { z } from 'zod';
import { db } from '@rentalshop/database';
import {
  ATTENDANCE_MANAGER_ROLES,
  attendanceRoute,
  forbid,
  isOwner,
  resolveOutlet,
} from '../../../../lib/attendance/context';
import { attendanceOk, validationFailed } from '../../../../lib/attendance/http';
import { bodyOf, idSchema, queryIdSchema, queryOf } from '../../../../lib/attendance/schemas';
import { settingView } from '../../../../lib/attendance/views';

/**
 * GET /api/attendance/settings?outletId= — #907 rule 7. MERCHANT (any own outlet), OUTLET_ADMIN (own outlet).
 * With outletId: location, radius, QR (code computed, not stored) and kiosk token. Without: the outlets in
 * scope with { outletId, configured, qrMode, generated }. Indexed: AttendanceSetting.outletId (unique).
 */
export const GET = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = z.object({ outletId: queryIdSchema.optional() }).safeParse(queryOf(request.url));
  if (!parsed.success) return validationFailed(parsed.error);
  const now = new Date();

  if (parsed.data.outletId) {
    const outlet = await resolveOutlet(user, parsed.data.outletId);
    const setting = await db.attendance.getSetting(outlet.id);
    return attendanceOk('ATTENDANCE_SETTINGS_SUCCESS', settingView(outlet.id, setting, now));
  }

  const outlets = await db.attendance.listOutlets(user.merchantId, isOwner(user) ? null : user.outletId);
  const settings = await db.attendance.listSettings(outlets.map((o: { id: number }) => o.id));
  const byOutlet = new Map(settings.map((s) => [s.outletId, s]));
  return attendanceOk(
    'ATTENDANCE_SETTINGS_SUCCESS',
    outlets.map((o: { id: number }) => {
      const s = byOutlet.get(o.id);
      return {
        outletId: o.id,
        configured: s?.latitude != null && s?.longitude != null,
        qrMode: s?.qrMode === 'FIXED' ? 'FIXED' : 'DAILY',
        generated: !!s && s.qrVersion > 0,
      };
    })
  );
});

const putSchema = z
  .object({
    outletId: idSchema,
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusM: z.number().int().min(50).max(500).optional(),
    qrMode: z.enum(['DAILY', 'FIXED']).optional(),
  })
  .refine((b) => (b.latitude === undefined) === (b.longitude === undefined), {
    message: 'latitude and longitude go together',
    path: ['latitude'],
  });

/**
 * PUT /api/attendance/settings — #907 rule 8. Coordinates and radius: MERCHANT only.
 * qrMode: MERCHANT and OUTLET_ADMIN of that outlet; changing it makes a new code (version + 1).
 */
export const PUT = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = putSchema.safeParse(await bodyOf(request));
  if (!parsed.success) return validationFailed(parsed.error);
  const body = parsed.data;
  const touchesLocation = body.latitude !== undefined || body.radiusM !== undefined;
  if (touchesLocation && !isOwner(user)) forbid();

  const outlet = await resolveOutlet(user, body.outletId);
  const current = await db.attendance.getSetting(outlet.id);
  const data: Record<string, unknown> = {};
  if (body.latitude !== undefined) data.latitude = body.latitude;
  if (body.longitude !== undefined) data.longitude = body.longitude;
  if (body.radiusM !== undefined) data.radiusM = body.radiusM;
  const currentMode = current?.qrMode === 'FIXED' ? 'FIXED' : 'DAILY';
  if (body.qrMode !== undefined && body.qrMode !== currentMode) {
    data.qrMode = body.qrMode;
    if (current && current.qrVersion > 0) {
      data.qrVersion = current.qrVersion + 1;
    }
  }
  const saved = Object.keys(data).length > 0 ? await db.attendance.upsertSetting(outlet.id, user.merchantId, data) : current;
  return attendanceOk('ATTENDANCE_SETTINGS_UPDATED', settingView(outlet.id, saved, new Date()));
});
