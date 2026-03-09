import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma, db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { API } from '@rentalshop/constants';

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'createdAt', 'updatedAt', 'id', 'merchantId'];

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
 * POST /api/customers/[id]/revert - Revert customer to state from an audit log entry (UPDATE only)
 * Body: { auditLogId: number }
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
      const body = await request.json().catch(() => ({}));
      const auditLogId = typeof body.auditLogId === 'number' ? body.auditLogId : parseInt(body.auditLogId, 10);
      if (!Number.isFinite(auditLogId)) {
        return NextResponse.json(ResponseBuilder.error('AUDIT_LOG_ID_REQUIRED'), { status: 400 });
      }

      const logRecord = await prisma.auditLog.findFirst({
        where: { id: auditLogId, entityType: 'Customer', entityId: String(customerId) }
      });
      if (!logRecord) {
        return NextResponse.json(ResponseBuilder.error('AUDIT_LOG_NOT_FOUND'), { status: 404 });
      }
      if (logRecord.action !== 'UPDATE') {
        return NextResponse.json(ResponseBuilder.error('REVERT_ONLY_FOR_UPDATE'), { status: 400 });
      }

      let details: { oldValues?: Record<string, any> } = {};
      try {
        details = typeof logRecord.details === 'string' ? JSON.parse(logRecord.details) : logRecord.details || {};
      } catch {
        return NextResponse.json(ResponseBuilder.error('INVALID_AUDIT_LOG_DETAILS'), { status: 400 });
      }
      const oldValues = details.oldValues;
      if (!oldValues || typeof oldValues !== 'object') {
        return NextResponse.json(ResponseBuilder.error('NO_OLD_VALUES_IN_LOG'), { status: 400 });
      }

      const updatePayload: Record<string, any> = {};
      for (const [key, value] of Object.entries(oldValues)) {
        if (SENSITIVE_KEYS.includes(key)) continue;
        updatePayload[key] = value;
      }
      if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json(ResponseBuilder.error('NO_SAFE_FIELDS_TO_REVERT'), { status: 400 });
      }

      const existing = await db.customers.findById(customerId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('CUSTOMER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }
      if (user.role !== 'ADMIN' && existing.merchantId !== userScope.merchantId) {
        return NextResponse.json(ResponseBuilder.error('CUSTOMER_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const reverted = await db.customers.update(customerId, updatePayload);
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logCustom({
        action: 'RESTORE',
        entityType: 'Customer',
        entityId: String(customerId),
        entityName: reverted.firstName + ' ' + (reverted.lastName || ''),
        description: `Reverted to state from audit log #${auditLogId}`,
        context: buildAuditContext(request, user, userScope)
      }).catch((err) => console.error('Audit log revert failed:', err));

      return NextResponse.json({
        success: true,
        data: reverted,
        code: 'CUSTOMER_REVERTED_SUCCESS',
        message: 'Customer reverted successfully'
      });
    } catch (error) {
      console.error('Error reverting customer:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
