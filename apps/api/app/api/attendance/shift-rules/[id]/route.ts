import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet, type AttendanceUser } from '../../../../../lib/attendance/context';
import { AttendanceHttpError, attendanceError, attendanceOk, validationFailed } from '../../../../../lib/attendance/http';
import {
  addDaysToDateKey,
  assertDayOpen,
  assertNoRuleOverlap,
  pickableTemplate,
  todayAndWorked,
  withScheduleNotice,
} from '../../../../../lib/attendance/schedule-ops';
import { bodyOf, dateKeySchema, idSchema, paramId, weekdaysSchema } from '../../../../../lib/attendance/schemas';
import { ruleView } from '../../../../../lib/attendance/templates';

type Params = { params: Promise<{ id: string }> | { id: string } };

async function loadRule(user: AttendanceUser, params: Params['params']) {
  const id = paramId((await Promise.resolve(params)).id);
  const rule = id ? await db.attendance.getRule(id, user.merchantId) : null;
  if (!rule) throw new AttendanceHttpError('NOT_FOUND', 404);
  await resolveOutlet(user, rule.outletId);
  return rule;
}

const putSchema = z.object({
  templateId: idSchema.optional(),
  weekdays: weekdaysSchema.optional(),
  effectiveFrom: dateKeySchema,
});

/**
 * PUT /api/attendance/shift-rules/[id] — #907 rule 20. Ends the old rule the day before `effectiveFrom`
 * and starts a new rule from it (history kept). effectiveFrom ≥ today (VN) else 409 SHIFT_LOCKED.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (req, { user }) => {
    const rule = await loadRule(user, params);
    const parsed = putSchema.safeParse(await bodyOf(req));
    if (!parsed.success) return validationFailed(parsed.error);
    const body = parsed.data;
    if (rule.endDate && body.effectiveFrom > rule.endDate) return attendanceError('INVALID_PAYLOAD', 400);

    const { today, worked } = await todayAndWorked([rule.userId]);
    assertDayOpen(body.effectiveFrom, today, [rule.userId], worked);
    const template = await pickableTemplate(user.merchantId, rule.outletId, body.templateId ?? rule.templateId);
    const next = {
      merchantId: user.merchantId,
      outletId: rule.outletId,
      userId: rule.userId,
      templateId: template.id,
      weekdays: body.weekdays ?? rule.weekdays,
      startDate: body.effectiveFrom,
      endDate: rule.endDate ?? null,
      createdById: user.id,
    };
    await assertNoRuleOverlap(user.merchantId, [{ ...next, id: -1 }], rule.id);

    const result = await withScheduleNotice(
      { merchantId: user.merchantId, outletId: rule.outletId, userIds: [rule.userId] },
      today,
      worked,
      () => db.attendance.replaceRule(rule.id, addDaysToDateKey(body.effectiveFrom, -1), next)
    );
    return attendanceOk('SHIFT_RULE_UPDATED', {
      old: result.old ? ruleView(result.old) : null,
      created: ruleView(result.created),
    });
  })(request);
}

/**
 * DELETE /api/attendance/shift-rules/[id] — #907 rule 20. A running rule ends yesterday (today when today is
 * already worked); a rule that has not started yet is removed.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  return attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (_req, { user }) => {
    const rule = await loadRule(user, params);
    const { today, worked } = await todayAndWorked([rule.userId]);
    const workedToday = worked.has(`${rule.userId}:${today}`);
    const scope = { merchantId: user.merchantId, outletId: rule.outletId, userIds: [rule.userId] };

    if (rule.startDate > today || (rule.startDate === today && !workedToday)) {
      await withScheduleNotice(scope, today, worked, () => db.attendance.deleteRule(rule.id));
      return attendanceOk('SHIFT_RULE_DELETED', { id: rule.id, deleted: true, endDate: null });
    }
    const endDate = workedToday ? today : addDaysToDateKey(today, -1);
    if (rule.endDate && rule.endDate <= endDate) {
      return attendanceOk('SHIFT_RULE_DELETED', { id: rule.id, deleted: false, endDate: rule.endDate });
    }
    await withScheduleNotice(scope, today, worked, () => db.attendance.updateRule(rule.id, { endDate }));
    return attendanceOk('SHIFT_RULE_DELETED', { id: rule.id, deleted: false, endDate });
  })(request);
}
