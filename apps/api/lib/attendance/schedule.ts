/**
 * #907 Effective weekly schedule: rules ("gán một lần, lặp hằng tuần") + one-day changes.
 * Effective shifts of a user on a day = the one-day change if any, else every rule active that day whose
 * weekdays include it. Pure functions; day keys are VN civil days.
 */
import { addDaysToDateKey } from '../../../../packages/utils/src/core/date-range';
import { crossesMidnight, hhmmToMinutes, weekdayOfDateKey, type EffectiveShift } from './rules';

export type { EffectiveShift } from './rules';

export interface ScheduleTemplate {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  color: string;
}

export interface ScheduleRule {
  id: number;
  userId: number;
  templateId: number;
  weekdays: number[];
  startDate: string;
  endDate: string | null;
}

export interface ScheduleDayChange {
  userId: number;
  dateKey: string;
  off: boolean;
  templateId: number | null;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number | null;
}

export interface ScheduleRow {
  userId: number;
  date: string;
  shifts: EffectiveShift[];
}

export const CUSTOM_SHIFT_NAME = 'Giờ riêng';

type Templates = ScheduleTemplate[] | Map<number, ScheduleTemplate>;

function templateMap(templates: Templates): Map<number, ScheduleTemplate> {
  return templates instanceof Map ? templates : new Map(templates.map((t) => [t.id, t]));
}

function fromTemplate(t: ScheduleTemplate, source: 'RULE' | 'DAY'): EffectiveShift {
  return { templateId: t.id, name: t.name, start: t.startTime, end: t.endTime, breakMinutes: t.breakMinutes, color: t.color, source };
}

export function ruleCoversDay(rule: ScheduleRule, dateKey: string): boolean {
  return (
    rule.startDate <= dateKey &&
    (rule.endDate == null || rule.endDate >= dateKey) &&
    rule.weekdays.includes(weekdayOfDateKey(dateKey))
  );
}

export function effectiveShiftsForDay(
  userId: number,
  dateKey: string,
  rules: ScheduleRule[],
  dayChanges: ScheduleDayChange[],
  templates: Templates
): EffectiveShift[] {
  const byId = templateMap(templates);
  const change = dayChanges.find((c) => c.userId === userId && c.dateKey === dateKey);
  if (change) {
    if (change.off) return [];
    if (change.templateId != null) {
      const t = byId.get(change.templateId);
      return t ? [fromTemplate(t, 'DAY')] : [];
    }
    if (change.startTime && change.endTime) {
      return [
        {
          templateId: null,
          name: CUSTOM_SHIFT_NAME,
          start: change.startTime,
          end: change.endTime,
          breakMinutes: change.breakMinutes ?? 0,
          color: 'gray',
          source: 'DAY',
        },
      ];
    }
    return [];
  }
  return rules
    .filter((r) => r.userId === userId && ruleCoversDay(r, dateKey))
    .map((r) => byId.get(r.templateId))
    .filter((t): t is ScheduleTemplate => !!t)
    .map((t) => fromTemplate(t, 'RULE'))
    .sort((a, b) => hhmmToMinutes(a.start) - hhmmToMinutes(b.start));
}

export function listDateKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  for (let k = from; k <= to; k = addDaysToDateKey(k, 1)) keys.push(k);
  return keys;
}

/** Every user × day that has at least one shift, ordered by user then day. */
export function effectiveSchedule(input: {
  userIds: number[];
  from: string;
  to: string;
  rules: ScheduleRule[];
  dayChanges: ScheduleDayChange[];
  templates: Templates;
}): ScheduleRow[] {
  const byId = templateMap(input.templates);
  const days = listDateKeys(input.from, input.to);
  const rows: ScheduleRow[] = [];
  for (const userId of input.userIds) {
    for (const date of days) {
      const shifts = effectiveShiftsForDay(userId, date, input.rules, input.dayChanges, byId);
      if (shifts.length > 0) rows.push({ userId, date, shifts });
    }
  }
  return rows;
}

/** A day is locked when it is before today (VN) or the user already has a record on it. */
export function isDayLocked(userId: number, dateKey: string, todayKey: string, worked: Set<string>): boolean {
  return dateKey < todayKey || worked.has(`${userId}:${dateKey}`);
}

function minutesRange(start: string, end: string): [number, number] {
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end) + (crossesMidnight(start, end) ? 1440 : 0);
  return [s, e];
}

/** Two rules of the same user overlap: a shared weekday, overlapping date ranges and overlapping times. */
export function rulesOverlap(a: ScheduleRule, b: ScheduleRule, templates: Templates): boolean {
  if (a.userId !== b.userId || a.id === b.id) return false;
  if (!a.weekdays.some((d) => b.weekdays.includes(d))) return false;
  const aEnd = a.endDate ?? '9999-12-31';
  const bEnd = b.endDate ?? '9999-12-31';
  if (a.startDate > bEnd || b.startDate > aEnd) return false;
  const byId = templateMap(templates);
  const ta = byId.get(a.templateId);
  const tb = byId.get(b.templateId);
  if (!ta || !tb) return false;
  const [s1, e1] = minutesRange(ta.startTime, ta.endTime);
  const [s2, e2] = minutesRange(tb.startTime, tb.endTime);
  return s1 < e2 && s2 < e1;
}

function signature(shifts: EffectiveShift[]): string {
  return shifts.map((s) => `${s.templateId ?? '-'}|${s.name}|${s.start}|${s.end}|${s.breakMinutes}`).join(';');
}

/** Days whose shifts differ between two schedules (by user, then day). */
export function diffSchedules(
  before: ScheduleRow[],
  after: ScheduleRow[]
): Array<{ userId: number; date: string; before: EffectiveShift[]; after: EffectiveShift[] }> {
  const map = new Map<string, { userId: number; date: string; before: EffectiveShift[]; after: EffectiveShift[] }>();
  for (const r of before) map.set(`${r.userId}:${r.date}`, { userId: r.userId, date: r.date, before: r.shifts, after: [] });
  for (const r of after) {
    const key = `${r.userId}:${r.date}`;
    const entry = map.get(key) ?? { userId: r.userId, date: r.date, before: [], after: [] };
    entry.after = r.shifts;
    map.set(key, entry);
  }
  return [...map.values()]
    .filter((e) => signature(e.before) !== signature(e.after))
    .sort((x, y) => x.userId - y.userId || x.date.localeCompare(y.date));
}
