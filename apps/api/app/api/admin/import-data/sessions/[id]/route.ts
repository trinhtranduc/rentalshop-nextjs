/**
 * GET /api/admin/import-data/sessions/:id
 * Get import session status and progress
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

    // Build progress response
    const progress: any = {};
    if (session.progress?.entityProgress) {
      if (session.progress.entityProgress.customers) {
        progress.customers = {
          processed: session.progress.entityProgress.customers.processed,
          total: session.progress.entityProgress.customers.total,
          errors: session.progress.entityProgress.customers.errors || 0
        };
      }
      if (session.progress.entityProgress.products) {
        progress.products = {
          processed: session.progress.entityProgress.products.processed,
          total: session.progress.entityProgress.products.total,
          errors: session.progress.entityProgress.products.errors || 0
        };
      }
      if (session.progress.entityProgress.orders) {
        progress.orders = {
          processed: session.progress.entityProgress.orders.processed,
          total: session.progress.entityProgress.orders.total,
          errors: session.progress.entityProgress.orders.errors || 0
        };
      }
    }

    return NextResponse.json(
      ResponseBuilder.success('SESSION_FOUND', {
        sessionId: session.id,
        status: session.status,
        progress,
        stats: session.stats || {
          customers: { created: 0, failed: 0 },
          products: { created: 0, failed: 0 },
          orders: { created: 0, failed: 0 }
        },
        errors: session.errorLog || []
      })
    );
  } catch (error: any) {
    console.error('Error getting import session:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

