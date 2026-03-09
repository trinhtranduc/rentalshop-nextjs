import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { API } from '@rentalshop/constants';

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
 * POST /api/customers/[id]/restore - Restore soft-deleted customer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['customers.manage'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'), { status: 400 });
      }
      const customerId = parseInt(id);
      const userMerchantId = userScope.merchantId;
      if (user.role !== 'ADMIN' && !userMerchantId) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'), { status: 403 });
      }

      const existing = await db.customers.findById(customerId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('CUSTOMER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }
      if (user.role !== 'ADMIN' && existing.merchantId !== userMerchantId) {
        return NextResponse.json(ResponseBuilder.error('CUSTOMER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const restored = await db.customers.restore(customerId);
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logCustom({
        action: 'RESTORE',
        entityType: 'Customer',
        entityId: String(customerId),
        entityName: [restored.firstName, restored.lastName].filter(Boolean).join(' ') || restored.phone || String(customerId),
        description: `Customer restored`,
        context: buildAuditContext(request, user, userScope)
      }).catch((err) => console.error('Audit log restore failed:', err));

      return NextResponse.json({
        success: true,
        data: restored,
        code: 'CUSTOMER_RESTORED_SUCCESS',
        message: 'Customer restored successfully'
      });
    } catch (error) {
      console.error('Error restoring customer:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
