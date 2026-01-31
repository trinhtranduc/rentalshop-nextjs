/**
 * POST /api/sync-standalone/rollback
 * Rollback a sync session (delete all created records)
 * CẦN admin authentication để truy cập
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { db } from '@rentalshop/database';
import { USER_ROLE } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

export const POST = withApiLogging(
  withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
    try {
      const body = await request.json();
      const { sessionId } = body;

      if (!sessionId) {
        return NextResponse.json(
          ResponseBuilder.error('MISSING_SESSION_ID'),
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

      // Check if session can be rolled back
      if (session.status === 'COMPLETED') {
        return NextResponse.json(
          ResponseBuilder.error('SESSION_CANNOT_BE_ROLLED_BACK'),
          { status: 400 }
        );
      }

      // Perform rollback
      const rollbackResult = await db.sync.rollback(sessionId);

      // Update session status
      await db.sync.updateStatus(sessionId, {
        status: 'FAILED',
        errorLog: [
          ...(session.errorLog || []),
          {
            rollback: {
              deleted: rollbackResult.deleted,
              errors: rollbackResult.errors,
              timestamp: new Date()
            }
          }
        ]
      });

      return NextResponse.json(
        ResponseBuilder.success('ROLLBACK_SUCCESS', {
          sessionId,
          deleted: rollbackResult.deleted,
          errors: rollbackResult.errors
        })
      );
    } catch (error: any) {
    // Error will be automatically logged by withApiLogging wrapper
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
  })
);

