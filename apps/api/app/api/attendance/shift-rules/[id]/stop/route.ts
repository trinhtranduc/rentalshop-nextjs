import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet } from '../../../../../../lib/attendance/context';
import { AttendanceHttpError, attendanceOk, validationFailed } from '../../../../../../lib/attendance/http';
import { assertDayOpen, todayAndWorked, withScheduleNotice } from '../../../../../../lib/attendance/schedule-ops';
import { bodyOf, dateKeySchema, paramId } from '../../../../../../lib/attendance/schemas';
import { ruleView } from '../../../../../../lib/attendance/templates';

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/attendance/shift-rules/[id]/stop { lastDate } — #907 rule 20. The rule runs until lastDate
 * (inclusive). lastDate ≥ today (VN) else 409 SHIFT_LOCKED. Before its start = the rule is removed.
 */
export async function POST(request: NextRequest, { params }: Params) {
  return attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (req, { user }) => {
    const id = paramId((await Promise.resolve(params)).id);
    const rule = id ? await db.attendance.getRule(id, user.merchantId) : null;
    if (!rule) throw new AttendanceHttpError('NOT_FOUND', 404);
    await resolveOutlet(user, rule.outletId);
    const parsed = z.object({ lastDate: dateKeySchema }).safeParse(await bodyOf(req));
    if (!parsed.success) return validationFailed(parsed.error);
    const { lastDate } = parsed.data;

    const { today, worked } = await todayAndWorked([rule.userId]);
    // lastDate = today keeps today; only days after it change, so a worked today does not lock it
    assertDayOpen(lastDate, today, [], worked);
    const scope = { merchantId: user.merchantId, outletId: rule.outletId, userIds: [rule.userId] };
    if (lastDate < rule.startDate) {
      await withScheduleNotice(scope, today, worked, () => db.attendance.deleteRule(rule.id));
      return attendanceOk('SHIFT_RULE_STOPPED', { ...ruleView(rule), deleted: true });
    }
    const updated = await withScheduleNotice(scope, today, worked, () => db.attendance.updateRule(rule.id, { endDate: lastDate }));
    return attendanceOk('SHIFT_RULE_STOPPED', { ...ruleView(updated), deleted: false });
  })(request);
}
