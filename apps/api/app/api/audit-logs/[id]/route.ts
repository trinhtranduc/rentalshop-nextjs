import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/audit-logs/[id]
 * Get audit log by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
    try {
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
      
      // Get audit log using the simplified database API
      const auditLog = await db.auditLogs.findFirst({ id: auditLogId });

      if (!auditLog) {
        console.log('❌ Audit log not found in database for auditLogId:', auditLogId);
        return NextResponse.json(
          ResponseBuilder.error('AUDIT_LOG_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Audit log found:', auditLog);

      return NextResponse.json({
        success: true,
        data: auditLog,
        code: 'AUDIT_LOG_RETRIEVED_SUCCESS', message: 'Audit log retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching audit log:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}