/**
 * #907 Schedule changes plumbing shared by the rule, day-change and template routes:
 * lock checks (rule 22) and the before / after snapshot for the SHIFT_CHANGED notification (rule 24).
 */
import { db } from '@rentalshop/database';
import { AttendanceHttpError } from './http';
import { notifyShiftChanges, noticeWindow, type ScheduleData } from './notify';
import { addDaysToDateKey, vnToday } from './rules';
import { rulesOverlap, type ScheduleTemplate } from './schedule';

export interface ScheduleChangeScope {
  merchantId: number;
  outletId: number;
  userIds: number[];
}

/** Today (VN) and the days already worked today (`${userId}:${dateKey}`). */
export async function todayAndWorked(userIds: number[], now: Date = new Date()) {
  const today = vnToday(now);
  const worked = new Set<string>(await db.attendance.workedDays(userIds, today, today));
  return { today, worked };
}

/** 409 SHIFT_LOCKED when `date` is before today, or is today and one of the users already worked today. */
export function assertDayOpen(date: string, today: string, userIds: number[], worked: Set<string>) {
  if (date < today || (date === today && userIds.some((id) => worked.has(`${id}:${today}`)))) {
    throw new AttendanceHttpError('SHIFT_LOCKED', 409);
  }
}

async function snapshot(scope: ScheduleChangeScope, today: string): Promise<ScheduleData> {
  const { from, to } = noticeWindow(today);
  return db.attendance.getScheduleData({ merchantId: scope.merchantId, userIds: scope.userIds, from, to });
}

/**
 * Run a schedule mutation and notify every user whose coming days changed.
 * Notification is best effort and never fails the request.
 */
export async function withScheduleNotice<T>(
  scope: ScheduleChangeScope,
  today: string,
  worked: Set<string>,
  mutate: () => Promise<T>
): Promise<T> {
  const before = await snapshot(scope, today);
  const result = await mutate();
  const after = await snapshot(scope, today);
  await notifyShiftChanges({ outletId: scope.outletId, userIds: scope.userIds, today, before, after, worked });
  return result;
}

export { addDaysToDateKey };

/** 409 SHIFT_OVERLAP when a new rule shares a weekday, dates and hours with another rule of the same user. */
export async function assertNoRuleOverlap(
  merchantId: number,
  candidates: Array<{ id: number; userId: number; templateId: number; weekdays: number[]; startDate: string; endDate: string | null }>,
  ignoreRuleId?: number
) {
  const userIds = [...new Set(candidates.map((c) => c.userId))];
  const existing = (await db.attendance.listRules({ merchantId, userIds })).filter((r) => r.id !== ignoreRuleId);
  const ids = [...new Set<number>([...existing.map((r) => r.templateId), ...candidates.map((c) => c.templateId)])];
  const templates = new Map<number, ScheduleTemplate>();
  for (const id of ids) {
    const t = await db.attendance.getTemplate(id, merchantId);
    if (t) templates.set(id, t);
  }
  for (const c of candidates) {
    if (existing.some((r) => rulesOverlap(c, r, templates))) {
      throw new AttendanceHttpError('SHIFT_OVERLAP', 409);
    }
  }
}

/** The template if it belongs to the outlet and can be picked (active). */
export async function pickableTemplate(merchantId: number, outletId: number, templateId: number) {
  const template = await db.attendance.getTemplate(templateId, merchantId);
  if (!template || template.outletId !== outletId) throw new AttendanceHttpError('NOT_FOUND', 404);
  if (!template.isActive) throw new AttendanceHttpError('INVALID_PAYLOAD', 400);
  return template;
}
