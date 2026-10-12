import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_ROLES, attendanceRoute, isOwner } from '../../../../lib/attendance/context';
import { haversineMeters } from '../../../../lib/attendance/geo';
import { attendanceError, attendanceOk, validationFailed } from '../../../../lib/attendance/http';
import { attendanceQrSecret, parseAttendanceQrCode, verifyAttendanceQrCode } from '../../../../lib/attendance/qr-code';
import {
  addDaysToDateKey,
  MAX_ACCURACY_M,
  matchShiftForInstant,
  recordCloseTime,
  shiftDeltas,
  suspectReasons,
  vnDateKey,
} from '../../../../lib/attendance/rules';
import { effectiveShiftsForDay } from '../../../../lib/attendance/schedule';
import { bodyOf } from '../../../../lib/attendance/schemas';
import { recordView, shiftOfRecord } from '../../../../lib/attendance/views';

const punchSchema = z.object({
  code: z.string().trim().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000),
  isMock: z.boolean().optional().default(false),
});

/**
 * POST /api/attendance/punch — #907 rules 13-17. MERCHANT and every outlet role.
 * Server time only. Checks in order (first failure answers, every one after the module gate is logged as an
 * AttendanceScan): module, mock location, QR (signature / version / mode / VN day), outlet, configured,
 * GPS accuracy ≤ 100 m, distance ≤ radius. Then one transaction (row lock on the user) decides IN or OUT.
 * Indexed: AttendanceRecord(userId, status), AttendanceScan(userId, at).
 */
export const POST = attendanceRoute(ATTENDANCE_ROLES, async (request, { user }) => {
  const parsed = punchSchema.safeParse(await bodyOf(request));
  if (!parsed.success) return validationFailed(parsed.error);
  const body = parsed.data;
  const now = new Date();

  await db.attendance.autoCloseOverdue({ userId: user.id }, now);
  const open = await db.attendance.findOpenRecord(user.id);
  const intended: 'IN' | 'OUT' = open ? 'OUT' : 'IN';

  const qr = parseAttendanceQrCode(body.code);
  const setting = qr ? await db.attendance.getSetting(qr.outletId) : null;
  const ownSetting = setting && setting.merchantId === user.merchantId ? setting : null;

  const reject = async (code: string, data?: Record<string, number>, distanceM: number | null = null) => {
    await db.attendance.createScan({
      merchantId: user.merchantId,
      outletId: ownSetting ? ownSetting.outletId : null,
      userId: user.id,
      at: now,
      action: intended,
      result: code,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      distanceM,
    });
    return attendanceError(code, 422, data);
  };

  if (body.isMock) return reject('MOCK_LOCATION');
  if (!qr || !verifyAttendanceQrCode(body.code, setting, now, attendanceQrSecret())) return reject('QR_EXPIRED');
  if (!ownSetting || (!isOwner(user) && user.outletId !== ownSetting.outletId)) return reject('QR_WRONG_OUTLET');
  if (ownSetting.latitude == null || ownSetting.longitude == null) return reject('ATTENDANCE_NOT_CONFIGURED');
  const accuracyM = Math.round(body.accuracy);
  if (body.accuracy > MAX_ACCURACY_M) return reject('GPS_INACCURATE', { accuracyM });
  const distanceM = Math.round(haversineMeters(ownSetting.latitude, ownSetting.longitude, body.latitude, body.longitude));
  if (distanceM > ownSetting.radiusM) return reject('OUT_OF_RANGE', { distanceM, radiusM: ownSetting.radiusM }, distanceM);

  // Shift of an IN: yesterday (cross-midnight), today and tomorrow (early IN before midnight)
  const today = vnDateKey(now);
  const from = addDaysToDateKey(today, -1);
  const to = addDaysToDateKey(today, 1);
  const schedule = await db.attendance.getScheduleData({ merchantId: user.merchantId, userIds: [user.id], from, to });
  const days = [from, today, to].map((dateKey) => ({
    dateKey,
    shifts: effectiveShiftsForDay(user.id, dateKey, schedule.rules, schedule.dayChanges, schedule.templates),
  }));
  const match = matchShiftForInstant(now, days);
  const snapshot = match
    ? {
        dateKey: match.dateKey,
        shiftTemplateId: match.shift.templateId,
        shiftName: match.shift.name,
        shiftStart: match.shift.start,
        shiftEnd: match.shift.end,
        shiftBreak: match.shift.breakMinutes,
      }
    : { dateKey: today, shiftTemplateId: null, shiftName: null, shiftStart: null, shiftEnd: null, shiftBreak: null };

  const result = await db.attendance.punch({
    merchantId: user.merchantId,
    outletId: ownSetting.outletId,
    userId: user.id,
    now,
    latitude: body.latitude,
    longitude: body.longitude,
    accuracy: body.accuracy,
    distanceM,
    inPlan: { ...snapshot, closeAt: recordCloseTime(snapshot) },
    suspect: (prev) => suspectReasons({ latitude: body.latitude, longitude: body.longitude, accuracy: body.accuracy, at: now }, prev),
  });

  const record = result.record;
  const deltas = shiftDeltas(
    { dateKey: record.dateKey, shiftStart: record.shiftStart ?? null, shiftEnd: record.shiftEnd ?? null },
    record.checkInAt,
    record.checkOutAt
  );
  return attendanceOk('ATTENDANCE_PUNCH_SUCCESS', {
    action: result.action,
    record: recordView(record),
    distanceM,
    accuracyM,
    ...deltas,
    shift: shiftOfRecord(record),
  });
});
