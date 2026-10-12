import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet, type AttendanceUser } from '../../../../../lib/attendance/context';
import { AttendanceHttpError, attendanceError, attendanceOk, validationFailed } from '../../../../../lib/attendance/http';
import { todayAndWorked, withScheduleNotice } from '../../../../../lib/attendance/schedule-ops';
import { bodyOf, paramId } from '../../../../../lib/attendance/schemas';
import { templateBodySchema, templateView } from '../../../../../lib/attendance/templates';

type Params = { params: Promise<{ id: string }> | { id: string } };

async function loadTemplate(user: AttendanceUser, params: Params['params']) {
  const id = paramId((await Promise.resolve(params)).id);
  const template = id ? await db.attendance.getTemplate(id, user.merchantId) : null;
  if (!template) throw new AttendanceHttpError('NOT_FOUND', 404);
  await resolveOutlet(user, template.outletId);
  return template;
}

/**
 * PUT /api/attendance/shift-templates/[id] — #907 rule 19. Edits apply to days not yet worked (records keep
 * their snapshot). Users whose coming days change get SHIFT_CHANGED.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (req, { user }) => {
    const template = await loadTemplate(user, params);
    const parsed = templateBodySchema.safeParse(await bodyOf(req));
    if (!parsed.success) return validationFailed(parsed.error);
    const rules = await db.attendance.listRules({ merchantId: user.merchantId, outletId: template.outletId });
    const userIds = [...new Set<number>(rules.filter((r) => r.templateId === template.id).map((r) => r.userId))];
    const { today, worked } = await todayAndWorked(userIds);
    const updated = await withScheduleNotice(
      { merchantId: user.merchantId, outletId: template.outletId, userIds },
      today,
      worked,
      () => db.attendance.updateTemplate(template.id, parsed.data)
    );
    return attendanceOk('SHIFT_TEMPLATE_UPDATED', templateView(updated, !!(await db.attendance.isTemplateUsed(template.id))));
  })(request);
}

/** PATCH /api/attendance/shift-templates/[id] { isActive } — hide (cannot be picked; rules keep running) or show. */
export async function PATCH(request: NextRequest, { params }: Params) {
  return attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (req, { user }) => {
    const template = await loadTemplate(user, params);
    const parsed = z.object({ isActive: z.boolean() }).safeParse(await bodyOf(req));
    if (!parsed.success) return validationFailed(parsed.error);
    const updated = await db.attendance.updateTemplate(template.id, { isActive: parsed.data.isActive });
    return attendanceOk('SHIFT_TEMPLATE_UPDATED', templateView(updated, !!(await db.attendance.isTemplateUsed(template.id))));
  })(request);
}

/** DELETE /api/attendance/shift-templates/[id] — only when never used, else 409 SHIFT_TEMPLATE_IN_USE. */
export async function DELETE(request: NextRequest, { params }: Params) {
  return attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (_req, { user }) => {
    const template = await loadTemplate(user, params);
    if (await db.attendance.isTemplateUsed(template.id)) return attendanceError('SHIFT_TEMPLATE_IN_USE', 409);
    await db.attendance.deleteTemplate(template.id);
    return attendanceOk('SHIFT_TEMPLATE_DELETED', { id: template.id });
  })(request);
}
