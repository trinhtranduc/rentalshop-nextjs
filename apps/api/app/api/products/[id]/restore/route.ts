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
 * POST /api/products/[id]/restore - Restore deactivated product (set isActive true)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['products.manage'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'), { status: 400 });
      }
      const productId = parseInt(id);
      const userMerchantId = userScope.merchantId;
      if (user.role !== USER_ROLE.ADMIN && !userMerchantId) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'), { status: 403 });
      }

      const existing = await db.products.findById(productId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('PRODUCT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }
      const productMerchantId = (existing as any).merchant?.id ?? (existing as any).merchantId;
      if (user.role !== USER_ROLE.ADMIN && productMerchantId !== userMerchantId) {
        return NextResponse.json(ResponseBuilder.error('PRODUCT_ACCESS_DENIED'), { status: API.STATUS.FORBIDDEN });
      }

      const restored = await db.products.restore(productId);
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logCustom({
        action: 'RESTORE',
        entityType: 'Product',
        entityId: String(productId),
        entityName: restored.name,
        description: `Product restored: ${restored.name}`,
        context: buildAuditContext(request, user, userScope)
      }).catch((err) => console.error('Audit log restore failed:', err));

      return NextResponse.json({
        success: true,
        data: restored,
        code: 'PRODUCT_RESTORED_SUCCESS',
        message: 'Product restored successfully'
      });
    } catch (error) {
      console.error('Error restoring product:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
