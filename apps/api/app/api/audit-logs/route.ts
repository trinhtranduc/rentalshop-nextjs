import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/audit-logs - Get audit logs with filtering and pagination
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withManagementAuth(async (request, { user }) => {
  console.log(`🔍 GET /api/audit-logs - User: ${user.email}`);
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    const { searchParams } = new URL(request.url);
    
    // Build where clause - NO merchantId needed, DB is isolated
    const where: any = {};
    
    if (searchParams.get('action')) where.action = searchParams.get('action');
    if (searchParams.get('entityType')) where.entityType = searchParams.get('entityType');
    if (searchParams.get('entityId')) where.entityId = parseInt(searchParams.get('entityId')!);
    if (searchParams.get('userId')) where.userId = parseInt(searchParams.get('userId')!);
    // Note: AuditLog model doesn't have outletId, severity, or category fields
    // These filters are ignored if provided
    
    // Date filtering
    if (searchParams.get('startDate') || searchParams.get('endDate')) {
      where.createdAt = {};
      if (searchParams.get('startDate')) where.createdAt.gte = new Date(searchParams.get('startDate')!);
      if (searchParams.get('endDate')) where.createdAt.lte = new Date(searchParams.get('endDate')!);
    }

    // User filtering for outlet-level users (AuditLog doesn't have outletId)
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // Filter by userId to ensure users only see their own actions
      where.userId = user.id;
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Fetch audit logs
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      db.auditLog.count({ where })
    ]);

    return NextResponse.json(
      ResponseBuilder.success('AUDIT_LOGS_FETCH_SUCCESS', {
        data: logs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      })
    );

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
