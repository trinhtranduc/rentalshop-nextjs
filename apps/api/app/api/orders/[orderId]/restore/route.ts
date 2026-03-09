import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { API, USER_ROLE } from '@rentalshop/constants';

function buildAuditContext(request: NextRequest, user: { id: number; email: string; role: string }, userScope: { merchantId?: number; outletId?: number }) {
  return {
    userId: String(user.id),
    userEmail: user.email,
    userRole: user.role,
    merchantId: userScope.merchantId != null ? String(userScope.merchantId) : undefined,
    outletId: userScope.outletId != null ? String(userScope.outletId) : undefined,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || undefined
  };
}

/**
 * POST /api/orders/[orderId]/restore - Restore soft-deleted order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;

  return withPermissions(['orders.manage'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'), { status: 400 });
      }
      const orderIdNum = parseInt(orderId);

      const existing = await db.orders.findById(orderIdNum);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('ORDER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }
      if (user.role === USER_ROLE.OUTLET_ADMIN && existing.outletId !== userScope.outletId) {
        return NextResponse.json(ResponseBuilder.error('CANNOT_RESTORE_ORDER_FROM_OTHER_OUTLET'), { status: 403 });
      }
      if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
        const outlet = await db.outlets.findById(existing.outletId);
        if (outlet && outlet.merchantId !== userScope.merchantId) {
          return NextResponse.json(ResponseBuilder.error('CANNOT_RESTORE_ORDER_FROM_OTHER_MERCHANT'), { status: 403 });
        }
      }

      const restored = await db.orders.restore(orderIdNum);
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logCustom({
        action: 'RESTORE',
        entityType: 'Order',
        entityId: String(orderIdNum),
        entityName: restored.orderNumber || String(orderIdNum),
        description: `Order restored: ${restored.orderNumber || orderIdNum}`,
        context: buildAuditContext(request, user, userScope)
      }).catch((err) => console.error('Audit log restore failed:', err));

      return NextResponse.json({
        success: true,
        data: restored,
        code: 'ORDER_RESTORED_SUCCESS',
        message: 'Order restored successfully'
      });
    } catch (error) {
      console.error('Error restoring order:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
