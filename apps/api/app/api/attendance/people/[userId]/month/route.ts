import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import {
  ATTENDANCE_ROLES,
  attendanceRoute,
  requireSelfOrManager,
  resolveOutlet,
  resolveOutletUser,
} from '../../../../../../lib/attendance/context';
import { AttendanceHttpError, attendanceOk, validationFailed } from '../../../../../../lib/attendance/http';
import { getUtcRangeForDateKeys, monthRange } from '../../../../../../lib/attendance/rules';
import { monthSchema, paramId, queryIdSchema, queryOf } from '../../../../../../lib/attendance/schemas';
import { daysOfUser, fullName, recordStats, round2 } from '../../../../../../lib/attendance/timesheet';
import { shiftOfRecord, type RecordRow } from '../../../../../../lib/attendance/views';

type Params = { params: Promise<{ userId: string }> | { userId: string } };

/**
 * GET /api/attendance/people/[userId]/month?outletId&month — #907 rule 28. Managers for their scope; staff for
 * themselves only ("Ca và công của tôi"). Summary and every row in time order: scans (rejected ones and
 * coordinates included), auto-closes and edits. Indexed: AttendanceScan(userId, at).
 */
export async function GET(request: NextRequest, { params }: Params) {
  return attendanceRoute(ATTENDANCE_ROLES, async (req, { user }) => {
    const userId = paramId((await Promise.resolve(params)).userId);
    if (!userId) throw new AttendanceHttpError('USER_NOT_FOUND', 404);
    const parsed = z.object({ outletId: queryIdSchema, month: monthSchema }).safeParse(queryOf(req.url));
    if (!parsed.success) return validationFailed(parsed.error);
    requireSelfOrManager(user, userId);
    const outlet = await resolveOutlet(user, parsed.data.outletId);
    const target = await resolveOutletUser(user, userId, outlet.id);

    const now = new Date();
    await db.attendance.autoCloseOverdue({ userId }, now);
    const { from, to } = monthRange(parsed.data.month);
    const { start, end } = getUtcRangeForDateKeys({ from, to });
    const [records, scans] = await Promise.all([
      db.attendance.listRecords({ outletId: outlet.id, from, to, userId }),
      db.attendance.listScans({ userId, outletId: outlet.id, start, end }),
    ]);
    const edits = await db.attendance.listEdits(records.map((r: RecordRow) => r.id));
    const byId = new Map<number, RecordRow>(records.map((r: RecordRow) => [r.id, r]));

    const rows: Array<Record<string, unknown> & { at: Date }> = [];
    for (const s of scans) {
      const accepted = s.result === 'ACCEPTED';
      const kind = s.action === 'OUT' ? 'OUT' : 'IN';
      const rec = accepted && s.recordId ? byId.get(s.recordId) : undefined;
      const stats = rec ? recordStats(rec) : null;
      rows.push({
        at: s.at,
        kind,
        result: accepted ? 'ACCEPTED' : 'REJECTED',
        ...(accepted ? {} : { errorCode: s.result }),
        distanceM: s.distanceM ?? null,
        accuracyM: s.accuracy,
        latitude: s.latitude,
        longitude: s.longitude,
        recordId: s.recordId ?? null,
        ...(rec
          ? {
              shift: shiftOfRecord(rec),
              suspectReasons: rec.suspectReasons ?? [],
              ...(kind === 'IN'
                ? { lateMinutes: stats!.lateMinutes }
                : { earlyMinutes: stats!.earlyMinutes, overtimeMinutes: stats!.overtimeMinutes }),
            }
          : {}),
      });
    }
    for (const r of records as RecordRow[]) {
      if (r.autoClosedAt) {
        rows.push({ at: r.autoClosedAt, kind: 'OUT', result: 'AUTO_CLOSED', recordId: r.id, shift: shiftOfRecord(r) });
      }
    }
    for (const e of edits) {
      rows.push({ at: e.createdAt, kind: 'EDIT', result: 'EDITED', note: e.reason, recordId: e.recordId, before: e.before, after: e.after });
    }
    rows.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const days = daysOfUser(records);
    const stats = (records as RecordRow[]).map(recordStats);
    return attendanceOk('ATTENDANCE_PERSON_MONTH_SUCCESS', {
      user: { id: target.id, name: fullName(target) },
      outletId: outlet.id,
      month: parsed.data.month,
      summary: {
        days: Object.values(days).reduce((n, c) => n + c.dayCredit, 0),
        hours: round2(stats.reduce((n, s) => n + s.hours, 0)),
        lateCount: stats.filter((s) => s.lateMinutes > 0).length,
        earlyCount: stats.filter((s) => s.earlyMinutes > 0).length,
        overtimeCount: stats.filter((s) => s.overtimeMinutes > 0).length,
        missingOut: (records as RecordRow[]).filter((r) => r.status === 'MISSING_OUT').length,
        suspected: (records as RecordRow[]).filter((r) => r.suspectedFake).length,
      },
      rows,
    });
  })(request);
}
