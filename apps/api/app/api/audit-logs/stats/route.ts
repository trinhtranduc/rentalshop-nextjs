import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db, prisma } from '@rentalshop/database';
import { AuditLogger } from '../../../../../../packages/database/src/audit';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/audit-logs/stats - Get audit log statistics
 * REFACTORED: Now uses unified withAuthRoles pattern
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
  try {

    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters for stats
    const filter: any = {};
    
    if (searchParams.get('merchantId')) {
      filter.merchantId = searchParams.get('merchantId');
    }
    if (searchParams.get('outletId')) {
      filter.outletId = searchParams.get('outletId');
    }
    if (searchParams.get('startDate')) {
      filter.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filter.endDate = new Date(searchParams.get('endDate')!);
    }

    const auditLogger = new AuditLogger(prisma);
    const stats = await auditLogger.getAuditStats(filter);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    // Error will be automatically logged by withApiLogging wrapper
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
  })
);
