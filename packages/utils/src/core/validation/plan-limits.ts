// ============================================================================
// PLAN LIMITS VALIDATION
// ============================================================================
// Functions for validating and checking plan limits

import { prisma } from '@rentalshop/database';
import { ApiError, ErrorCode } from '../errors';
import { PlanLimits } from '@rentalshop/constants';
import type { PlanLimitsInfo, PlanLimitsValidationResult } from '../validation-schemas';
import { getCurrentEntityCounts } from './entity-counts';
import { logger } from '../logger';

/**
 * Get comprehensive plan limits information for a merchant
 */
export async function getPlanLimitsInfo(merchantId: number): Promise<PlanLimitsInfo> {
  try {
    // Get merchant with subscription - use fresh query to avoid stale data
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        subscription: {
          include: {
            plan: true // Include plan to get fresh data
          }
        }
      }
    });

    if (!merchant) {
      throw new ApiError(ErrorCode.MERCHANT_NOT_FOUND);
    }

    if (!merchant.subscription) {
      throw new ApiError(ErrorCode.SUBSCRIPTION_NOT_FOUND);
    }
    
    logger.debug({
      merchantId,
      subscriptionId: merchant.subscription.id,
      planId: merchant.subscription.planId,
      planName: merchant.subscription.plan?.name || 'N/A'
    }, 'getPlanLimitsInfo - Subscription data');

    // Get plan information - use plan from subscription if available, otherwise fetch fresh
    const plan = merchant.subscription.plan || await prisma.plan.findUnique({
      where: { id: merchant.subscription.planId }
    });
    if (!plan) {
      throw new ApiError(ErrorCode.PLAN_NOT_FOUND);
    }
    
    // Parse plan limits - handle both string and object formats
    let planLimits: Partial<PlanLimits> & { allowWebAccess?: boolean; allowMobileAccess?: boolean };
    if (typeof plan.limits === 'string') {
      try {
        planLimits = JSON.parse(plan.limits);
        logger.debug({
          raw: plan.limits,
          parsed: planLimits,
          hasOrders: 'orders' in planLimits,
          ordersValue: planLimits.orders
        }, 'Parsed plan.limits from JSON string');
      } catch (e) {
        logger.error({ error: e, rawValue: plan.limits }, 'Error parsing plan.limits');
        planLimits = {};
      }
    } else {
      planLimits = (plan.limits as Partial<PlanLimits>) || {};
      logger.debug({
        limits: planLimits,
        hasOrders: 'orders' in planLimits,
        ordersValue: planLimits.orders
      }, 'Using plan.limits as object');
    }
    
    // Ensure all required fields exist with default values
    // Default to unlimited (-1) if field is missing to prevent blocking operations
    // IMPORTANT: If orders is 0, treat as unlimited (-1) for backward compatibility
    // Only -1 means unlimited, 0 should be treated as unlimited (legacy data issue)
    const originalOrders = planLimits.orders;
    
    // FIX: Treat orders: 0 as unlimited (-1) for backward compatibility
    // This handles cases where old plan data has orders: 0 instead of undefined or proper limit
    // CRITICAL: This must happen BEFORE spread operator to ensure correct value
    const ordersLimit = (planLimits.orders === undefined || planLimits.orders === null || planLimits.orders === 0)
      ? -1  // Unlimited if missing, null, or 0
      : planLimits.orders;
    
    // IMPORTANT: Build planLimits object WITHOUT spread to ensure ordersLimit is used correctly
    planLimits = {
      outlets: planLimits.outlets !== undefined ? planLimits.outlets : -1,
      users: planLimits.users !== undefined ? planLimits.users : -1,
      products: planLimits.products !== undefined ? planLimits.products : -1,
      customers: planLimits.customers !== undefined ? planLimits.customers : -1,
      orders: ordersLimit, // Set orders FIRST (before any spread)
      // Don't spread planLimits here to avoid overriding orders with original value
      allowWebAccess: planLimits.allowWebAccess,
      allowMobileAccess: planLimits.allowMobileAccess,
    };
    
    // Log orders limit parsing for debugging
    logger.debug({
      merchantId,
      originalOrders,
      finalOrders: planLimits.orders,
      wasDefaulted: (originalOrders === undefined || originalOrders === null || originalOrders === 0) && planLimits.orders === -1,
      wasFixed: originalOrders === 0 && planLimits.orders === -1,
      note: originalOrders === undefined || originalOrders === null
        ? 'WARNING: orders field missing in plan limits, defaulting to unlimited (-1)' 
        : originalOrders === 0
        ? 'WARNING: orders field is 0 (legacy data), treating as unlimited (-1) for backward compatibility'
        : `orders field found: ${originalOrders}`,
      verification: planLimits.orders === -1 ? 'Orders correctly set to unlimited (-1)' : `Orders still ${planLimits.orders} (should be -1)`
    }, 'Plan limits after processing');
    
    // Parse plan features - handle both string and array formats
    let features: string[];
    if (typeof plan.features === 'string') {
      try {
        features = JSON.parse(plan.features);
      } catch (e) {
        logger.error({ error: e, rawValue: plan.features }, 'Error parsing plan.features');
        features = [];
      }
    } else if (Array.isArray(plan.features)) {
      features = plan.features;
    } else {
      features = [];
    }
    
    const platform = features.includes('Web dashboard access') ? 'mobile+web' : 'mobile';

    // Get addon limits and add them to plan limits
    const { db } = await import('@rentalshop/database');
    const addonLimits = await db.planLimitAddons.calculateTotal(merchantId);
    
    // Store base plan limits (before adding addons) for reference
    // This ensures total limit never goes below the original plan base limit
    const basePlanLimits = { ...planLimits };
    
    // Calculate total limits: plan limits + addon limits
    // Formula: total = plan mặc định + plan addon (nếu có)
    // Note: If plan limit is -1 (unlimited), total is also -1 (unlimited)
    // Otherwise, simply add: baseLimit + addonLimit
    const calculateTotalLimit = (baseLimit: number, addonLimit: number): number => {
      // If base limit is unlimited, total is also unlimited
      if (baseLimit === -1) return -1;
      
      // Simple formula: total = plan mặc định + addon
      // Example: plan = 10, addon = 5 => total = 15
      const total = baseLimit + addonLimit;
      
      // FIX: If total is 0, treat as unlimited (-1) to prevent blocking
      // This handles edge cases where plan limit + addon = 0
      if (total === 0) {
        logger.warn({ baseLimit, addonLimit }, 'Total limit is 0, treating as unlimited (-1) to prevent blocking');
        return -1;
      }
      
      // Ensure total is never negative (minimum is 0, but 0 is already handled above)
      return Math.max(0, total);
    };
    
    const totalLimits: PlanLimits = {
      outlets: calculateTotalLimit(planLimits.outlets ?? -1, addonLimits.outlets),
      users: calculateTotalLimit(planLimits.users ?? -1, addonLimits.users),
      products: calculateTotalLimit(planLimits.products ?? -1, addonLimits.products),
      customers: calculateTotalLimit(planLimits.customers ?? -1, addonLimits.customers),
      orders: calculateTotalLimit(planLimits.orders ?? -1, addonLimits.orders),
    };

    // Get current counts
    const currentCounts = await getCurrentEntityCounts(merchantId);

    // Check unlimited flags: Only -1 means unlimited
    const isUnlimited = {
      outlets: totalLimits.outlets === -1,
      users: totalLimits.users === -1,
      products: totalLimits.products === -1,
      customers: totalLimits.customers === -1,
      orders: totalLimits.orders === -1
    };
    
    logger.debug({
      merchantId,
      subscriptionId: merchant.subscription.id,
      planId: merchant.subscription.planId,
      planName: plan.name,
      basePlanLimits: basePlanLimits,
      addonLimits,
      totalLimits,
      limitsType: typeof plan.limits,
      rawPlanLimits: plan.limits,
      parsedPlanLimits: planLimits,
      ordersCalculation: {
        planDefault: basePlanLimits.orders,
        addon: addonLimits.orders,
        total: totalLimits.orders,
        formula: `${basePlanLimits.orders} + ${addonLimits.orders} = ${totalLimits.orders}`
      },
      ordersUnlimited: isUnlimited.orders,
      currentOrdersCount: currentCounts.orders,
      canCreateOrder: isUnlimited.orders || (totalLimits.orders !== undefined && currentCounts.orders < totalLimits.orders),
      planFeatures: features.slice(0, 3),
      ordersValidation: {
        limit: totalLimits.orders,
        current: currentCounts.orders,
        isUnlimited: isUnlimited.orders,
        canCreate: isUnlimited.orders || (totalLimits.orders !== undefined && currentCounts.orders < totalLimits.orders),
        comparison: isUnlimited.orders ? 'UNLIMITED' : `${currentCounts.orders} < ${totalLimits.orders}`,
        remaining: isUnlimited.orders ? 'UNLIMITED' : (totalLimits.orders - currentCounts.orders),
        reason: isUnlimited.orders 
          ? 'UNLIMITED - can create' 
          : (currentCounts.orders >= totalLimits.orders 
            ? `LIMIT REACHED: ${currentCounts.orders} >= ${totalLimits.orders}` 
            : `WITHIN LIMIT: ${currentCounts.orders} < ${totalLimits.orders} (${totalLimits.orders - currentCounts.orders} remaining)`)
      }
    }, 'Plan Limits Check');

    // Check platform access from plan features
    const platformAccess = {
      mobile: true, // All plans have mobile access
      web: features.includes('Web dashboard access'),
      productPublicCheck: features.includes('Product public check')
    };

    return {
      planLimits: totalLimits,
      basePlanLimits: basePlanLimits as PlanLimits,
      addonLimits,
      platform: platform || 'mobile',
      currentCounts,
      isUnlimited,
      platformAccess
    };
  } catch (error) {
    logger.error({ error, merchantId }, 'Error getting plan limits info');
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Validate if merchant can create a new entity
 */
export async function validatePlanLimits(
  merchantId: number,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<PlanLimitsValidationResult> {
  try {
    logger.debug({ merchantId, entityType }, 'validatePlanLimits called');
    const planInfo = await getPlanLimitsInfo(merchantId);
    const currentCount = planInfo.currentCounts[entityType];
    const limit = planInfo.planLimits[entityType];
    const isUnlimited = planInfo.isUnlimited[entityType];

    logger.debug({
      merchantId,
      entityType,
      currentCount,
      limit,
      isUnlimited
    }, 'validatePlanLimits result');

    // Handle undefined limit (backward compatibility - treat as unlimited)
    if (limit === undefined || limit === null) {
      logger.warn({ merchantId, entityType }, 'Plan limit is undefined, treating as unlimited for backward compatibility');
      return {
        isValid: true,
        currentCount,
        limit: -1,
        entityType
      };
    }

    // If unlimited, always allow
    if (isUnlimited) {
      return {
        isValid: true,
        currentCount,
        limit: -1,
        entityType
      };
    }

    // Check if limit is exceeded
    // Logic: currentCount >= limit means limit is exceeded
    // Example: limit = 10000, currentCount = 10000 -> cannot create (limit reached)
    // Example: limit = 10000, currentCount = 9999 -> can create (1 more allowed)
    if (currentCount >= limit) {
      logger.debug({
        merchantId,
        entityType,
        currentCount,
        limit,
        comparison: `${currentCount} >= ${limit}`,
        breakdown: {
          currentCount,
          limit,
          remaining: limit - currentCount,
          canCreate: currentCount < limit,
          reason: currentCount >= limit ? 'Limit reached or exceeded' : 'Within limit'
        }
      }, 'Plan limit exceeded');
      // Return error code only - translation system will handle the message
      return {
        isValid: false,
        error: 'PLAN_LIMIT_EXCEEDED', // Use error code for translation
        currentCount,
        limit,
        entityType
      };
    }

    return {
      isValid: true,
      currentCount,
      limit,
      entityType
    };
  } catch (error) {
    logger.error({ error, merchantId, entityType }, 'Error validating plan limits');
    
    // FIX: If it's a Prisma error (database issue), don't treat as plan limit exceeded
    // This prevents false PLAN_LIMIT_EXCEEDED errors when database is unavailable
    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name?: string }).name;
      if (errorName === 'PrismaClientInitializationError' || 
          errorName === 'PrismaClientKnownRequestError' ||
          errorName === 'PrismaClientUnknownRequestError' ||
          errorName === 'PrismaClientRustPanicError' ||
          errorName === 'PrismaClientValidationError') {
        logger.error({ errorName, merchantId, entityType }, 'Prisma database error detected, not a plan limit issue');
        // Re-throw as internal server error to indicate database issue, not plan limit
        throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
      }
    }
    
    // For other errors, also throw as internal server error
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Assert plan limits for a specific entity type
 * Throws an error if the plan limit would be exceeded
 */
export async function assertPlanLimit(
  merchantId: number,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<void> {
  try {
    const validation = await validatePlanLimits(merchantId, entityType);
    
    if (!validation.isValid) {
      throw new ApiError(ErrorCode.PLAN_LIMIT_EXCEEDED);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
