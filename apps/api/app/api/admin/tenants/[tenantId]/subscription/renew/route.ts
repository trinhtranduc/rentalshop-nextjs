import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantById, getTenantDb, getPlanById, updateTenant } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema for renewal request
const renewSubscriptionSchema = z.object({
  months: z.number().int().positive().optional(),
  planId: z.number().int().positive().optional(),
});

/**
 * PUT /api/admin/tenants/{tenantId}/subscription/renew
 * Renew subscription for a specific tenant (Admin only)
 * Updates subscription in tenant DB and subscription status in Main DB
 */
export async function PUT(
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

    // Get tenant from Main DB
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_NOT_FOUND', 'Tenant not found'),
        { status: 404 }
      );
    }

    if (tenant.status !== 'active') {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_INACTIVE', 'Tenant is not active'),
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = renewSubscriptionSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          errors: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { months, planId: newPlanId } = validatedData.data;

    // Connect to tenant DB
    const tenantDb = await getTenantDb(tenant.subdomain);

    // Get current subscription from tenant DB
    const currentSubscription = await (tenantDb as any).subscription.findFirst({
      where: {
        status: { not: 'CANCELLED' },
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            currency: true,
            interval: true,
            intervalCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSubscription) {
      return NextResponse.json(
        ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND', 'Active subscription not found in tenant database'),
        { status: 404 }
      );
    }

    // Determine renewal period
    let renewalMonths: number = months || 1; // Default to 1 month
    if (!months) {
      // Use plan's interval if months not specified
      if (currentSubscription.plan?.interval === 'month') {
        renewalMonths = currentSubscription.intervalCount || 1;
      } else if (currentSubscription.plan?.interval === 'year') {
        renewalMonths = (currentSubscription.intervalCount || 1) * 12;
      }
    }

    // Validate renewal period
    if (renewalMonths < 1 || renewalMonths > 24) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_RENEWAL_PERIOD', 'Renewal period must be between 1 and 24 months'),
        { status: 400 }
      );
    }

    // Calculate new end date
    const currentEndDate = currentSubscription.currentPeriodEnd || new Date();
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + renewalMonths);

    // Determine plan ID (use new plan if provided, otherwise keep current)
    let planIdToUse = currentSubscription.planId;
    if (newPlanId) {
      // Validate new plan exists
      const newPlan = await getPlanById(newPlanId);
      if (!newPlan) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_NOT_FOUND', 'Plan not found'),
          { status: 404 }
        );
      }
      planIdToUse = newPlanId;
    }

    // Update subscription in tenant DB
    const updatedSubscription = await (tenantDb as any).subscription.update({
      where: { id: currentSubscription.id },
      data: {
        currentPeriodEnd: newEndDate,
        planId: planIdToUse,
        status: 'ACTIVE', // Ensure status is active
        cancelAtPeriodEnd: false, // Clear any cancellation flags
        updatedAt: new Date(),
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            currency: true,
          },
        },
      },
    });

    // Update tenant subscription status in Main DB
    await updateTenant(tenantId, {
      subscriptionStatus: 'active',
      currentPeriodEnd: newEndDate,
      planId: planIdToUse,
    });

    // Get updated tenant info
    const updatedTenant = await getTenantById(tenantId);

    return NextResponse.json(
      ResponseBuilder.success('SUBSCRIPTION_RENEWED', {
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          currentPeriodStart: updatedSubscription.currentPeriodStart,
          currentPeriodEnd: updatedSubscription.currentPeriodEnd,
          plan: updatedSubscription.plan,
          renewalMonths,
        },
        tenant: {
          id: updatedTenant?.id,
          name: updatedTenant?.name,
          subdomain: updatedTenant?.subdomain,
          subscriptionStatus: updatedTenant?.subscriptionStatus,
          currentPeriodEnd: updatedTenant?.currentPeriodEnd,
        },
      })
    );
  } catch (error: any) {
    console.error('Renew tenant subscription error:', error);
    
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

