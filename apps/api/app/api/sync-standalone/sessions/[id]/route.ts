/**
 * GET /api/sync-standalone/sessions/:id
 * Get sync session status and details
 * CẦN admin authentication để truy cập
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { db } from '@rentalshop/database';
import { USER_ROLE } from '@rentalshop/constants';

export const GET = withAuthRoles([USER_ROLE.ADMIN])(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const sessionId = parseInt(params.id, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_SESSION_ID'),
        { status: 400 }
      );
    }

    // Get session
    const session = await db.sync.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        ResponseBuilder.error('SESSION_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Determine if session can be resumed or rolled back
    const canResume = session.status === 'PARTIALLY_COMPLETED' || session.status === 'FAILED';
    const canRollback = session.status !== 'COMPLETED';

    return NextResponse.json(
      ResponseBuilder.success('SESSION_FOUND', {
        session: {
          id: session.id,
          merchantId: session.merchantId,
          entities: session.entities,
          status: session.status,
          stats: session.stats,
          progress: session.progress,
          errorLog: session.errorLog,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        },
        actions: {
          canResume,
          canRollback
        }
      })
    );
  } catch (error: any) {
    console.error('Error getting sync session:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

