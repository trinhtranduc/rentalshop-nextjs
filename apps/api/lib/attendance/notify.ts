/**
 * #907 SHIFT_CHANGED: after a schedule change, each user whose coming days changed gets one inbox row and
 * one push. Old apps (release-2026-10-12.2) list it with a neutral icon and open nothing on tap, provided
 * every `data` value is a string (old iOS decodes `data.*` as String?) and title / body are non-empty.
 * Fail-open: a notification failure never fails the schedule change.
 */
import { createNotificationsForUsers } from '@rentalshop/database';
import { addDaysToDateKey } from '../../../../packages/utils/src/core/date-range';
import { sendPushToUsers } from '../push-notifications';
import { weekdayOfDateKey, type EffectiveShift } from './rules';
import { diffSchedules, effectiveSchedule, type ScheduleDayChange, type ScheduleRule, type ScheduleTemplate } from './schedule';

export const SHIFT_CHANGED = 'SHIFT_CHANGED';
export const SHIFT_CHANGED_TITLE = 'Lịch ca thay đổi';
/** How far ahead a change is announced */
export const SHIFT_NOTICE_DAYS = 14;

export interface ScheduleData {
  rules: ScheduleRule[];
  dayChanges: ScheduleDayChange[];
  templates: ScheduleTemplate[];
}

function dayLabel(dateKey: string): string {
  const wd = weekdayOfDateKey(dateKey);
  const [, m, d] = dateKey.split('-');
  return `${wd === 7 ? 'CN' : `T${wd + 1}`} ${d}/${m}`;
}

function shiftsLabel(shifts: EffectiveShift[]): string {
  if (shifts.length === 0) return 'Nghỉ';
  return shifts.map((s) => `${s.name} ${s.start}–${s.end}`).join(', ');
}

/** The window [today, today + 13] the notification compares. */
export function noticeWindow(today: string): { from: string; to: string } {
  return { from: today, to: addDaysToDateKey(today, SHIFT_NOTICE_DAYS - 1) };
}

export async function notifyShiftChanges(input: {
  outletId: number;
  userIds: number[];
  today: string;
  before: ScheduleData;
  after: ScheduleData;
  /** `${userId}:${dateKey}` of locked (worked) days, never announced */
  worked?: Set<string>;
}): Promise<number> {
  try {
    const { from, to } = noticeWindow(input.today);
    const sched = (d: ScheduleData) =>
      effectiveSchedule({ userIds: input.userIds, from, to, rules: d.rules, dayChanges: d.dayChanges, templates: d.templates });
    const diffs = diffSchedules(sched(input.before), sched(input.after)).filter(
      (d) => !input.worked?.has(`${d.userId}:${d.date}`)
    );
    const byUser = new Map<number, typeof diffs>();
    for (const d of diffs) byUser.set(d.userId, [...(byUser.get(d.userId) ?? []), d]);

    let sent = 0;
    for (const [userId, changes] of byUser) {
      const first = changes[0];
      const more = changes.length > 1 ? ` (+${changes.length - 1} ngày khác)` : '';
      const body = `${dayLabel(first.date)}: ${shiftsLabel(first.before)} → ${shiftsLabel(first.after)}${more}`;
      const data = { type: SHIFT_CHANGED, outletId: String(input.outletId), dates: changes.map((c) => c.date).join(',') };
      await createNotificationsForUsers([userId], { type: SHIFT_CHANGED, title: SHIFT_CHANGED_TITLE, body, data });
      await sendPushToUsers([userId], { title: SHIFT_CHANGED_TITLE, body, data });
      sent += 1;
    }
    return sent;
  } catch (error) {
    console.error('❌ notifyShiftChanges failed:', error);
    return 0;
  }
}
