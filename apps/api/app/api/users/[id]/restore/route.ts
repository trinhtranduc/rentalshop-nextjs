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
 * POST /api/users/[id]/restore - Restore soft-deleted user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['users.manage'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_USER_ID_FORMAT'), { status: 400 });
      }
      const userId = parseInt(id);

      const existing = await db.users.findById(userId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('USER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }
      if (!(existing as any).deletedAt) {
        return NextResponse.json(ResponseBuilder.error('USER_NOT_DELETED'), { status: 400 });
      }
      if (userScope.merchantId && (existing as any).merchantId !== userScope.merchantId) {
        return NextResponse.json(ResponseBuilder.error('USER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const restored = await db.users.restore(userId);
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logCustom({
        action: 'RESTORE',
        entityType: 'User',
        entityId: String(userId),
        entityName: restored.email,
        description: `User restored: ${restored.email}`,
        context: buildAuditContext(request, user, userScope)
      }).catch((err) => console.error('Audit log restore failed:', err));

      return NextResponse.json({
        success: true,
        data: restored,
        code: 'USER_RESTORED_SUCCESS',
        message: 'User restored successfully'
      });
    } catch (error) {
      console.error('Error restoring user:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
