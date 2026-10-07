import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { getAuditLogger, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { canReadProductHistory, type HistoryDb } from '../../../../../lib/change-history';

/**
 * GET /api/products/[id]/history - Get change history for a product (raw audit rows)
 *
 * Access (#519): the product must belong to the caller's merchant; ADMIN / OPS any product.
 * Otherwise 404 PRODUCT_NOT_FOUND. Response shape unchanged.
 * Reads AuditLog by the (entityType, entityId) index.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['products.view'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'), { status: 400 });
      }
      const productId = parseInt(id);
      const allowed = await canReadProductHistory(prisma as unknown as HistoryDb, productId, {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId,
      });
      if (!allowed) {
        return NextResponse.json(ResponseBuilder.error('PRODUCT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 100);
      const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0);

      const auditLogger = getAuditLogger(prisma);
      const result = await auditLogger.getAuditLogs({
        entityType: 'Product',
        entityId: String(productId),
        limit,
        offset
      });

      return NextResponse.json({
        success: true,
        data: result.logs,
        pagination: { total: result.total, limit, offset, hasMore: result.hasMore }
      });
    } catch (error) {
      console.error('Error fetching product history:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
