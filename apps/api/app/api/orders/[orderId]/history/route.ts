import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { getAuditLogger, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { canReadOrderHistory, type HistoryDb } from '../../../../../lib/change-history';

/**
 * GET /api/orders/[orderId]/history - Get change history for an order (raw audit rows)
 *
 * Access (#519): the order must belong to the caller's merchant; OUTLET_ADMIN / OUTLET_STAFF only for
 * orders of their outlet; ADMIN / OPS any order. Otherwise 404 ORDER_NOT_FOUND. Response shape unchanged.
 * Reads AuditLog by the (entityType, entityId) index.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;

  return withPermissions(['orders.view'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'), { status: 400 });
      }
      const id = parseInt(orderId);
      const allowed = await canReadOrderHistory(prisma as unknown as HistoryDb, id, {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId,
      });
      if (!allowed) {
        return NextResponse.json(ResponseBuilder.error('ORDER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 100);
      const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0);

      const auditLogger = getAuditLogger(prisma);
      const result = await auditLogger.getAuditLogs({
        entityType: 'Order',
        entityId: String(id),
        limit,
        offset
      });

      return NextResponse.json({
        success: true,
        data: result.logs,
        pagination: { total: result.total, limit, offset, hasMore: result.hasMore }
      });
    } catch (error) {
      console.error('Error fetching order history:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
