// ============================================================================
// PLAN LIMITS VALIDATION
// ============================================================================

import { prisma } from '@rentalshop/database';
import { ApiError } from '@rentalshop/errors';
import { API, PlanLimits, getPlan, hasWebAccess, hasMobileAccess, getPlanPlatform, hasProductPublicCheck } from '@rentalshop/constants';
import { AuthUser } from '@rentalshop/types';

export interface PlanLimitsValidationResult {
  isValid: boolean;
  error?: string;
  currentCount: number;
  limit: number;
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders';
}

export interface PlanLimitsInfo {
  planLimits: PlanLimits;
  platform: 'mobile' | 'mobile+web';
  currentCounts: {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
  };
  isUnlimited: {
    outlets: boolean;
    users: boolean;
    products: boolean;
    customers: boolean;
    orders: boolean;
  };
  platformAccess: {
    mobile: boolean;
    web: boolean;
    productPublicCheck: boolean;
  };
}

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
    const [outletsCount, usersCount, productsCount, customersCount, ordersCount] = await Promise.all([
      // Count outlets for this merchant
      prisma.outlet.count({
        where: { merchantId }
      }),
      
      // Count users for this merchant (excluding ADMIN users)
      prisma.user.count({
        where: { 
          merchantId,
          role: { not: 'ADMIN' }
        }
      }),
      
      // Count products for this merchant
      prisma.product.count({
        where: { merchantId }
      }),
      
      // Count customers for this merchant
      prisma.customer.count({
        where: { merchantId }
      }),
      
      // Count orders for this merchant (through outlets)
      prisma.order.count({
        where: {
          outlet: { merchantId }
        }
      })
    ]);

    return {
      outlets: outletsCount,
      users: usersCount,
      products: productsCount,
      customers: customersCount,
      orders: ordersCount
    };
  } catch (error) {
    console.error('Error getting current entity counts:', error);
    throw new ApiError(500, 'Failed to get current entity counts', 'ENTITY_COUNT_ERROR');
  }
}

/**
 * Get plan limits and current counts for a merchant
 */
export async function getPlanLimitsInfo(merchantId: number): Promise<PlanLimitsInfo> {
  try {
    // Get merchant with subscription and plan
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        subscription: {
          include: {
            plan: {
              select: {
                name: true,
                limits: true
              }
            }
          }
        }
      }
    });

    if (!merchant?.subscription?.plan) {
      throw new ApiError(404, 'No active subscription found', 'SUBSCRIPTION_NOT_FOUND');
    }

    // Get plan configuration from new pay-per-use model
    const planId = merchant.subscription.plan.name.toLowerCase();
    const planConfig = getPlan(planId);
    
    if (!planConfig) {
      throw new ApiError(404, `Plan configuration not found for plan: ${planId}`, 'PLAN_CONFIG_NOT_FOUND');
    }

    // Use plan limits from simple model
    const planLimits = planConfig.limits;
    const platform = planConfig.platform;

    // Get current counts
    const currentCounts = await getCurrentEntityCounts(merchantId);

    // Check if unlimited (-1 means unlimited)
    const isUnlimited = {
      outlets: planLimits.outlets === -1,
      users: planLimits.users === -1,
      products: planLimits.products === -1,
      customers: planLimits.customers === -1,
      orders: planLimits.orders === -1
    };

    // Platform access
    const platformAccess = {
      mobile: hasMobileAccess(planId),
      web: hasWebAccess(planId),
      productPublicCheck: hasProductPublicCheck(planId)
    };

    return {
      planLimits,
      platform,
      currentCounts,
      isUnlimited,
      platformAccess
    };
  } catch (error) {
    console.error('Error getting plan limits info:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to get plan limits info', 'PLAN_LIMITS_ERROR');
  }
}

/**
 * Validate if merchant can create a new entity based on plan limits
 */
export async function validatePlanLimit(
  merchantId: number,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<PlanLimitsValidationResult> {
  try {
    const planInfo = await getPlanLimitsInfo(merchantId);
    
    const limit = planInfo.planLimits[entityType];
    const currentCount = planInfo.currentCounts[entityType];
    const isUnlimited = planInfo.isUnlimited[entityType];

    // If unlimited (-1), always allow
    if (isUnlimited) {
      return {
        isValid: true,
        currentCount,
        limit: -1,
        entityType
      };
    }

    // Check if limit would be exceeded
    if (currentCount >= limit) {
      return {
        isValid: false,
        error: `Plan limit exceeded. You have reached the maximum limit of ${limit} ${entityType}. Current: ${currentCount}/${limit}. Please upgrade your plan to create more ${entityType}.`,
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
    console.error('Error validating plan limit:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to validate plan limit', 'PLAN_LIMIT_VALIDATION_ERROR');
  }
}

/**
 * Validate plan limits for multiple entity types at once
 */
export async function validateMultiplePlanLimits(
  merchantId: number,
  entityTypes: Array<'outlets' | 'users' | 'products' | 'customers' | 'orders'>
): Promise<{
  isValid: boolean;
  results: PlanLimitsValidationResult[];
  errors: string[];
}> {
  try {
    const results = await Promise.all(
      entityTypes.map(entityType => validatePlanLimit(merchantId, entityType))
    );

    const errors = results
      .filter(result => !result.isValid)
      .map(result => result.error)
      .filter(Boolean) as string[];

    return {
      isValid: errors.length === 0,
      results,
      errors
    };
  } catch (error) {
    console.error('Error validating multiple plan limits:', error);
    throw new ApiError(500, 'Failed to validate plan limits', 'PLAN_LIMITS_VALIDATION_ERROR');
  }
}

/**
 * Throw error if plan limit is exceeded
 */
export async function assertPlanLimit(
  merchantId: number,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<void> {
  const validation = await validatePlanLimit(merchantId, entityType);
  
  if (!validation.isValid) {
    throw new ApiError(API.STATUS.FORBIDDEN,
      validation.error || `Plan limit exceeded for ${entityType}`,
      'PLAN_LIMIT_EXCEEDED'
    );
  }
}

/**
 * Check if user can perform operation based on plan limits
 */
export async function canCreateEntity(
  user: AuthUser,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<boolean> {
  try {
    if (!user.merchantId) {
      return false;
    }

    const validation = await validatePlanLimit(user.merchantId, entityType);
    return validation.isValid;
  } catch (error) {
    console.error('Error checking if user can create entity:', error);
    return false;
  }
}

/**
 * Get plan limits summary for display
 */
export async function getPlanLimitsSummary(merchantId: number): Promise<{
  planName: string;
  limits: PlanLimits;
  currentCounts: {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
  };
  usage: {
    outlets: { used: number; limit: number; percentage: number; unlimited: boolean };
    users: { used: number; limit: number; percentage: number; unlimited: boolean };
    products: { used: number; limit: number; percentage: number; unlimited: boolean };
    customers: { used: number; limit: number; percentage: number; unlimited: boolean };
    orders: { used: number; limit: number; percentage: number; unlimited: boolean };
  };
}> {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        subscription: {
          include: {
            plan: {
              select: {
                name: true,
                limits: true
              }
            }
          }
        }
      }
    });

    if (!merchant?.subscription?.plan) {
      throw new ApiError(404, 'No active subscription found', 'SUBSCRIPTION_NOT_FOUND');
    }

    const planLimits: PlanLimits = typeof merchant.subscription.plan.limits === 'string' 
      ? JSON.parse(merchant.subscription.plan.limits)
      : merchant.subscription.plan.limits;

    const currentCounts = await getCurrentEntityCounts(merchantId);

    // Calculate usage percentages
    const calculateUsage = (used: number, limit: number) => {
      if (limit === -1) {
        return { used, limit: -1, percentage: 0, unlimited: true };
      }
      const percentage = Math.round((used / limit) * 100);
      return { used, limit, percentage, unlimited: false };
    };

    return {
      planName: merchant.subscription.plan.name,
      limits: planLimits,
      currentCounts,
      usage: {
        outlets: calculateUsage(currentCounts.outlets, planLimits.outlets),
        users: calculateUsage(currentCounts.users, planLimits.users),
        products: calculateUsage(currentCounts.products, planLimits.products),
        customers: calculateUsage(currentCounts.customers, planLimits.customers),
        orders: calculateUsage(currentCounts.orders, -1), // Orders are typically unlimited
      }
    };
  } catch (error) {
    console.error('Error getting plan limits summary:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to get plan limits summary', 'PLAN_LIMITS_SUMMARY_ERROR');
  }
}

/**
 * Check if plan supports a specific feature
 */
export async function checkPlanFeature(
  merchantId: number,
  feature: string
): Promise<boolean> {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        subscription: {
          include: {
            plan: {
              select: {
                features: true
              }
            }
          }
        }
      }
    });

    if (!merchant?.subscription?.plan) {
      return false;
    }

    const features = typeof merchant.subscription.plan.features === 'string'
      ? JSON.parse(merchant.subscription.plan.features)
      : merchant.subscription.plan.features;

    return features.includes(feature);
  } catch (error) {
    console.error('Error checking plan feature:', error);
    return false;
  }
}

/**
 * Check if user can access a specific platform (web/mobile)
 */
export async function validatePlatformAccess(
  merchantId: number,
  platform: 'web' | 'mobile'
): Promise<{ hasAccess: boolean; error?: string }> {
  try {
    const planInfo = await getPlanLimitsInfo(merchantId);
    
    if (platform === 'web' && !planInfo.platformAccess.web) {
      return {
        hasAccess: false,
        error: 'Web dashboard access is not included in your current plan. Please upgrade to Professional or Enterprise plan to access the web dashboard.'
      };
    }
    
    if (platform === 'mobile' && !planInfo.platformAccess.mobile) {
      return {
        hasAccess: false,
        error: 'Mobile app access is not available for your current plan.'
      };
    }
    
    return { hasAccess: true };
  } catch (error) {
    console.error('Error validating platform access:', error);
    return {
      hasAccess: false,
      error: 'Unable to validate platform access'
    };
  }
}

/**
 * Get upgrade suggestions based on current usage
 */
export async function getUpgradeSuggestions(merchantId: number): Promise<{
  needsUpgrade: boolean;
  suggestions: Array<{
    entityType: 'outlets' | 'users' | 'products' | 'customers';
    currentUsage: number;
    limit: number;
    percentage: number;
    suggestion: string;
    suggestedPlan: string | null;
  }>;
}> {
  try {
    const planInfo = await getPlanLimitsInfo(merchantId);
    const suggestions: Array<{
      entityType: 'outlets' | 'users' | 'products' | 'customers';
      currentUsage: number;
      limit: number;
      percentage: number;
      suggestion: string;
      suggestedPlan: string | null;
    }> = [];

    const entities: Array<'outlets' | 'users' | 'products' | 'customers'> = ['outlets', 'users', 'products', 'customers'];

    entities.forEach(entityType => {
      const limit = planInfo.planLimits[entityType];
      const current = planInfo.currentCounts[entityType];
      
      if (limit !== -1) {
        const percentage = Math.round((current / limit) * 100);
        
        if (percentage >= 80) {
          // Get upgrade suggestion using the new consolidated function
          // Use plan name from planInfo
          // Simple upgrade suggestion based on current usage
          const upgradeSuggestion = {
            message: `Consider upgrading to Professional plan for higher limits`,
            suggestedPlan: 'professional'
          };

          suggestions.push({
            entityType,
            currentUsage: current,
            limit,
            percentage,
            suggestion: upgradeSuggestion.message,
            suggestedPlan: upgradeSuggestion.suggestedPlan
          });
        }
      }
    });

    return {
      needsUpgrade: suggestions.length > 0,
      suggestions
    };
  } catch (error) {
    console.error('Error getting upgrade suggestions:', error);
    return {
      needsUpgrade: false,
      suggestions: []
    };
  }
}
