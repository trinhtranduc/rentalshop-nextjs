// ============================================================================
// ADDON DELETION VALIDATION
// ============================================================================
// Validate if deleting a plan limit addon would cause limit exceeded

import { ApiError, ErrorCode } from '../errors';
import { getPlanLimitsInfo } from './plan-limits';
import { logger } from '../logger';

export interface AddonToRemove {
  outlets: number;
  users: number;
  products: number;
  customers: number;
  orders: number;
}

export interface ExceededLimit {
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders';
  current: number;
  futureLimit: number;
}

export interface AddonDeletionValidationResult {
  isValid: boolean;
  exceededLimits?: ExceededLimit[];
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
  addonToRemove: AddonToRemove
): Promise<AddonDeletionValidationResult> {
  try {
    logger.debug({
      merchantId,
      addonToRemove
    }, 'validateAddonDeletion called');

    // Get current plan limits (with all active addons)
    const currentPlanInfo = await getPlanLimitsInfo(merchantId);
    const currentCounts = currentPlanInfo.currentCounts;

    // FIX: Get base plan limits (before addons) to calculate correctly
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
    const exceededLimits: ExceededLimit[] = [];

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

    logger.debug({
      merchantId,
      isValid,
      exceededLimits: exceededLimits.length > 0 ? exceededLimits : undefined,
      currentCounts,
      futureLimits,
      currentLimits: currentPlanInfo.planLimits,
    }, 'validateAddonDeletion result');

    return {
      isValid,
      exceededLimits: exceededLimits.length > 0 ? exceededLimits : undefined,
      currentCounts,
      futureLimits,
    };
  } catch (error) {
    logger.error({ error, merchantId }, 'Error validating addon deletion');
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
