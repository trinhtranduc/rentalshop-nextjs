// ============================================================================
// SUBSCRIPTION API ENDPOINTS
// ============================================================================
// MULTI-TENANT: Uses subdomain-based tenant DB
// Note: Plans are stored in Main DB, but subscriptions are in tenant DB

import { NextRequest, NextResponse } from 'next/server';
import { getMainDb } from '@rentalshop/database';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, subscriptionCreateSchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// GET /api/subscriptions - Search subscriptions
// ============================================================================
export const GET = withManagementAuth(async (request: NextRequest, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Build where clause - NO merchantId needed, DB is isolated
    const where: any = {};
    
    if (searchParams.get('planId')) {
      where.planId = parseInt(searchParams.get('planId')!);
    }
    if (searchParams.get('status')) {
      where.status = searchParams.get('status');
    }
    if (searchParams.get('startDate') || searchParams.get('endDate')) {
      where.currentPeriodStart = {};
      if (searchParams.get('startDate')) where.currentPeriodStart.gte = new Date(searchParams.get('startDate')!);
      if (searchParams.get('endDate')) where.currentPeriodStart.lte = new Date(searchParams.get('endDate')!);
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Fetch subscriptions
    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        include: {
          plan: true, // Include plan details (if relation exists)
          payments: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      db.subscription.count({ where })
    ]);

    return NextResponse.json(
      ResponseBuilder.success('SUBSCRIPTIONS_FETCH_SUCCESS', {
        data: subscriptions,
        pagination: {
          total,
          hasMore: offset + limit < total,
          limit,
          offset
        }
      })
    );
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

// ============================================================================
// POST /api/subscriptions - Create subscription
// ============================================================================
export const POST = withManagementAuth(async (request: NextRequest, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    const body = await request.json();
    const validatedData = subscriptionCreateSchema.parse(body);

    // Validate plan exists in Main DB
    const planId = typeof validatedData.planId === 'string' ? parseInt(validatedData.planId) : validatedData.planId;
    
    const mainDb = await getMainDb();
    let planName = 'Unknown Plan';
    try {
      const planResult = await mainDb.query(
        'SELECT name, "basePrice", currency FROM "Plan" WHERE "publicId" = $1',
        [planId]
      );
      if (planResult.rows.length === 0) {
        mainDb.end();
        return NextResponse.json(
          ResponseBuilder.error('PLAN_NOT_FOUND', 'Plan not found in Main DB'),
          { status: API.STATUS.NOT_FOUND }
        );
      }
      planName = planResult.rows[0].name;
      mainDb.end();
    } catch (error) {
      console.error('Error validating plan:', error);
      mainDb.end();
      return NextResponse.json(
        ResponseBuilder.error('PLAN_VALIDATION_FAILED', 'Failed to validate plan'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Create subscription in tenant DB
    // Note: merchantId has been removed from schema, but TypeScript may cache old types
    const subscription = await db.subscription.create({
      data: {
        planId: planId,
        status: validatedData.status || 'ACTIVE',
        currentPeriodStart: validatedData.currentPeriodStart || new Date(),
        currentPeriodEnd: validatedData.currentPeriodEnd || new Date(),
        amount: validatedData.amount,
        currency: validatedData.currency || 'USD'
      } as any, // Type assertion needed until TypeScript server refreshes
      include: {
        payments: true
      }
    });

    return NextResponse.json(
      ResponseBuilder.success('SUBSCRIPTION_CREATED_SUCCESS', subscription)
    );
  } catch (error) {
    console.error('Error creating subscription:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
