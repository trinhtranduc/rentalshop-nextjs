/**
 * Attendance module wire types (#907 API, used by the shop web #908).
 * Ids are the numeric public ids. Days are Vietnam civil day keys `YYYY-MM-DD`; instants are ISO strings.
 * Rule numbers refer to `.agent/changes/907-attendance-api/spec.md`.
 */

export type AttendanceQrMode = 'DAILY' | 'FIXED';
export type ShiftColor = 'blue' | 'purple' | 'green' | 'orange';
export type AttendanceAction = 'IN' | 'OUT';

/** Rule 7, with `outletId`. */
export interface AttendanceSettings {
  outletId: number;
  latitude: number | null;
  longitude: number | null;
  radiusM: number;
  qrMode: AttendanceQrMode;
  qr: { generated: boolean; code: string | null; validDate: string | null; createdAt: string | null };
  kioskToken: string | null;
}

/** Rule 7, without `outletId`: one row per outlet in scope. */
export interface AttendanceOutletSummary {
  outletId: number;
  configured: boolean;
  qrMode: AttendanceQrMode;
  generated: boolean;
}

/** Rule 8. */
export interface AttendanceSettingsUpdate {
  outletId: number;
  latitude?: number;
  longitude?: number;
  radiusM?: number;
  qrMode?: AttendanceQrMode;
}

/** Rule 12 (public kiosk). */
export interface AttendanceKioskQr {
  outlet: { id: number; name: string };
  code: string;
  qrMode: AttendanceQrMode;
  validDate: string | null;
  refreshAfterSec: number;
  recent: Array<{ name: string; action: AttendanceAction; at: string }>;
}

/** Rule 19. */
export interface ShiftTemplate {
  id: number;
  outletId: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  color: ShiftColor;
  isActive: boolean;
  used: boolean;
}

export interface ShiftTemplateInput {
  outletId: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  color: ShiftColor;
}

/** Rule 20. */
export interface ShiftRule {
  id: number;
  outletId: number;
  userId: number;
  templateId: number;
  weekdays: number[];
  startDate: string;
  endDate: string | null;
}

export interface ShiftRuleCreate {
  outletId: number;
  templateId: number;
  userIds: number[];
  weekdays: number[];
  startDate: string;
  endDate?: string | null;
}

/** Rule 21. */
export interface ShiftDayChange {
  outletId: number;
  userId: number;
  date: string;
  templateId?: number;
  custom?: { startTime: string; endTime: string; breakMinutes: number };
  off?: true;
}

/** Rule 23: one effective shift of a user on a day. */
export interface EffectiveShift {
  templateId?: number | null;
  name: string;
  start: string;
  end: string;
  color: ShiftColor | string;
  source: 'RULE' | 'DAY';
  locked: boolean;
}

export interface EffectiveShiftDay {
  userId: number;
  date: string;
  shifts: EffectiveShift[];
  /** A one-day change to "no shift". */
  off?: boolean;
  locked?: boolean;
}

/** Rule 23 response: the outlet's users and one item per user-day with shifts (or an "off" change). */
export interface EffectiveSchedule {
  outletId: number;
  from: string;
  to: string;
  users: Array<{ id: number; name: string }>;
  items: EffectiveShiftDay[];
}

/** Rule 26. */
export interface TimesheetDayFlags {
  late: boolean;
  early: boolean;
  overtime: boolean;
  missingOut: boolean;
  suspected: boolean;
}

export interface TimesheetDay {
  date?: string;
  hours: number;
  dayCredit: number;
  flags: Partial<TimesheetDayFlags>;
}

export interface TimesheetUser {
  userId?: number;
  id?: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  /** Keyed by day key, or a list with `date`. */
  days: Record<string, TimesheetDay> | TimesheetDay[];
  totals?: { hours: number; dayCredits: number };
}

export interface AttendanceTimesheet {
  outletId: number;
  month: string;
  users: TimesheetUser[];
  summary: { totalHours: number; pairs: number; missingOut: number; suspected: number };
  locked: boolean;
}

/** Rule 28. */
export type AttendanceRowKind = 'IN' | 'OUT' | 'EDIT';
export type AttendanceRowResult = 'ACCEPTED' | 'REJECTED' | 'AUTO_CLOSED' | 'EDITED';

export interface AttendancePersonRow {
  at: string;
  kind: AttendanceRowKind;
  result: AttendanceRowResult;
  errorCode?: string | null;
  distanceM?: number | null;
  accuracyM?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  shift?: { templateId?: number | null; name: string; start: string; end: string; breakMinutes?: number } | string | null;
  lateMinutes?: number | null;
  earlyMinutes?: number | null;
  overtimeMinutes?: number | null;
  suspectReasons?: string[] | null;
  note?: string | null;
  recordId?: number | null;
  /** Record day when the API sends it (edits are grouped under the record's day). */
  dateKey?: string | null;
}

export interface AttendancePersonSummary {
  days: number;
  hours: number;
  lateCount: number;
  earlyCount: number;
  overtimeCount: number;
  missingOut: number;
  suspected: number;
}

export interface AttendancePersonMonth {
  user?: { id: number; name?: string; firstName?: string; lastName?: string; role?: string };
  summary: AttendancePersonSummary;
  rows: AttendancePersonRow[];
  locked?: boolean;
}

/** Rule 29. */
export interface AttendanceRecordEdit {
  checkInAt?: string;
  checkOutAt?: string;
  reason: string;
}

export interface AttendanceRecordCreate {
  outletId: number;
  userId: number;
  checkInAt: string;
  checkOutAt: string;
  reason: string;
}

export type AttendanceExportPart = 'grid' | 'scans' | 'edits';
