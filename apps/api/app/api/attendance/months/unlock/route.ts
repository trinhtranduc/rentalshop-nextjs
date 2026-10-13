import { monthLockRoute } from '../../../../../lib/attendance/month-lock';

/** POST /api/attendance/months/unlock { outletId, month } — #907 rule 30. MERCHANT only; AuditLog. */
export const POST = monthLockRoute(false);
