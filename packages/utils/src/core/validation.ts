// ============================================================================
// SERVER-ONLY VALIDATION FUNCTIONS
// ============================================================================
// This file contains server-only validation functions that use:
// - prisma (database client)
// - NextResponse (for API responses)
// 
// Validation schemas (client-safe) are exported from validation-schemas.ts
// This file should ONLY be imported from @rentalshop/utils/server

import { prisma } from '@rentalshop/database';
import { ApiError, ErrorCode } from './errors';
import { 
  API, 
  PlanLimits, 
  getPlan, 
  hasWebAccess, 
  hasMobileAccess, 
  getPlanPlatform, 
  hasProductPublicCheck,
  USER_ROLE
} from '@rentalshop/constants';
import { AuthUser } from '@rentalshop/types';

// Import schemas from validation-schemas.ts for type inference
// DO NOT re-export schemas from here - they are exported from validation-schemas.ts
import type {
  PlanLimitsValidationResult,
  PlanLimitsInfo
} from './validation-schemas';

// Re-export types for backward compatibility (server-only context)
export type { PlanLimitsValidationResult, PlanLimitsInfo };

// ============================================================================
// REMOVED: All validation schemas moved to validation-schemas.ts
// ============================================================================
// Schemas are now in validation-schemas.ts (client-safe)
// This file only contains server-only functions

/**
 * Get current counts for all entities for a merchant
 */
export async function getCurrentEntityCounts(merchantId: number): Promise<{
  outlets: number;
  users: number;
  products: number;
  customers: number;
  orders: number;
}> {
  try {
    // Debug: Get detailed user count info
    const allUsers = await prisma.user.findMany({
      where: { merchantId },
      select: { id: true, email: true, deletedAt: true, role: true, isActive: true }
    });
    const nonDeletedUsers = allUsers.filter((u: { deletedAt: Date | null }): boolean => !u.deletedAt);
    const nonDeletedNonAdminUsers = nonDeletedUsers.filter((u: { role: string }): boolean => u.role !== USER_ROLE.ADMIN);
    const adminUsers = allUsers.filter((u: { role: string }): boolean => u.role === USER_ROLE.ADMIN);
    const deletedUsers = allUsers.filter((u: { deletedAt: Date | null }): boolean => !!u.deletedAt);
    
    console.log(`🔍 getCurrentEntityCounts - Merchant ${merchantId}:`, {
      totalUsersInDB: allUsers.length,
      nonDeletedUsers: nonDeletedUsers.length, // Users that are not deleted (active + inactive)
      nonDeletedNonAdminUsers: nonDeletedNonAdminUsers.length, // Users that count toward limit (active + inactive, excluding ADMIN)
      adminUsers: adminUsers.length, // ADMIN users (excluded from limit)
      deletedUsers: deletedUsers.length, // Deleted users (excluded from limit)
      userDetails: allUsers.map((u: { id: number; email: string; role: string; deletedAt: Date | null; isActive: boolean }): { id: number; email: string; role: string; deletedAt: string; isActive: boolean; countsTowardLimit: boolean } => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        deletedAt: u.deletedAt ? 'DELETED' : 'NOT_DELETED',
        countsTowardLimit: u.role !== USER_ROLE.ADMIN && !u.deletedAt // Count both active and inactive, exclude deleted and ADMIN
      }))
    });

    const [outlets, users, products, customers, orders] = await Promise.all([
      prisma.outlet.count({ where: { merchantId } }),
      // Exclude soft-deleted users (deletedAt = null) and ADMIN users from count
      // Count both active and inactive users (isActive = true or false)
      // ADMIN users are system-wide and should not count toward merchant limits
      prisma.user.count({ 
        where: { 
          merchantId, 
          deletedAt: null, // Only exclude deleted users
          role: { not: USER_ROLE.ADMIN } // Exclude ADMIN users from limit count
        } 
      }),
      prisma.product.count({ where: { merchantId } }),
      prisma.customer.count({ where: { merchantId } }),
      // ✅ Count ALL orders including CANCELLED for plan limits
      prisma.order.count({ where: { outlet: { merchantId } } })
    ]);

    console.log(`📊 Entity counts for merchant ${merchantId}:`, {
      outlets,
      users, // This should match nonDeletedNonAdminUsers.length (includes active + inactive, excludes deleted and ADMIN)
      products,
      customers,
      orders // ✅ Includes ALL orders (including CANCELLED) for plan limits
    });

    return {
      outlets,
      users,
      products,
      customers,
      orders
    };
  } catch (error) {
    console.error('Error getting entity counts:', error);
    throw new ApiError(ErrorCode.DATABASE_ERROR);
  }
}

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
    
    console.log('🔍 getPlanLimitsInfo - Subscription data:', {
      merchantId,
      subscriptionId: merchant.subscription.id,
      planId: merchant.subscription.planId,
      planName: merchant.subscription.plan?.name || 'N/A'
    });

    // Get plan information - use plan from subscription if available, otherwise fetch fresh
    const plan = merchant.subscription.plan || await prisma.plan.findUnique({
      where: { id: merchant.subscription.planId }
    });
    if (!plan) {
      throw new ApiError(ErrorCode.PLAN_NOT_FOUND);
    }
    
    // Parse plan limits - handle both string and object formats
    let planLimits: any;
    if (typeof plan.limits === 'string') {
      try {
        planLimits = JSON.parse(plan.limits);
        console.log('🔍 Parsed plan.limits from JSON string:', {
          raw: plan.limits,
          parsed: planLimits,
          hasOrders: 'orders' in planLimits,
          ordersValue: planLimits.orders
        });
      } catch (e) {
        console.error('❌ Error parsing plan.limits:', e, 'Raw value:', plan.limits);
        planLimits = {};
      }
    } else {
      planLimits = plan.limits || {};
      console.log('🔍 Using plan.limits as object:', {
        limits: planLimits,
        hasOrders: 'orders' in planLimits,
        ordersValue: planLimits.orders
      });
    }
    
    // Ensure all required fields exist with default values
    // Default to unlimited (-1) if field is missing to prevent blocking operations
    // IMPORTANT: If orders is 0, treat as unlimited (-1) for backward compatibility
    // Only -1 means unlimited, 0 should be treated as unlimited (legacy data issue)
    const originalOrders = planLimits.orders;
    
    // ✅ FIX: Treat orders: 0 as unlimited (-1) for backward compatibility
    // This handles cases where old plan data has orders: 0 instead of undefined or proper limit
    // CRITICAL: This must happen BEFORE spread operator to ensure correct value
    const ordersLimit = (planLimits.orders === undefined || planLimits.orders === null || planLimits.orders === 0)
      ? -1  // Unlimited if missing, null, or 0
      : planLimits.orders;
    
    // ✅ IMPORTANT: Build planLimits object WITHOUT spread to ensure ordersLimit is used correctly
    planLimits = {
      outlets: planLimits.outlets !== undefined ? planLimits.outlets : -1,
      users: planLimits.users !== undefined ? planLimits.users : -1,
      products: planLimits.products !== undefined ? planLimits.products : -1,
      customers: planLimits.customers !== undefined ? planLimits.customers : -1,
      orders: ordersLimit, // ✅ Set orders FIRST (before any spread)
      // Don't spread planLimits here to avoid overriding orders with original value
      allowWebAccess: planLimits.allowWebAccess,
      allowMobileAccess: planLimits.allowMobileAccess,
    };
    
    // ✅ Log orders limit parsing for debugging
    console.log('🔍 Plan limits after processing:', {
      merchantId,
      originalOrders,
      finalOrders: planLimits.orders,
      wasDefaulted: (originalOrders === undefined || originalOrders === null || originalOrders === 0) && planLimits.orders === -1,
      wasFixed: originalOrders === 0 && planLimits.orders === -1,
      note: originalOrders === undefined || originalOrders === null
        ? '⚠️ WARNING: orders field missing in plan limits, defaulting to unlimited (-1)' 
        : originalOrders === 0
        ? '⚠️ WARNING: orders field is 0 (legacy data), treating as unlimited (-1) for backward compatibility'
        : `✅ orders field found: ${originalOrders}`,
      // ✅ Verify the fix worked
      verification: planLimits.orders === -1 ? '✅ Orders correctly set to unlimited (-1)' : `❌ Orders still ${planLimits.orders} (should be -1)`
    });
    
    // Parse plan features - handle both string and array formats
    let features: string[];
    if (typeof plan.features === 'string') {
      try {
        features = JSON.parse(plan.features);
      } catch (e) {
        console.error('Error parsing plan.features:', e, 'Raw value:', plan.features);
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
      
      // ✅ Simple formula: total = plan mặc định + addon
      // Example: plan = 10, addon = 5 => total = 15
      const total = baseLimit + addonLimit;
      
      // ✅ FIX: If total is 0, treat as unlimited (-1) to prevent blocking
      // This handles edge cases where plan limit + addon = 0
      if (total === 0) {
        console.warn(`⚠️ Total limit is 0 (baseLimit=${baseLimit}, addonLimit=${addonLimit}), treating as unlimited (-1) to prevent blocking`);
        return -1;
      }
      
      // Ensure total is never negative (minimum is 0, but 0 is already handled above)
      return Math.max(0, total);
    };
    
    const totalLimits = {
      outlets: calculateTotalLimit(planLimits.outlets, addonLimits.outlets),
      users: calculateTotalLimit(planLimits.users, addonLimits.users),
      products: calculateTotalLimit(planLimits.products, addonLimits.products),
      customers: calculateTotalLimit(planLimits.customers, addonLimits.customers),
      orders: calculateTotalLimit(planLimits.orders, addonLimits.orders),
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
    
    console.log('🔍 Plan Limits Check:', {
      merchantId,
      subscriptionId: merchant.subscription.id,
      planId: merchant.subscription.planId,
      planName: plan.name,
      // ✅ Formula: total = plan mặc định + addon
      basePlanLimits: basePlanLimits, // Plan mặc định (before addons)
      addonLimits, // Plan addon (nếu có)
      totalLimits, // Final limits = basePlanLimits + addonLimits
      limitsType: typeof plan.limits,
      rawPlanLimits: plan.limits, // ✅ Show raw limits from database for debugging
      parsedPlanLimits: planLimits, // ✅ Show parsed limits
      // ✅ Detailed orders calculation
      ordersCalculation: {
        planDefault: basePlanLimits.orders, // Plan mặc định
        addon: addonLimits.orders, // Addon (nếu có)
        total: totalLimits.orders, // Total = planDefault + addon
        formula: `${basePlanLimits.orders} + ${addonLimits.orders} = ${totalLimits.orders}`
      },
      ordersUnlimited: isUnlimited.orders,
      currentOrdersCount: currentCounts.orders,
      canCreateOrder: isUnlimited.orders || (totalLimits.orders !== undefined && currentCounts.orders < totalLimits.orders),
      planFeatures: features.slice(0, 3), // Show first 3 features for debugging
      // ✅ Detailed orders validation info
      ordersValidation: {
        limit: totalLimits.orders,
        current: currentCounts.orders,
        isUnlimited: isUnlimited.orders,
        canCreate: isUnlimited.orders || (totalLimits.orders !== undefined && currentCounts.orders < totalLimits.orders),
        comparison: isUnlimited.orders ? 'UNLIMITED' : `${currentCounts.orders} < ${totalLimits.orders}`,
        remaining: isUnlimited.orders ? 'UNLIMITED' : (totalLimits.orders - currentCounts.orders),
        // ✅ Critical check: why cannot create?
        reason: isUnlimited.orders 
          ? 'UNLIMITED - can create' 
          : (currentCounts.orders >= totalLimits.orders 
            ? `LIMIT REACHED: ${currentCounts.orders} >= ${totalLimits.orders}` 
            : `WITHIN LIMIT: ${currentCounts.orders} < ${totalLimits.orders} (${totalLimits.orders - currentCounts.orders} remaining)`)
      }
    });

    // Check platform access from plan features
    const platformAccess = {
      mobile: true, // All plans have mobile access
      web: features.includes('Web dashboard access'),
      productPublicCheck: features.includes('Product public check')
    };

    return {
      planLimits: totalLimits, // Return total limits (plan + addon, guaranteed >= base plan limit)
      basePlanLimits: basePlanLimits, // Keep original plan limits for reference (before addons)
      addonLimits, // Include addon limits for transparency
      platform: platform || 'mobile',
      currentCounts,
      isUnlimited,
      platformAccess
    };
  } catch (error) {
    console.error('Error getting plan limits info:', error);
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
    console.log(`🔍 validatePlanLimits called: merchantId=${merchantId}, entityType=${entityType}`);
    const planInfo = await getPlanLimitsInfo(merchantId);
    const currentCount = planInfo.currentCounts[entityType];
    const limit = planInfo.planLimits[entityType];
    const isUnlimited = planInfo.isUnlimited[entityType];

    console.log(`🔍 validatePlanLimits result:`, {
      merchantId,
      entityType,
      currentCount,
      limit,
      isUnlimited
    });

    // Handle undefined limit (backward compatibility - treat as unlimited)
    if (limit === undefined || limit === null) {
      console.warn(`⚠️ Plan limit for ${entityType} is undefined, treating as unlimited for backward compatibility`);
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
    // ✅ Logic: currentCount >= limit means limit is exceeded
    // Example: limit = 10000, currentCount = 10000 -> cannot create (limit reached)
    // Example: limit = 10000, currentCount = 9999 -> can create (1 more allowed)
    if (currentCount >= limit) {
      console.log(`❌ Plan limit exceeded:`, {
        merchantId,
        entityType,
        currentCount,
        limit,
        comparison: `${currentCount} >= ${limit}`,
        // ✅ Detailed breakdown for debugging
        breakdown: {
          currentCount,
          limit,
          remaining: limit - currentCount,
          canCreate: currentCount < limit,
          reason: currentCount >= limit ? 'Limit reached or exceeded' : 'Within limit'
        }
      });
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
    console.error('Error validating plan limits:', error);
    
    // ✅ FIX: If it's a Prisma error (database issue), don't treat as plan limit exceeded
    // This prevents false PLAN_LIMIT_EXCEEDED errors when database is unavailable
    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as any).name;
      if (errorName === 'PrismaClientInitializationError' || 
          errorName === 'PrismaClientKnownRequestError' ||
          errorName === 'PrismaClientUnknownRequestError' ||
          errorName === 'PrismaClientRustPanicError' ||
          errorName === 'PrismaClientValidationError') {
        console.error('❌ Prisma database error detected, not a plan limit issue:', errorName);
        // Re-throw as internal server error to indicate database issue, not plan limit
        throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
      }
    }
    
    // For other errors, also throw as internal server error
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Validate platform access for merchant
 */
export function validatePlatformAccess(
  merchantId: number,
  platform: 'mobile' | 'web',
  planInfo: PlanLimitsInfo
): boolean {
  switch (platform) {
    case 'mobile':
      return planInfo.platformAccess.mobile;
    case 'web':
      return planInfo.platformAccess.web;
    default:
      return false;
  }
}

/**
 * Validate product public check access
 */
export function validateProductPublicCheckAccess(planInfo: PlanLimitsInfo): boolean {
  return planInfo.platformAccess.productPublicCheck;
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

/**
 * Validate if deleting a plan limit addon would cause limit exceeded
 * 
 * This function checks if the merchant's current entity counts would exceed
 * the limits after removing the addon. If so, deletion should be prevented.
 * 
 * @param merchantId - Merchant ID
 * @param addonToRemove - The addon limits that will be removed
 * @returns Object with validation result and exceeded limits details
 */
export async function validateAddonDeletion(
  merchantId: number,
  addonToRemove: {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
  }
): Promise<{
  isValid: boolean;
  exceededLimits?: Array<{
    entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders';
    current: number;
    futureLimit: number;
  }>;
  currentCounts?: {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
  };
  futureLimits?: {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
  };
}> {
  try {
    console.log(`🔍 validateAddonDeletion called:`, {
      merchantId,
      addonToRemove
    });

    // Get current plan limits (with all active addons)
    const currentPlanInfo = await getPlanLimitsInfo(merchantId);
    const currentCounts = currentPlanInfo.currentCounts;

    // ✅ FIX: Get base plan limits (before addons) to calculate correctly
    // Current planLimits = base plan + all active addons
    // Future planLimits = base plan + (all active addons - addonToRemove)
    // Use basePlanLimits if available, otherwise fallback to planLimits (shouldn't happen but safe)
    const baseLimits = currentPlanInfo.basePlanLimits || currentPlanInfo.planLimits;
    
    // Calculate future limits: current total - addon to remove
    // Only subtract if addon is actually contributing to current limit
    const calculateFutureLimit = (currentTotalLimit: number, addonValue: number, baseLimit: number): number => {
      // If base limit is unlimited (-1), future limit stays unlimited
      if (baseLimit === -1) return -1;
      
      // If current total is unlimited, future stays unlimited
      if (currentTotalLimit === -1) return -1;
      
      // Future = current total - addon value
      // Ensure it doesn't go below base plan limit
      const future = currentTotalLimit - addonValue;
      return Math.max(baseLimit, future);
    };

    const futureLimits = {
      outlets: calculateFutureLimit(
        currentPlanInfo.planLimits.outlets, 
        addonToRemove.outlets,
        baseLimits.outlets
      ),
      users: calculateFutureLimit(
        currentPlanInfo.planLimits.users, 
        addonToRemove.users,
        baseLimits.users
      ),
      products: calculateFutureLimit(
        currentPlanInfo.planLimits.products, 
        addonToRemove.products,
        baseLimits.products
      ),
      customers: calculateFutureLimit(
        currentPlanInfo.planLimits.customers, 
        addonToRemove.customers,
        baseLimits.customers
      ),
      orders: calculateFutureLimit(
        currentPlanInfo.planLimits.orders, 
        addonToRemove.orders,
        baseLimits.orders
      ),
    };

    // Check if any entity type would exceed limits after deletion
    const exceededLimits: Array<{
      entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders';
      current: number;
      futureLimit: number;
    }> = [];

    const entityTypes: Array<'outlets' | 'users' | 'products' | 'customers' | 'orders'> = [
      'outlets',
      'users',
      'products',
      'customers',
      'orders',
    ];

    for (const entityType of entityTypes) {
      const currentCount = currentCounts[entityType];
      const futureLimit = futureLimits[entityType];

      // Skip if unlimited (-1)
      if (futureLimit === -1) continue;

      // Check if current count exceeds future limit
      if (currentCount > futureLimit) {
        exceededLimits.push({
          entityType,
          current: currentCount,
          futureLimit,
        });
      }
    }

    const isValid = exceededLimits.length === 0;

    console.log(`🔍 validateAddonDeletion result:`, {
      merchantId,
      isValid,
      exceededLimits: exceededLimits.length > 0 ? exceededLimits : undefined,
      currentCounts,
      futureLimits,
      currentLimits: currentPlanInfo.planLimits,
    });

    return {
      isValid,
      exceededLimits: exceededLimits.length > 0 ? exceededLimits : undefined,
      currentCounts,
      futureLimits,
    };
  } catch (error) {
    console.error('Error validating addon deletion:', error);
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Check plan limits for a specific entity type (DRY helper)
 * Returns NextResponse if limit exceeded, null if OK or ADMIN bypass
 * 
 * Usage in API routes:
 * ```typescript
 * const planLimitError = await checkPlanLimitIfNeeded(user, merchantId, 'customers');
 * if (planLimitError) return planLimitError;
 * ```
 * 
 * @param user - Authenticated user (to check if ADMIN)
 * @param merchantId - Merchant ID to check limits for
 * @param entityType - Type of entity being created
 * @returns NextResponse if limit exceeded, null if OK
 */
export async function checkPlanLimitIfNeeded(
  user: { role: string },
  merchantId: number,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<any | null> {
  console.log(`🔍 checkPlanLimitIfNeeded called:`, {
    userRole: user.role,
    merchantId,
    entityType
  });

  // ADMIN users bypass plan limit checks
  if (user.role === USER_ROLE.ADMIN) {
    console.log(`✅ ADMIN user: Bypassing plan limit check for ${entityType}`);
    return null;
  }

  try {
    await assertPlanLimit(merchantId, entityType);
    console.log(`✅ Plan limit check passed for ${entityType} (merchantId: ${merchantId})`);
    return null;
  } catch (error: any) {
    // ✅ FIX: Check if error is actually a plan limit error or a database error
    // If it's a database error (Prisma), don't return PLAN_LIMIT_EXCEEDED
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as any).code;
      
      // If it's INTERNAL_SERVER_ERROR (from Prisma/database issues), re-throw it
      // Don't mask database errors as plan limit errors
      if (errorCode === 'INTERNAL_SERVER_ERROR') {
        console.error(`❌ Database error during plan limit check (not a plan limit issue):`, {
          merchantId,
          entityType,
          errorMessage: error.message,
          errorName: error.name
        });
        // Re-throw to let the API route handle it as a 500 error
        throw error;
      }
    }
    
    // Only return PLAN_LIMIT_EXCEEDED if it's actually a plan limit error
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'PLAN_LIMIT_EXCEEDED') {
      console.log(`❌ Plan limit exceeded for ${entityType} (merchantId: ${merchantId}):`, error.message);
      const { ResponseBuilder, getErrorStatusCode } = await import('../api/response-builder');
      
      // Use error code only - translation system will handle the message
      // Don't pass detailed message to preserve translation
      const errorResponse = ResponseBuilder.error('PLAN_LIMIT_EXCEEDED');
      const statusCode = getErrorStatusCode({ code: 'PLAN_LIMIT_EXCEEDED' }, 422);
      
      // ✅ Log response format for debugging translation
      console.log('🔍 Plan limit error response:', {
        code: errorResponse.code,
        message: errorResponse.message,
        error: errorResponse.error,
        statusCode,
        note: 'Frontend should use code field for translation'
      });
      
      // Dynamic import NextResponse to avoid build-time errors
      const { NextResponse } = await import('next/server');
      return NextResponse.json(errorResponse, { status: statusCode });
    }
    
    // For any other error, re-throw it (don't mask as plan limit error)
    console.error(`❌ Unexpected error during plan limit check:`, {
      merchantId,
      entityType,
      error: error,
      errorMessage: error?.message,
      errorName: error?.name
    });
    throw error;
  }
}