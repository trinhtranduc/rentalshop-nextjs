/** #907 Monthly timesheet maths (rules 26-27), shared by the timesheet, person month and export routes. */
import { db } from '@rentalshop/database';
import { monthRange, recordHours, shiftDeltas } from './rules';
import type { RecordRow } from './views';

export interface DayCell {
  hours: number;
  dayCredit: number;
  flags: { late: boolean; early: boolean; overtime: boolean; missingOut: boolean; suspected: boolean };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function recordStats(r: RecordRow) {
  const deltas = shiftDeltas({ dateKey: r.dateKey, shiftStart: r.shiftStart ?? null, shiftEnd: r.shiftEnd ?? null }, r.checkInAt, r.checkOutAt);
  return { ...deltas, hours: r.status === 'DONE' ? recordHours(r.checkInAt, r.checkOutAt, r.shiftBreak) : 0 };
}

/** Per day of one user: hours (DONE pairs minus break), dayCredit 1 when a DONE pair exists, flags. */
export function daysOfUser(records: RecordRow[]): Record<string, DayCell> {
  const days: Record<string, DayCell> = {};
  for (const r of records) {
    const s = recordStats(r);
    const cell =
      days[r.dateKey] ??
      (days[r.dateKey] = {
        hours: 0,
        dayCredit: 0,
        flags: { late: false, early: false, overtime: false, missingOut: false, suspected: false },
      });
    cell.hours = round2(cell.hours + s.hours);
    if (r.status === 'DONE') cell.dayCredit = 1;
    if (s.lateMinutes > 0) cell.flags.late = true;
    if (s.earlyMinutes > 0) cell.flags.early = true;
    if (s.overtimeMinutes > 0) cell.flags.overtime = true;
    if (r.status === 'MISSING_OUT') cell.flags.missingOut = true;
    if (r.suspectedFake) cell.flags.suspected = true;
  }
  return days;
}

export function totalsOf(days: Record<string, DayCell>) {
  const cells = Object.values(days);
  return {
    hours: round2(cells.reduce((sum, c) => sum + c.hours, 0)),
    dayCredits: cells.reduce((sum, c) => sum + c.dayCredit, 0),
  };
}

export function summaryOf(records: RecordRow[]) {
  return {
    totalHours: round2(records.reduce((sum, r) => sum + recordStats(r).hours, 0)),
    pairs: records.filter((r) => r.status === 'DONE').length,
    missingOut: records.filter((r) => r.status === 'MISSING_OUT').length,
    suspected: records.filter((r) => r.suspectedFake).length,
  };
}

export function fullName(u: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
}

/** Users of the timesheet: active users of the outlet plus anyone with records there that month. */
export async function loadTimesheet(outletId: number, month: string, now: Date = new Date()) {
  const { from, to } = monthRange(month);
  await db.attendance.autoCloseOverdue({ outletId }, now);
  const [records, outletUsers, locked] = await Promise.all([
    db.attendance.listRecords({ outletId, from, to }),
    db.attendance.listOutletUsers(outletId),
    db.attendance.isMonthLocked(outletId, month),
  ]);
  const known = new Set<number>(outletUsers.map((u: { id: number }) => u.id));
  const missing = [...new Set<number>(records.map((r: RecordRow) => r.userId))].filter((id) => !known.has(id));
  const extra = missing.length > 0 ? await db.attendance.findUsersByIds(missing) : [];
  const users = [...outletUsers, ...extra] as Array<{ id: number; firstName?: string | null; lastName?: string | null; role?: string }>;
  const rows = users.map((u) => {
    const days = daysOfUser(records.filter((r: RecordRow) => r.userId === u.id));
    return { userId: u.id, name: fullName(u), role: u.role ?? null, days, totals: totalsOf(days) };
  });
  return { outletId, month, from, to, locked: !!locked, users: rows, summary: summaryOf(records), records: records as RecordRow[] };
}
