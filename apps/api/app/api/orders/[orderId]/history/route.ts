import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { getAuditLogger, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/orders/[orderId]/history - Get change history for an order
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
