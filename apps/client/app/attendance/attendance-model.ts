/**
 * Attendance web (#908): pure logic for the timesheet grid, schedule, dialogs and record times.
 * Days are Vietnam civil day keys (`YYYY-MM-DD`), months `YYYY-MM`, weekdays 1 = Monday … 7 = Sunday.
 * No browser-zone date fields are read, so results are the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  addDaysToDateKey,
  formatDateKeyInTimeZone,
  fromShopDateTimeLocalValue,
  getShopZoneParts,
  SHOP_TIMEZONE,
} from '@rentalshop/utils';
import type {
  AttendancePersonRow,
  AttendanceSettings,
  EffectiveShift,
  EffectiveShiftDay,
  ShiftColor,
  ShiftRule,
  TimesheetDay,
  TimesheetUser,
} from '@rentalshop/types';

export const ATTENDANCE_MODULE = 'attendance';

const pad2 = (n: number) => String(n).padStart(2, '0');

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

/** Active module keys of the signed-in merchant (`merchant.modules`, #907 rule 5). */
export function modulesOf(user: unknown): string[] {
  const merchant = (user as { merchant?: { modules?: unknown } } | null | undefined)?.merchant;
  const modules = merchant?.modules;
  return Array.isArray(modules) ? modules.filter((m): m is string => typeof m === 'string') : [];
}

export function hasAttendance(modules: string[] | null | undefined): boolean {
  return !!modules && modules.includes(ATTENDANCE_MODULE);
}

/** Web attendance screens: shop owner and outlet admin only (staff / kho use the app). */
export function canUseAttendanceWeb(role: string | null | undefined): boolean {
  const r = (role || '').trim().toUpperCase();
  return r === 'MERCHANT' || r === 'OUTLET_ADMIN';
}

export function isOwnerRole(role: string | null | undefined): boolean {
  return (role || '').trim().toUpperCase() === 'MERCHANT';
}

/** One row of Mã QR & vị trí; null settings (not loaded / failed) = unknown. */
export function locationRow(settings: AttendanceSettings | null | undefined): { qr: 'daily' | 'fixed' | 'none' | null; radiusM: number | null } {
  if (!settings) return { qr: null, radiusM: null };
  const qr = !settings.qr?.generated ? 'none' : settings.qrMode === 'FIXED' ? 'fixed' : 'daily';
  return { qr, radiusM: settings.radiusM ?? null };
}

/** Month lock buttons and record edits (#907 rules 29, 30). */
export function lockDisplay(locked: boolean, role: string | null | undefined) {
  const owner = isOwnerRole(role);
  return {
    showLock: owner && !locked,
    showUnlock: owner && locked,
    canEditRecords: !locked && canUseAttendanceWeb(role),
  };
}

/** Q-D: an outlet admin does not edit their own records. */
export function canEditPerson(role: string | null | undefined, callerId: number | null | undefined, personId: number): boolean {
  if (!canUseAttendanceWeb(role)) return false;
  if (isOwnerRole(role)) return true;
  return callerId == null || Number(callerId) !== Number(personId);
}

/**
 * #927 "Ai cần chấm công": the owner changes every row; an outlet admin every row of their outlet but the owner's
 * (the owner's choice counts for the whole shop).
 */
export function canEditMember(callerRole: string | null | undefined, memberRole: string | null | undefined): boolean {
  if (!canUseAttendanceWeb(callerRole)) return false;
  if (isOwnerRole(callerRole)) return true;
  return !isOwnerRole(memberRole);
}

// ---------------------------------------------------------------------------
// Days, weeks, months
// ---------------------------------------------------------------------------

export function todayKey(now: Date = new Date()): string {
  return formatDateKeyInTimeZone(now, SHOP_TIMEZONE);
}

export function monthOf(dayKey: string): string {
  return dayKey.slice(0, 7);
}

export function isMonthKey(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isDayKey(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** 1 = Monday … 7 = Sunday of a civil day key. */
export function weekdayOf(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export interface MonthDay {
  key: string;
  day: number;
  weekday: number;
  sunday: boolean;
}

export function monthDays(monthKey: string): MonthDay[] {
  return Array.from({ length: daysInMonth(monthKey) }, (_, i) => {
    const key = `${monthKey}-${pad2(i + 1)}`;
    const weekday = weekdayOf(key);
    return { key, day: i + 1, weekday, sunday: weekday === 7 };
  });
}

export function lastDayOfMonth(monthKey: string): string {
  return `${monthKey}-${pad2(daysInMonth(monthKey))}`;
}

export function weekStart(dayKey: string): string {
  return addDaysToDateKey(dayKey, 1 - weekdayOf(dayKey));
}

export function weekDays(startKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(startKey, i));
}

/** "T3 13/10" with the weekday labels of the locale (index 0 = Monday). */
export function shortDayLabel(dayKey: string, weekdayLabels: string[]): string {
  const [, m, d] = dayKey.split('-');
  return `${weekdayLabels[weekdayOf(dayKey) - 1]} ${d}/${m}`;
}

/** "13/10/26". */
export function shortDate(dayKey: string): string {
  const [y, m, d] = dayKey.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

/** "10/2026". */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `${Number(m)}/${y}`;
}

// ---------------------------------------------------------------------------
// Timesheet grid
// ---------------------------------------------------------------------------

export type CellKind = 'miss' | 'fake' | 'ot' | 'late' | 'ok' | 'absent' | 'we' | 'empty';

/**
 * Colour of a month-grid cell: missing out > suspected > overtime > late / early > on time.
 * No hours: "Vắng" when a shift was scheduled on a past day; a grey dot on an empty Sunday.
 */
export function cellKind(day: TimesheetDay | null | undefined, opts: { scheduled: boolean; past: boolean; sunday: boolean }): CellKind {
  const flags = day?.flags || {};
  if (flags.missingOut) return 'miss';
  const worked = !!day && (Number(day.hours) > 0 || Number(day.dayCredit) > 0);
  if (worked) {
    if (flags.suspected) return 'fake';
    if (flags.overtime) return 'ot';
    if (flags.late || flags.early) return 'late';
    return 'ok';
  }
  if (flags.suspected) return 'fake';
  if (opts.scheduled && opts.past) return 'absent';
  if (opts.sunday) return 'we';
  return 'empty';
}

/** Hours with one decimal and a comma, trailing ",0" dropped: 4 → "4", 8.5 → "8,5", 3.84 → "3,8". */
export function formatHours(hours: number | null | undefined): string {
  const n = Math.round((Number(hours) || 0) * 10) / 10;
  return String(n).replace('.', ',');
}

/** The API may send `days` keyed by day or as a list with `date`. */
export function normalizeDays(days: TimesheetUser['days'] | null | undefined): Record<string, TimesheetDay> {
  if (!days) return {};
  if (Array.isArray(days)) {
    const out: Record<string, TimesheetDay> = {};
    for (const d of days) if (d?.date) out[d.date] = d;
    return out;
  }
  return days;
}

export function personId(user: { userId?: number; id?: number }): number {
  return Number(user.userId ?? user.id);
}

export function personName(user: { name?: string; firstName?: string; lastName?: string } | null | undefined): string {
  if (!user) return '';
  const full = [user.lastName, user.firstName].filter(Boolean).join(' ').trim();
  return user.name || full || '';
}

/** Totals of a grid row when the API leaves them out. */
export function rowTotals(user: TimesheetUser): { hours: number; dayCredits: number } {
  if (user.totals) return user.totals;
  const days = Object.values(normalizeDays(user.days));
  return {
    hours: days.reduce((sum, d) => sum + (Number(d.hours) || 0), 0),
    dayCredits: days.reduce((sum, d) => sum + (Number(d.dayCredit) || 0), 0),
  };
}

/** `userId|date` → has at least one effective shift (for "Vắng"). */
export function scheduledSet(days: EffectiveShiftDay[] | null | undefined): Set<string> {
  const set = new Set<string>();
  for (const d of days || []) if (d.shifts && d.shifts.length > 0) set.add(`${d.userId}|${d.date}`);
  return set;
}

export function listOf<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  const inner = (data as Record<string, unknown> | null | undefined)?.[key];
  return Array.isArray(inner) ? (inner as T[]) : [];
}

// ---------------------------------------------------------------------------
// Shifts and rules
// ---------------------------------------------------------------------------

export const SHIFT_COLORS: ShiftColor[] = ['blue', 'purple', 'green', 'orange'];

/** Chip classes per template colour (mockup s1–s4). */
export function chipClass(color: string | null | undefined): string {
  switch (color) {
    case 'purple':
      return 'bg-[#F5F3FF] text-[#5B21B6]';
    case 'green':
      return 'bg-[#ECFDF5] text-[#047857]';
    case 'orange':
      return 'bg-[#FFF7ED] text-[#9A3412]';
    case 'gray':
      return 'bg-[#F1F5F9] text-[#475569]';
    default:
      return 'bg-[#EFF6FF] text-[#1E40AF]';
  }
}

/** "08:00" → "08", "17:30" stays: chip "Sáng 08–12", "Chiều 13–17:30". */
export function compactTime(time: string): string {
  return time.endsWith(':00') ? time.slice(0, -3) : time;
}

export function shiftRange(start: string, end: string, compact = false): string {
  return compact ? `${compactTime(start)}–${compactTime(end)}` : `${start}–${end}`;
}

/** A cross-midnight template: end at or before start (#907 rule 19). */
export function isOvernight(start: string, end: string): boolean {
  return end <= start;
}

/** "T2–T6" for runs of three or more, else "T2, T4, T6" (labels index 0 = Monday). */
export function weekdaysLabel(weekdays: number[], labels: string[], separator = ', '): string {
  const days = Array.from(new Set(weekdays)).filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < days.length) {
    let j = i;
    while (j + 1 < days.length && days[j + 1] === days[j] + 1) j++;
    if (j - i >= 2) parts.push(`${labels[days[i] - 1]}–${labels[days[j] - 1]}`);
    else for (let k = i; k <= j; k++) parts.push(labels[days[k] - 1]);
    i = j + 1;
  }
  return parts.join(separator);
}

/** Rules still running: no end, or an end today or later. */
export function isRuleCurrent(rule: Pick<ShiftRule, 'endDate'>, today: string): boolean {
  return !rule.endDate || rule.endDate >= today;
}

export interface RuleConflict {
  userId: number;
  templateId: number;
  weekdays: number[];
}

/** Chosen users who already have a current rule on one of the chosen weekdays (preview line 2). */
export function ruleConflicts(rules: ShiftRule[], userIds: number[], weekdays: number[], today: string): RuleConflict[] {
  const chosen = new Set(weekdays);
  const users = new Set(userIds.map(Number));
  return rules
    .filter((r) => users.has(Number(r.userId)) && isRuleCurrent(r, today) && r.weekdays.some((d) => chosen.has(d)))
    .map((r) => ({ userId: Number(r.userId), templateId: Number(r.templateId), weekdays: [...r.weekdays].sort((a, b) => a - b) }));
}

/** "↻ Lặp mỗi tuần · Lan, Hoa · Sáng 08:00–12:00 · T2–T6 · từ 12/10/26" parts, joined by the caller. */
export function recurringPreview(input: {
  names: string[];
  shift: string;
  weekdays: number[];
  startDate: string;
  endDate?: string | null;
  labels: string[];
}): { names: string; shift: string; days: string; from: string; to: string | null } {
  return {
    names: input.names.join(', '),
    shift: input.shift,
    days: weekdaysLabel(input.weekdays, input.labels),
    from: isDayKey(input.startDate) ? shortDate(input.startDate) : '',
    to: isDayKey(input.endDate || '') ? shortDate(input.endDate as string) : null,
  };
}

/**
 * A week-grid cell: locked shifts cannot change; empty past days cannot get one (#907 rule 22).
 * #918: `worked` = the person already has a record on that day (today) → locked, no "+".
 */
export function weekCellState(
  date: string,
  today: string,
  shifts: EffectiveShift[],
  worked = false,
): { past: boolean; locked: boolean; canAdd: boolean } {
  const past = date < today;
  const locked = past || worked || shifts.some((s) => s.locked);
  return { past, locked, canAdd: !past && !worked && shifts.length === 0 };
}

/** #918 Users with a timesheet cell on `day` (any record that day, an open one included). */
export function workedUserIds(users: TimesheetUser[] | null | undefined, day: string): Set<number> {
  const ids = new Set<number>();
  for (const u of users || []) if (normalizeDays(u.days)[day]) ids.add(personId(u));
  return ids;
}

/** #918 "Gán ca" starts tomorrow: today is often already worked (SHIFT_LOCKED). */
export function assignStartDefault(today: string): string {
  return addDaysToDateKey(today, 1);
}

/** #918 The outlet in the URL, else the shop's default outlet, else the first. */
export function defaultOutlet<T extends { id: number; isDefault?: boolean | null }>(outlets: T[], urlId: number | null | undefined): T | null {
  return outlets.find((o) => urlId != null && o.id === urlId) || outlets.find((o) => !!o.isDefault) || outlets[0] || null;
}

// ---------------------------------------------------------------------------
// Record times (VN wall clock ↔ ISO)
// ---------------------------------------------------------------------------

export function isTime(value: string | null | undefined): value is string {
  return !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** ISO instant of a VN wall-clock time on a civil day. */
export function wallTimeToIso(dayKey: string, time: string): string | null {
  if (!isDayKey(dayKey) || !isTime(time)) return null;
  const instant = fromShopDateTimeLocalValue(`${dayKey}T${time}`, SHOP_TIMEZONE);
  return instant ? instant.toISOString() : null;
}

/** In / out on a record day; an out time at or before the in time is on the next day (≤ 24 h, rule 29). */
export function recordTimesToIso(dayKey: string, inTime: string, outTime: string): { checkInAt: string; checkOutAt: string } | null {
  const checkInAt = wallTimeToIso(dayKey, inTime);
  const outDay = isTime(outTime) && isTime(inTime) && outTime <= inTime ? addDaysToDateKey(dayKey, 1) : dayKey;
  const checkOutAt = wallTimeToIso(outDay, outTime);
  return checkInAt && checkOutAt ? { checkInAt, checkOutAt } : null;
}

/** "08:05" or "08:05:12" in the shop zone. */
export function timeOf(iso: string | null | undefined, seconds = false): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = getShopZoneParts(date, SHOP_TIMEZONE);
  return seconds ? `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}` : `${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function dayOf(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatDateKeyInTimeZone(date, SHOP_TIMEZONE);
}

// ---------------------------------------------------------------------------
// Person month rows
// ---------------------------------------------------------------------------

export type RowFilter = 'all' | 'rejected' | 'suspected';

export function filterRows(rows: AttendancePersonRow[], filter: RowFilter): AttendancePersonRow[] {
  if (filter === 'rejected') return rows.filter((r) => r.result === 'REJECTED');
  if (filter === 'suspected') return rows.filter((r) => (r.suspectReasons || []).length > 0);
  return rows;
}

/**
 * Rows grouped by day in time order. A row of a record (its OUT, auto-close or edit) sits under the day of the
 * record's IN, so a cross-midnight OUT or a later edit stays with its shift; other rows use their own VN day.
 */
export function groupRowsByDay(rows: AttendancePersonRow[]): Array<{ day: string; rows: AttendancePersonRow[] }> {
  const recordDay = new Map<number, string>();
  for (const r of rows) {
    if (r.recordId != null && r.kind === 'IN' && r.result === 'ACCEPTED' && !recordDay.has(r.recordId)) recordDay.set(r.recordId, r.dateKey || dayOf(r.at));
  }
  const groups = new Map<string, AttendancePersonRow[]>();
  const sorted = [...rows].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  for (const r of sorted) {
    const day = r.dateKey || (r.recordId != null && recordDay.get(r.recordId)) || dayOf(r.at);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(r);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => ({ day, rows: list }));
}

export function shiftText(shift: AttendancePersonRow['shift']): string {
  if (!shift) return '';
  if (typeof shift === 'string') return shift;
  return `${shift.name} ${shiftRange(shift.start, shift.end, true)}`;
}

/**
 * The record a "Sửa" button edits: day and current in / out. #918: the latest edit's `after` is the record as it
 * is now (a manual record has only edit rows); else its IN / OUT scans.
 */
export function recordTimes(rows: AttendancePersonRow[], recordId: number): { day: string; checkIn: string; checkOut: string } {
  const all = rows.filter((r) => r.recordId === recordId && r.result !== 'REJECTED');
  const own = all.filter((r) => r.kind !== 'EDIT');
  const inRow = own.find((r) => r.kind === 'IN');
  const outRow = own.find((r) => r.kind === 'OUT' && r.result !== 'AUTO_CLOSED');
  const lastEdit = all
    .filter((r) => r.kind === 'EDIT' && r.after && r.after.checkInAt)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
  const day = all.find((r) => r.dateKey)?.dateKey || dayOf(inRow?.at) || dayOf(lastEdit?.after?.checkInAt) || dayOf(all[0]?.at);
  if (lastEdit?.after) return { day, checkIn: timeOf(lastEdit.after.checkInAt), checkOut: timeOf(lastEdit.after.checkOutAt) };
  return { day, checkIn: timeOf(inRow?.at), checkOut: timeOf(outRow?.at) };
}

/** #918 One "Sửa" per record: the record id on the first row of each record (in order), else null. */
export function editButtonRecords(rows: AttendancePersonRow[]): Array<number | null> {
  const seen = new Set<number>();
  return rows.map((r) => {
    if (r.recordId == null || r.result === 'REJECTED' || seen.has(r.recordId)) return null;
    seen.add(r.recordId);
    return r.recordId;
  });
}

/** #924 The instant is on the VN civil day right after `dayKey` (an overnight out: "(hôm sau)"). */
export function isNextDayOf(iso: string | null | undefined, dayKey: string): boolean {
  const day = dayOf(iso);
  return !!day && isDayKey(dayKey) && day === addDaysToDateKey(dayKey, 1);
}

export interface EditSummaryWords {
  checkIn: (time: string) => string;
  checkOut: (time: string) => string;
  nextDay: string;
}

/**
 * #924 Text of a "Đã sửa" row: `Lan · vào 08:05 → ra 17:20 · "lý do"` for an added record; for an edit each changed
 * time reads before → after (`vào 08:00 → 08:05`), an unchanged one once. An out time on the day after the record
 * day gets "(hôm sau)". No editor name → no name part. Not an EDIT row → ''.
 */
export function editSummaryText(row: AttendancePersonRow, words: EditSummaryWords): string {
  if (row.kind !== 'EDIT') return '';
  const after = row.after || {};
  const before = row.before || null;
  const day = row.dateKey || dayOf(after.checkInAt) || dayOf(row.at);
  const outTime = (iso: string | null | undefined) =>
    iso ? `${timeOf(iso)}${isNextDayOf(iso, day) ? ` ${words.nextDay}` : ''}` : '—';
  const parts: string[] = [];
  if (row.editorName) parts.push(row.editorName);
  const added = !before || (!before.checkInAt && !before.checkOutAt);
  if (added) {
    const times = [after.checkInAt ? words.checkIn(timeOf(after.checkInAt)) : '', after.checkOutAt ? words.checkOut(outTime(after.checkOutAt)) : '']
      .filter(Boolean)
      .join(' → ');
    if (times) parts.push(times);
  } else {
    const field = (b: string, a: string) => (b === a ? a : `${b} → ${a}`);
    if (after.checkInAt) parts.push(words.checkIn(field(before.checkInAt ? timeOf(before.checkInAt) : '—', timeOf(after.checkInAt))));
    if (after.checkOutAt) parts.push(words.checkOut(field(outTime(before.checkOutAt), outTime(after.checkOutAt))));
  }
  if (row.note) parts.push(`"${row.note}"`);
  return parts.join(' · ');
}
