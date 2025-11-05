import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantById, getTenantDb, getPlanById } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/tenants/{tenantId}/subscription
 * Get subscription details for a specific tenant (Admin only)
 * Combines Main DB subscription metadata with Tenant DB subscription details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user }) => {
    try {
      const { tenantId } = params;

    // Validate tenantId
    if (!tenantId) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_ID_REQUIRED', 'Tenant ID is required'),
        { status: 400 }
      );
    }

    // Get tenant from Main DB (contains subscription metadata)
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_NOT_FOUND', 'Tenant not found'),
        { status: 404 }
      );
    }

    // Connect to tenant DB to get subscription details
    let subscriptionDetails = null;
    let planDetails = null;

    try {
      const tenantDb = await getTenantDb(tenant.subdomain);

      // Get active subscription from tenant DB
      subscriptionDetails = await (tenantDb as any).subscription.findFirst({
        where: {
          status: { not: 'CANCELLED' },
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              description: true,
              basePrice: true,
              currency: true,
              trialDays: true,
              limits: true,
              features: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get plan details if planId exists
      if (tenant.planId) {
        planDetails = await getPlanById(tenant.planId);
      } else if (subscriptionDetails?.planId) {
        planDetails = await getPlanById(subscriptionDetails.planId);
      }
    } catch (dbError: any) {
      // If tenant DB connection fails, still return Main DB metadata
      console.warn('Failed to fetch subscription details from tenant DB:', dbError.message);
    }

    // Combine Main DB metadata with Tenant DB details
    const subscription = {
      // Main DB metadata (from Tenant table)
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSubdomain: tenant.subdomain,
      subscriptionStatus: tenant.subscriptionStatus,
      planId: tenant.planId,
      currentPeriodStart: tenant.currentPeriodStart,
      currentPeriodEnd: tenant.currentPeriodEnd,
      trialStart: tenant.trialStart,
      trialEnd: tenant.trialEnd,
      canceledAt: tenant.canceledAt,
      cancelReason: tenant.cancelReason,
      // Tenant DB details (if available)
      subscriptionDetails: subscriptionDetails
        ? {
            id: subscriptionDetails.id,
            status: subscriptionDetails.status,
            amount: subscriptionDetails.amount,
            currency: subscriptionDetails.currency,
            interval: subscriptionDetails.interval,
            intervalCount: subscriptionDetails.intervalCount,
            currentPeriodStart: subscriptionDetails.currentPeriodStart,
            currentPeriodEnd: subscriptionDetails.currentPeriodEnd,
            trialStart: subscriptionDetails.trialStart,
            trialEnd: subscriptionDetails.trialEnd,
            cancelAtPeriodEnd: subscriptionDetails.cancelAtPeriodEnd,
            canceledAt: subscriptionDetails.canceledAt,
            createdAt: subscriptionDetails.createdAt,
            updatedAt: subscriptionDetails.updatedAt,
            plan: subscriptionDetails.plan,
            payments: subscriptionDetails.payments,
          }
        : null,
      // Plan details from Main DB
      planDetails: planDetails
        ? {
            id: planDetails.id,
            name: planDetails.name,
            description: planDetails.description,
            basePrice: planDetails.basePrice,
            currency: planDetails.currency,
            trialDays: planDetails.trialDays,
            limits: planDetails.limits,
            features: planDetails.features,
          }
        : null,
    };

    return NextResponse.json(
      ResponseBuilder.success('SUBSCRIPTION_FOUND', {
        subscription,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          status: tenant.status,
        },
      })
    );
  } catch (error: any) {
    console.error('Get tenant subscription error:', error);
    
    // Handle tenant DB connection errors
    if (error.message?.includes('not found') || error.message?.includes('inactive')) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

