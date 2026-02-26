// ============================================================================
// PLATFORM ACCESS VALIDATION
// ============================================================================
// Functions for validating platform access permissions

import type { PlanLimitsInfo } from '../validation-schemas';

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
