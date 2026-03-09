import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { getAuditLogger, prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/audit-logs - Get audit logs with filtering and pagination
 * ADMIN: all logs; MERCHANT: filtered by merchantId; OUTLET_ADMIN: filtered by outletId
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const filter: Record<string, any> = {
      action: searchParams.get('action') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      userId: searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined,
      merchantId: searchParams.get('merchantId') ? parseInt(searchParams.get('merchantId')!) : undefined,
      outletId: searchParams.get('outletId') ? parseInt(searchParams.get('outletId')!) : undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: Math.min(parseInt(searchParams.get('limit') || '50') || 50, 100),
      offset: Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)
    };

    // Role-based scope: non-ADMIN users only see their scope
    if (user.role !== USER_ROLE.ADMIN) {
      if (userScope.merchantId != null) filter.merchantId = userScope.merchantId;
      if (userScope.outletId != null) filter.outletId = userScope.outletId;
    }

    const auditLogger = getAuditLogger(prisma);
    const result = await auditLogger.getAuditLogs(filter);
    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: { total: result.total, limit: filter.limit, offset: filter.offset, hasMore: result.hasMore }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
