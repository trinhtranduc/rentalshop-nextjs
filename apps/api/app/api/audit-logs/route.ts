import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { AuditLogger } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/audit-logs - Get audit logs with filtering and pagination
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const GET = withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/audit-logs - Admin: ${user.email}`);
  
  try {

    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const filter = {
      action: searchParams.get('action') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      userId: searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined,
      merchantId: searchParams.get('merchantId') ? parseInt(searchParams.get('merchantId')!) : undefined,
      outletId: searchParams.get('outletId') ? parseInt(searchParams.get('outletId')!) : undefined,
      severity: searchParams.get('severity') || undefined,
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Validate limit and offset
    if (filter.limit > 100) filter.limit = 100;
    if (filter.offset < 0) filter.offset = 0;

    // TODO: Fix AuditLogger constructor - needs proper PrismaClient type
    // const auditLogger = new AuditLogger(db);
    // For now, return placeholder data
    const result = {
      logs: [],
      total: 0,
      hasMore: false
    };
    // const result = await auditLogger.getAuditLogs(filter);

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: filter.limit,
        offset: filter.offset,
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
