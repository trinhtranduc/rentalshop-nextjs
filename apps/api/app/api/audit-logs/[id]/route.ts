import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/audit-logs/[id]
 * Get audit log by ID
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withManagementAuth(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;

      const { id } = params;
      console.log('🔍 GET /api/audit-logs/[id] - Looking for audit log with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_AUDIT_LOG_ID_FORMAT'),
          { status: 400 }
        );
      }

      const auditLogId = parseInt(id);
      
      // Build where clause
      const where: any = { id: auditLogId };
      
      // User filtering for outlet-level users (AuditLog doesn't have outletId)
      if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
        where.userId = user.id;
      }
      
      // Get audit log
      const auditLog = await db.auditLog.findFirst({
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
        }
      });

      if (!auditLog) {
        console.log('❌ Audit log not found in database for auditLogId:', auditLogId);
        return NextResponse.json(
          ResponseBuilder.error('AUDIT_LOG_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Audit log found:', auditLog);

      return NextResponse.json(
        ResponseBuilder.success('AUDIT_LOG_RETRIEVED_SUCCESS', auditLog)
      );

    } catch (error) {
      console.error('❌ Error fetching audit log:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}