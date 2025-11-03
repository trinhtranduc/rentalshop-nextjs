import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/subscriptions/[id]
 * Get subscription by ID
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

      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_SUBSCRIPTION_ID', 'Invalid subscription ID'),
          { status: 400 }
        );
      }

      const subscription = await db.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          payments: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      if (!subscription) {
        return NextResponse.json(
          ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_FETCH_SUCCESS', subscription)
      );
    } catch (error) {
      console.error('Error fetching subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/subscriptions/[id]
 * Update subscription
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function PUT(
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

      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_SUBSCRIPTION_ID', 'Invalid subscription ID'),
          { status: 400 }
        );
      }

      const existing = await db.subscription.findUnique({
        where: { id: subscriptionId }
      });
      
      if (!existing) {
        return NextResponse.json(
          ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      const body = await request.json();
      const updatedSubscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: body,
        include: {
          payments: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_UPDATED_SUCCESS', updatedSubscription)
      );
    } catch (error) {
      console.error('Error updating subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/subscriptions/[id]
 * Cancel subscription
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function DELETE(
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

      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_SUBSCRIPTION_ID', 'Invalid subscription ID'),
          { status: 400 }
        );
      }

      const existing = await db.subscription.findUnique({
        where: { id: subscriptionId }
      });
      
      if (!existing) {
        return NextResponse.json(
          ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Cancel subscription by updating status
      const cancelledSubscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: { 
          status: 'CANCELLED',
          canceledAt: new Date(),
          cancelAtPeriodEnd: true
        },
        include: {
          payments: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_CANCELLED_SUCCESS', cancelledSubscription)
      );
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}