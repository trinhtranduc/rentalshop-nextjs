/**
 * #907 Attendance time rules. Instants are UTC; a "day" is a Vietnam civil day key `YYYY-MM-DD`;
 * shift times are `HH:mm` VN wall time. Pure functions (unit tested under TZ=UTC and TZ=Asia/Ho_Chi_Minh).
 */
// Import-light (like lib/shop-timezone.ts): the date-range helpers are import-free, the utils barrel is not.
import {
  addDaysToDateKey,
  formatDateKeyInTimeZone,
  getUtcRangeForDateKeys,
} from '../../../../packages/utils/src/core/date-range';
import { haversineMeters } from './geo';

export const ATTENDANCE_TIME_ZONE = 'Asia/Ho_Chi_Minh';
/** IN may happen this long before a shift starts and still link to it */
export const EARLY_IN_WINDOW_MS = 3 * 60 * 60 * 1000;
/** A cross-midnight shift's open record closes this long after the shift end */
export const CROSS_MIDNIGHT_GRACE_MS = 4 * 60 * 60 * 1000;
export const MAX_ACCURACY_M = 100;
export const SUSPECT_SPEED_MPS = 50;

export interface ShiftSnapshot {
  dateKey: string;
  shiftStart: string | null;
  shiftEnd: string | null;
}

export interface EffectiveShift {
  templateId: number | null;
  name: string;
  start: string;
  end: string;
  breakMinutes: number;
  color: string;
  source: 'RULE' | 'DAY';
}

/** VN civil day of an instant. */
export function vnDateKey(at: Date): string {
  return formatDateKeyInTimeZone(at, ATTENDANCE_TIME_ZONE);
}

export function vnToday(now: Date = new Date()): string {
  return vnDateKey(now);
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** The instant of `HH:mm` VN wall time on a VN day. */
export function instantAt(dateKey: string, hhmm: string): Date {
  const { start } = getUtcRangeForDateKeys({ from: dateKey }, ATTENDANCE_TIME_ZONE);
  return new Date(start.getTime() + hhmmToMinutes(hhmm) * 60_000);
}

/** End of a VN day (23:59:59.999 VN) as a UTC instant. */
export function endOfVnDay(dateKey: string): Date {
  return getUtcRangeForDateKeys({ from: dateKey }, ATTENDANCE_TIME_ZONE).end;
}

/** 1 = Monday … 7 = Sunday, from the calendar date of the key (no time zone involved). */
export function weekdayOfDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function crossesMidnight(start: string, end: string): boolean {
  return hhmmToMinutes(end) <= hhmmToMinutes(start);
}

/** Start / end instants of a shift on its day (a cross-midnight shift ends the next VN day). */
export function shiftWindow(dateKey: string, start: string, end: string): { start: Date; end: Date } {
  return {
    start: instantAt(dateKey, start),
    end: instantAt(crossesMidnight(start, end) ? addDaysToDateKey(dateKey, 1) : dateKey, end),
  };
}

/** When an OPEN record becomes MISSING_OUT: end of its VN day, or cross-midnight shift end + 4 h. */
export function recordCloseTime(snap: ShiftSnapshot): Date {
  if (snap.shiftStart && snap.shiftEnd && crossesMidnight(snap.shiftStart, snap.shiftEnd)) {
    return new Date(shiftWindow(snap.dateKey, snap.shiftStart, snap.shiftEnd).end.getTime() + CROSS_MIDNIGHT_GRACE_MS);
  }
  return endOfVnDay(snap.dateKey);
}

/** (OUT − IN) − break, floor 0, 2 decimals. No OUT = 0. */
export function recordHours(checkInAt: Date, checkOutAt: Date | null | undefined, breakMinutes: number | null | undefined): number {
  if (!checkOutAt) return 0;
  const ms = checkOutAt.getTime() - checkInAt.getTime() - (breakMinutes || 0) * 60_000;
  if (ms <= 0) return 0;
  return Math.round((ms / 3_600_000) * 100) / 100;
}

/** Late / early / overtime minutes against the record's shift snapshot (display only). */
export function shiftDeltas(
  snap: ShiftSnapshot,
  checkInAt: Date,
  checkOutAt: Date | null | undefined
): { lateMinutes: number; earlyMinutes: number; overtimeMinutes: number } {
  if (!snap.shiftStart || !snap.shiftEnd) return { lateMinutes: 0, earlyMinutes: 0, overtimeMinutes: 0 };
  const w = shiftWindow(snap.dateKey, snap.shiftStart, snap.shiftEnd);
  const minutes = (ms: number) => Math.max(0, Math.floor(ms / 60_000));
  return {
    lateMinutes: minutes(checkInAt.getTime() - w.start.getTime()),
    earlyMinutes: checkOutAt ? minutes(w.end.getTime() - checkOutAt.getTime()) : 0,
    overtimeMinutes: checkOutAt ? minutes(checkOutAt.getTime() - w.end.getTime()) : 0,
  };
}

/**
 * The shift an IN at `now` links to: a shift whose window [start − 3 h, end] contains `now`
 * (yesterday's cross-midnight shift counts). Closest start wins.
 */
export function matchShiftForInstant(
  now: Date,
  days: Array<{ dateKey: string; shifts: EffectiveShift[] }>
): { dateKey: string; shift: EffectiveShift } | null {
  let best: { dateKey: string; shift: EffectiveShift; gap: number } | null = null;
  const t = now.getTime();
  for (const day of days) {
    for (const shift of day.shifts) {
      const w = shiftWindow(day.dateKey, shift.start, shift.end);
      if (t < w.start.getTime() - EARLY_IN_WINDOW_MS || t > w.end.getTime()) continue;
      const gap = Math.abs(t - w.start.getTime());
      if (!best || gap < best.gap) best = { dateKey: day.dateKey, shift, gap };
    }
  }
  return best ? { dateKey: best.dateKey, shift: best.shift } : null;
}

export interface ScanPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  at: Date;
}

/** Suspected-fake reasons (stored, never blocking). */
export function suspectReasons(current: ScanPoint, previous: ScanPoint | null): string[] {
  const reasons: string[] = [];
  if (current.accuracy === 0) reasons.push('ZERO_ACCURACY');
  if (previous) {
    if (current.latitude === previous.latitude && current.longitude === previous.longitude) {
      reasons.push('SAME_COORDS');
    } else {
      const distance = haversineMeters(previous.latitude, previous.longitude, current.latitude, current.longitude);
      const seconds = (current.at.getTime() - previous.at.getTime()) / 1000;
      if (distance > current.accuracy + previous.accuracy && (seconds <= 0 || distance / seconds > SUSPECT_SPEED_MPS)) {
        reasons.push('SPEED');
      }
    }
  }
  return reasons;
}

/** `YYYY-MM` → first and last VN day keys of that month. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}

/** Re-exported so routes do not reach into packages/ themselves. */
export { addDaysToDateKey, getUtcRangeForDateKeys };
