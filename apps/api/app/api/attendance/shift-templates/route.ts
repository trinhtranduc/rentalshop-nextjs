import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet } from '../../../../lib/attendance/context';
import { attendanceOk, validationFailed } from '../../../../lib/attendance/http';
import { bodyOf, idSchema, queryIdSchema, queryOf } from '../../../../lib/attendance/schemas';
import { templateBodySchema, templateView } from '../../../../lib/attendance/templates';

/**
 * GET /api/attendance/shift-templates?outletId= — #907 rule 19. MERCHANT, OUTLET_ADMIN (own outlet).
 * `used` = referenced by a rule, a day change or a record. Indexed: ShiftTemplate.outletId.
 */
export const GET = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = z.object({ outletId: queryIdSchema }).safeParse(queryOf(request.url));
  if (!parsed.success) return validationFailed(parsed.error);
  const outlet = await resolveOutlet(user, parsed.data.outletId);
  const templates = await db.attendance.listTemplates(user.merchantId, outlet.id);
  const used = await db.attendance.usedTemplateIds(templates.map((t: { id: number }) => t.id));
  return attendanceOk(
    'SHIFT_TEMPLATES_SUCCESS',
    templates.map((t) => templateView(t, used.has(t.id)))
  );
});

/**
 * POST /api/attendance/shift-templates — #907 rule 19. endTime <= startTime = crosses midnight
 * (counted on the start day).
 */
export const POST = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = templateBodySchema.extend({ outletId: idSchema }).safeParse(await bodyOf(request));
  if (!parsed.success) return validationFailed(parsed.error);
  const outlet = await resolveOutlet(user, parsed.data.outletId);
  const created = await db.attendance.createTemplate({ ...parsed.data, merchantId: user.merchantId, outletId: outlet.id });
  return attendanceOk('SHIFT_TEMPLATE_CREATED', templateView(created, false));
});
