import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { getAuditLogger, prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/audit-logs/stats - Get audit log statistics
 * ADMIN: all; MERCHANT/OUTLET_ADMIN: filtered by scope
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const filter: Record<string, any> = {};
    if (searchParams.get('merchantId')) filter.merchantId = parseInt(searchParams.get('merchantId')!, 10);
    if (searchParams.get('outletId')) filter.outletId = parseInt(searchParams.get('outletId')!, 10);
    if (searchParams.get('startDate')) filter.startDate = new Date(searchParams.get('startDate')!);
    if (searchParams.get('endDate')) filter.endDate = new Date(searchParams.get('endDate')!);

    if (user.role !== USER_ROLE.ADMIN) {
      if (userScope.merchantId != null) filter.merchantId = userScope.merchantId;
      if (userScope.outletId != null) filter.outletId = userScope.outletId;
    }

    const auditLogger = getAuditLogger(prisma);
    const stats = await auditLogger.getAuditStats(filter);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
