import { NextRequest } from 'next/server';
import { db } from '@rentalshop/database';
import { mapAttendanceError, requireAttendanceModule } from '../../../../../lib/attendance/context';
import { attendanceError, attendanceOk } from '../../../../../lib/attendance/http';
import { attendanceQrSecret, buildAttendanceQrCode } from '../../../../../lib/attendance/qr-code';
import { instantAt, vnToday } from '../../../../../lib/attendance/rules';

export const dynamic = 'force-dynamic';

/**
 * GET /api/attendance/kiosk/qr — #907 rule 12. The only public attendance route (listed in middleware
 * publicRoutes): no session, authenticated by the outlet's `X-Kiosk-Token` (256-bit random).
 * Returns the current QR code, a refresh hint and the last 5 punches today (first name only).
 * Unknown token 401 UNAUTHORIZED; module off 403 MODULE_NOT_ENABLED; no coordinates / no QR 422.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('X-Kiosk-Token')?.trim();
    if (!token) return attendanceError('UNAUTHORIZED', 401);
    const setting = await db.attendance.findSettingByKioskToken(token);
    if (!setting) return attendanceError('UNAUTHORIZED', 401);

    const gate = await requireAttendanceModule(setting.outlet.merchantId);
    if (gate) return gate;
    if (setting.latitude == null || setting.longitude == null || setting.qrVersion <= 0) {
      return attendanceError('ATTENDANCE_NOT_CONFIGURED', 422);
    }

    const now = new Date();
    const today = vnToday(now);
    const qr = buildAttendanceQrCode({
      outletId: setting.outletId,
      qrVersion: setting.qrVersion,
      qrMode: setting.qrMode,
      now,
      secret: attendanceQrSecret(),
    });
    const recent = await db.attendance.recentPunches(setting.outletId, instantAt(today, '00:00'), 5);
    return attendanceOk('ATTENDANCE_KIOSK_QR_SUCCESS', {
      outlet: { id: setting.outlet.id, name: setting.outlet.name },
      code: qr.code,
      qrMode: setting.qrMode === 'FIXED' ? 'FIXED' : 'DAILY',
      validDate: qr.validDate,
      refreshAfterSec: 60,
      recent: recent.map((r: { firstName: string; action: string | null; at: Date }) => ({
        name: r.firstName,
        action: r.action,
        at: r.at,
      })),
    });
  } catch (error) {
    return mapAttendanceError(error);
  }
}
