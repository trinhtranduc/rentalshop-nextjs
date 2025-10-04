// ============================================================================
// SUBSCRIPTION LIMITS API ROUTE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { 
  getPlanLimitsInfo, 
  getPlanLimitsSummary, 
  getUpgradeSuggestions,
  checkPlanFeature 
} from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/subscription/limits
 * Get current plan limits and usage information
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/subscription/limits - User: ${user.email} (${user.role})`);
  
  try {
    if (!userScope.merchantId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'User must be associated with a merchant to view plan limits' 
        },
        { status: 403 }
      );
    }

    // Get comprehensive plan limits information
    const [planInfo, planSummary, upgradeSuggestions] = await Promise.all([
      getPlanLimitsInfo(userScope.merchantId),
      getPlanLimitsSummary(userScope.merchantId),
      getUpgradeSuggestions(userScope.merchantId)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        planInfo,
        planSummary,
        upgradeSuggestions,
        canCreate: {
          outlets: planInfo.isUnlimited.outlets || planInfo.currentCounts.outlets < planInfo.planLimits.outlets,
          users: planInfo.isUnlimited.users || planInfo.currentCounts.users < planInfo.planLimits.users,
          products: planInfo.isUnlimited.products || planInfo.currentCounts.products < planInfo.planLimits.products,
          customers: planInfo.isUnlimited.customers || planInfo.currentCounts.customers < planInfo.planLimits.customers,
          orders: true // Orders are typically unlimited
        }
      },
      message: 'Plan limits retrieved successfully'
    });

  } catch (error: any) {
    console.error('Error in GET /api/subscription/limits:', error);
    
    if (error.code === 'SUBSCRIPTION_NOT_FOUND') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No active subscription found. Please contact support.' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve plan limits' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/subscription/limits/check
 * Check if user can create a specific entity type
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/subscription/limits/check - User: ${user.email} (${user.role})`);
  
  try {
    if (!userScope.merchantId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'User must be associated with a merchant to check plan limits' 
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { entityType, entityTypes } = body;

    if (!entityType && !entityTypes) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Either entityType or entityTypes is required' 
        },
        { status: 400 }
      );
    }

    if (entityType) {
      // Check single entity type
      const planInfo = await getPlanLimitsInfo(userScope.merchantId);
      const limit = planInfo.planLimits[entityType];
      const current = planInfo.currentCounts[entityType];
      const isUnlimited = planInfo.isUnlimited[entityType];

      const canCreate = isUnlimited || current < limit;

      return NextResponse.json({
        success: true,
        data: {
          entityType,
          canCreate,
          current,
          limit,
          unlimited: isUnlimited,
          message: canCreate 
            ? `Can create ${entityType}. Current: ${current}${isUnlimited ? ' (unlimited)' : `/${limit}`}`
            : `Cannot create ${entityType}. Limit reached: ${current}/${limit}`
        },
        message: canCreate ? 'Creation allowed' : 'Creation blocked by plan limits'
      });
    }

    if (entityTypes) {
      // Check multiple entity types
      const planInfo = await getPlanLimitsInfo(userScope.merchantId);
      const results = entityTypes.map((type: string) => {
        const limit = planInfo.planLimits[type];
        const current = planInfo.currentCounts[type];
        const isUnlimited = planInfo.isUnlimited[type];
        const canCreate = isUnlimited || current < limit;

        return {
          entityType: type,
          canCreate,
          current,
          limit,
          unlimited: isUnlimited
        };
      });

      const allCanCreate = results.every(r => r.canCreate);

      return NextResponse.json({
        success: true,
        data: {
          results,
          allCanCreate,
          message: allCanCreate 
            ? 'All entity types can be created'
            : 'Some entity types cannot be created due to plan limits'
        },
        message: allCanCreate ? 'All creations allowed' : 'Some creations blocked by plan limits'
      });
    }

  } catch (error: any) {
    console.error('Error in POST /api/subscription/limits/check:', error);
    
    if (error.code === 'SUBSCRIPTION_NOT_FOUND') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No active subscription found. Please contact support.' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to check plan limits' },
      { status: 500 }
    );
  }
});
