import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { canSeeChangeHistory, canReadOrderHistory, loadChangeTimeline, type HistoryDb } from '../../../../../lib/change-history';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/orders/[orderId]/changes?limit&offset — readable change history (#519)
 *
 * Access: `orders.view`. The order must belong to the caller's merchant; OUTLET_ADMIN / OUTLET_STAFF
 * only for orders of their outlet; ADMIN / OPS any order. Otherwise 404 ORDER_NOT_FOUND.
 * Response: { entries: [{ id, at, kind, actor, changes, items, note? }], total, latestAt }, newest first.
 * `at` / `latestAt` are UTC ISO instants (the app groups by Vietnam civil day). No email, IP or user agent.
 * Reads AuditLog by the (entityType, entityId) index.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  const { orderId } = await Promise.resolve(params);

  return withPermissions(['orders.view'])(async (request, { user, userScope }) => {
    // #670: outlet staff do not see change history
    if (!canSeeChangeHistory(user.role)) {
      return NextResponse.json(ResponseBuilder.error('FORBIDDEN'), { status: API.STATUS.FORBIDDEN });
    }
    try {
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'), { status: 400 });
      }
      const { searchParams } = new URL(request.url);
      const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const id = parseInt(orderId, 10);
      const db = prisma as unknown as HistoryDb;

      const allowed = await canReadOrderHistory(db, id, {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId,
      });
      if (!allowed) {
        return NextResponse.json(ResponseBuilder.error('ORDER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const page = await loadChangeTimeline(db, {
        entityType: 'Order',
        entityId: id,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });
      return NextResponse.json(ResponseBuilder.success('AUDIT_LOG_RETRIEVED_SUCCESS', page));
    } catch (error) {
      console.error('Error fetching order changes:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
