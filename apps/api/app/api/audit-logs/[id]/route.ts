import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/audit-logs/[id]
 * Get audit log by ID
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withApiLogging(
    withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
      try {
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
          return NextResponse.json(
            ResponseBuilder.error('AUDIT_LOG_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }

        return NextResponse.json({
          success: true,
          data: auditLog,
          code: 'AUDIT_LOG_RETRIEVED_SUCCESS',
          message: 'Audit log retrieved successfully'
        });

      } catch (error) {
        // Error will be automatically logged by withApiLogging wrapper
        // Use unified error handling system
        const { response, statusCode } = handleApiError(error);
        return NextResponse.json(response, { status: statusCode });
      }
    })
  )(request);
}