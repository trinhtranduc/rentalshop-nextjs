/** #907 JSON shapes of attendance rows (numeric ids only). */
import { buildAttendanceQrCode, attendanceQrSecret } from './qr-code';
import { recordHours, shiftDeltas } from './rules';

export const DEFAULT_RADIUS_M = 100;

export interface SettingRow {
  outletId: number;
  latitude: number | null;
  longitude: number | null;
  radiusM: number;
  qrMode: string;
  qrVersion: number;
  qrCreatedAt: Date | null;
  kioskToken: string | null;
}

export function settingView(outletId: number, setting: SettingRow | null, now: Date) {
  const qrMode = setting?.qrMode === 'FIXED' ? 'FIXED' : 'DAILY';
  const generated = !!setting && setting.qrVersion > 0;
  const qr = generated
    ? buildAttendanceQrCode({ outletId, qrVersion: setting!.qrVersion, qrMode, now, secret: attendanceQrSecret() })
    : null;
  return {
    outletId,
    latitude: setting?.latitude ?? null,
    longitude: setting?.longitude ?? null,
    radiusM: setting?.radiusM ?? DEFAULT_RADIUS_M,
    qrMode,
    qr: {
      generated,
      code: qr?.code ?? null,
      validDate: qr?.validDate ?? null,
      createdAt: generated ? setting!.qrCreatedAt ?? null : null,
    },
    kioskToken: setting?.kioskToken ?? null,
  };
}

export interface RecordRow {
  id: number;
  outletId: number;
  userId: number;
  dateKey: string;
  status: string;
  checkInAt: Date;
  checkOutAt: Date | null;
  shiftTemplateId?: number | null;
  shiftName?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  shiftBreak?: number | null;
  suspectedFake?: boolean;
  suspectReasons?: string[] | null;
  source?: string;
  autoClosedAt?: Date | null;
}

export function shiftOfRecord(r: RecordRow) {
  if (!r.shiftStart || !r.shiftEnd) return null;
  return {
    templateId: r.shiftTemplateId ?? null,
    name: r.shiftName ?? '',
    start: r.shiftStart,
    end: r.shiftEnd,
    breakMinutes: r.shiftBreak ?? 0,
  };
}

export function recordView(r: RecordRow) {
  const deltas = shiftDeltas({ dateKey: r.dateKey, shiftStart: r.shiftStart ?? null, shiftEnd: r.shiftEnd ?? null }, r.checkInAt, r.checkOutAt);
  return {
    id: r.id,
    outletId: r.outletId,
    userId: r.userId,
    dateKey: r.dateKey,
    status: r.status,
    checkInAt: r.checkInAt,
    checkOutAt: r.checkOutAt,
    hours: r.status === 'DONE' ? recordHours(r.checkInAt, r.checkOutAt, r.shiftBreak) : 0,
    shift: shiftOfRecord(r),
    ...deltas,
    suspectedFake: !!r.suspectedFake,
    suspectReasons: r.suspectReasons ?? [],
    source: r.source ?? 'PUNCH',
    autoClosedAt: r.autoClosedAt ?? null,
  };
}
