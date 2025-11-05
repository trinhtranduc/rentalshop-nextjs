import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/audit-logs/stats - Get audit log statistics
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withManagementAuth(async (request, { user }) => {
  console.log(`📊 GET /api/audit-logs/stats - User: ${user.email}`);
  
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
    // Note: AuditLog model doesn't have outletId, severity, or category fields
    const where: any = {};
    
    // Date filtering
    if (searchParams.get('startDate') || searchParams.get('endDate')) {
      where.createdAt = {};
      if (searchParams.get('startDate')) where.createdAt.gte = new Date(searchParams.get('startDate')!);
      if (searchParams.get('endDate')) where.createdAt.lte = new Date(searchParams.get('endDate')!);
    }

    // User filtering for outlet-level users (if needed)
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // Filter by userId since audit logs don't have outletId
      // This ensures users only see their own actions
      where.userId = user.id;
    }

    // Calculate statistics
    const [totalLogs, logsByAction, logsByEntity, recentActivity] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true }
      }),
      db.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: { entityType: true }
      }),
      db.auditLog.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    // Transform groupBy results
    const stats = {
      totalLogs,
      logsByAction: logsByAction.reduce((acc, item) => {
        acc[item.action || 'UNKNOWN'] = item._count.action || 0;
        return acc;
      }, {} as Record<string, number>),
      logsByEntity: logsByEntity.reduce((acc, item) => {
        acc[item.entityType || 'UNKNOWN'] = item._count.entityType || 0;
        return acc;
      }, {} as Record<string, number>),
      recentActivity
    };

    return NextResponse.json(
      ResponseBuilder.success('AUDIT_STATS_FETCH_SUCCESS', stats)
    );

  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
