import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { AuditLogger } from '../../../../../../packages/database/src/audit';
import { API } from '@rentalshop/constants';

/**
 * GET /api/audit-logs/stats - Get audit log statistics
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const GET = withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
  console.log(`📊 GET /api/audit-logs/stats - Admin: ${user.email}`);
  
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
    console.error('Error fetching audit statistics:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit statistics' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
