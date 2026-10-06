import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { canReadProductHistory, isOutletRole, loadChangeTimeline, type HistoryDb } from '../../../../../lib/change-history';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/products/[id]/changes?limit&offset — readable change history (#519)
 *
 * Access: `products.view`. The product must belong to the caller's merchant (ADMIN / OPS: any),
 * otherwise 404 PRODUCT_NOT_FOUND. OUTLET_ADMIN / OUTLET_STAFF only get rows recorded with their
 * outlet (AuditLog.outletId); rows written by the owner carry no outlet and are not shown to them.
 * Response: { entries: [{ id, at, kind, actor, changes, items, note? }], total, latestAt }, newest first.
 * Never includes costPrice, email, IP or user agent. Reads AuditLog by (entityType, entityId).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);

  return withPermissions(['products.view'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'), { status: 400 });
      }
      const { searchParams } = new URL(request.url);
      const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const productId = parseInt(id, 10);
      const db = prisma as unknown as HistoryDb;

      const allowed = await canReadProductHistory(db, productId, {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId,
      });
      if (!allowed) {
        return NextResponse.json(ResponseBuilder.error('PRODUCT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const outletRole = isOutletRole(user.role);
      if (outletRole && userScope.outletId == null) {
        return NextResponse.json(
          ResponseBuilder.success('AUDIT_LOG_RETRIEVED_SUCCESS', { entries: [], total: 0, latestAt: null })
        );
      }
      const page = await loadChangeTimeline(db, {
        entityType: 'Product',
        entityId: productId,
        outletId: outletRole ? userScope.outletId : undefined,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });
      return NextResponse.json(ResponseBuilder.success('AUDIT_LOG_RETRIEVED_SUCCESS', page));
    } catch (error) {
      console.error('Error fetching product changes:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
