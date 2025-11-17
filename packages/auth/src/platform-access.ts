/**
 * Platform Access Control
 * Controls which subscription plans can access which platforms (web/mobile)
 */

import { ClientPlatform, Plan } from '@rentalshop/types';

/**
 * Platform access rules based on subscription plan
 */
export interface PlatformAccessRules {
  allowWebAccess: boolean;
  allowMobileAccess: boolean;
  restrictionMessage?: string;
}

/**
 * Check if a subscription plan allows access from a specific platform
 * 
 * Business Logic:
 * - Basic plan: Mobile only (no web access)
 * - Other plans: Both web and mobile access
 * 
 * @param plan - User's subscription plan
 * @param platform - Platform trying to access (web/mobile)
 * @returns true if access is allowed, false otherwise
 */
export function isPlatformAllowed(
  plan: Plan | null,
  platform: ClientPlatform
): boolean {
  // If no plan or unknown platform, deny access by default
  if (!plan || platform === 'unknown') {
    return false;
  }

  // Check plan limits for platform access
  const { allowWebAccess = true, allowMobileAccess = true } = plan.limits || {};

  if (platform === 'web') {
    return allowWebAccess;
  }

  if (platform === 'mobile') {
    return allowMobileAccess;
  }

  return false;
}

/**
 * Get platform access rules for a subscription plan
 * 
 * @param plan - User's subscription plan
 * @returns Platform access rules
 */
export function getPlatformAccessRules(plan: Plan | null): PlatformAccessRules {
  if (!plan) {
    return {
      allowWebAccess: false,
      allowMobileAccess: false,
      restrictionMessage: 'No active subscription plan found'
    };
  }

  const { allowWebAccess = true, allowMobileAccess = true } = plan.limits || {};

  let restrictionMessage: string | undefined;
  
  if (!allowWebAccess && !allowMobileAccess) {
    restrictionMessage = 'Your plan does not allow any platform access';
  } else if (!allowWebAccess) {
    restrictionMessage = 'Your plan does not allow web access. Please upgrade to access the web dashboard.';
  } else if (!allowMobileAccess) {
    restrictionMessage = 'Your plan does not allow mobile access.';
  }

  return {
    allowWebAccess,
    allowMobileAccess,
    restrictionMessage
  };
}

/**
 * Assert platform access - throws error if access denied
 * 
 * @param plan - User's subscription plan
 * @param platform - Platform trying to access
 * @throws Error if access is denied
 */
export function assertPlatformAccess(
  plan: Plan | null,
  platform: ClientPlatform
): void {
  if (!isPlatformAllowed(plan, platform)) {
    const rules = getPlatformAccessRules(plan);
    
    if (platform === 'web' && !rules.allowWebAccess) {
      throw new Error('Web access not allowed for your subscription plan. Please upgrade to Premium or Enterprise plan.');
    }
    
    if (platform === 'mobile' && !rules.allowMobileAccess) {
      throw new Error('Mobile access not allowed for your subscription plan.');
    }
    
    throw new Error(rules.restrictionMessage || 'Platform access denied');
  }
}

/**
 * Get user-friendly error message for platform restriction
 * 
 * @param plan - User's subscription plan
 * @param platform - Platform trying to access
 * @returns Error message or null if access allowed
 */
export function getPlatformRestrictionMessage(
  plan: Plan | null,
  platform: ClientPlatform
): string | null {
  if (isPlatformAllowed(plan, platform)) {
    return null;
  }

  if (!plan) {
    return 'No active subscription found. Please subscribe to a plan to access this platform.';
  }

  const planName = plan.name || 'Your current plan';

  if (platform === 'web') {
    return `${planName} does not include web dashboard access. Please upgrade to Premium or Enterprise plan to access the web dashboard.`;
  }

  if (platform === 'mobile') {
    return `${planName} does not include mobile app access.`;
  }

  return 'Platform access denied for your subscription plan.';
}

/**
 * Check if plan allows web access
 */
export function allowsWebAccess(plan: Plan | null): boolean {
  return isPlatformAllowed(plan, 'web');
}

/**
 * Check if plan allows mobile access
 */
export function allowsMobileAccess(plan: Plan | null): boolean {
  return isPlatformAllowed(plan, 'mobile');
}

