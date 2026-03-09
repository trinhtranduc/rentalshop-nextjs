import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { getAuditLogger, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/users/[id]/history - Get change history for a user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['users.view'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_USER_ID_FORMAT'), { status: 400 });
      }
      const userId = parseInt(id);
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 100);
      const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0);

      const auditLogger = getAuditLogger(prisma);
      const result = await auditLogger.getAuditLogs({
        entityType: 'User',
        entityId: String(userId),
        limit,
        offset
      });

      return NextResponse.json({
        success: true,
        data: result.logs,
        pagination: { total: result.total, limit, offset, hasMore: result.hasMore }
      });
    } catch (error) {
      console.error('Error fetching user history:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
