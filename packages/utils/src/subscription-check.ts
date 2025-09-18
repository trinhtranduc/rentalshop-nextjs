/**
 * Simple Subscription Status Check
 * 
 * This file provides a clean, simple way to check subscription status
 * without complex access levels or redundant logic.
 */

import { SubscriptionError, isSubscriptionError } from './errors';

/**
 * Simple subscription status check
 * Returns true if subscription is active, false otherwise
 */
export async function checkSubscriptionStatus(user: any): Promise<boolean> {
  // Admin users always have access
  if (user?.role === 'ADMIN') {
    return true;
  }

  // Users without merchant access have no access
  if (!user?.merchant?.id) {
    return false;
  }

  try {
    // Import database function dynamically to avoid circular dependencies
    const { getSubscriptionByMerchantId } = await import('@rentalshop/database');
    
    // Get merchant's subscription
    const subscription = await getSubscriptionByMerchantId(user.merchant.id);
    
    if (!subscription) {
      return false;
    }

    const status = subscription.status?.toLowerCase();
    
    // Active subscription statuses
    const activeStatuses = ['active', 'trial'];
    
    return activeStatuses.includes(status);
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Check if subscription error should be thrown
 * This is used in authenticatedFetch to determine if we should throw 402
 */
export async function shouldThrowSubscriptionError(user: any): Promise<boolean> {
  if (user?.role === 'ADMIN') {
    return false; // Admin users never get subscription errors
  }

  if (!user?.merchant?.id) {
    return false; // No merchant = no subscription check needed
  }

  try {
    const { getSubscriptionByMerchantId } = await import('@rentalshop/database');
    const subscription = await getSubscriptionByMerchantId(user.merchant.id);
    
    if (!subscription) {
      return true; // No subscription = should throw error
    }

    const status = subscription.status?.toLowerCase();
    
    // Statuses that should throw subscription error (402)
    const errorStatuses = ['expired', 'cancelled', 'paused', 'suspended', 'past_due'];
    
    return errorStatuses.includes(status);
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return true; // On error, assume subscription issue
  }
}

/**
 * Get subscription error for a user
 * Returns SubscriptionError if user has subscription issues
 */
export async function getSubscriptionError(user: any): Promise<SubscriptionError | null> {
  if (user?.role === 'ADMIN') {
    return null; // Admin users never get subscription errors
  }

  if (!user?.merchant?.id) {
    return null; // No merchant = no subscription check needed
  }

  try {
    const { getSubscriptionByMerchantId } = await import('@rentalshop/database');
    
    // Handle both CUID string (from database) and publicId number (from transformed user)
    let merchantId: number;
    if (typeof user.merchant.id === 'string') {
      // If it's a CUID string, we need to find the publicId
      const { prisma } = await import('@rentalshop/database');
      const merchant = await prisma.merchant.findUnique({
        where: { id: user.merchant.id },
        select: { publicId: true }
      });
      if (!merchant) {
        console.log('🔍 SUBSCRIPTION CHECK: Merchant not found for CUID:', user.merchant.id);
        return SubscriptionError.fromStatus('expired');
      }
      merchantId = merchant.publicId;
    } else {
      // If it's already a number (publicId), use it directly
      merchantId = user.merchant.id;
    }
    
    console.log('🔍 SUBSCRIPTION CHECK: Using merchantId:', merchantId, 'type:', typeof merchantId);
    
    const subscription = await getSubscriptionByMerchantId(merchantId);
    
    console.log('🔍 SUBSCRIPTION CHECK: Subscription data:', {
      hasSubscription: !!subscription,
      status: subscription?.status,
      currentPeriodStart: subscription?.currentPeriodStart,
      currentPeriodEnd: subscription?.currentPeriodEnd,
      merchantId: user.merchant.id
    });
    
    if (!subscription) {
      console.log('🔍 SUBSCRIPTION CHECK: No subscription found for merchant');
      return SubscriptionError.fromStatus('expired');
    }

    const status = subscription.status?.toLowerCase();
    
    // Statuses that should throw subscription error (402)
    const errorStatuses = ['expired', 'cancelled', 'paused', 'suspended', 'past_due'];
    
    if (errorStatuses.includes(status)) {
      console.log('🔍 SUBSCRIPTION CHECK: Subscription status is error status:', status);
      return SubscriptionError.fromStatus(status);
    }

    // Additional check: Verify subscription is not actually expired by date
    // Only check if subscription has currentPeriodEnd date
    if (subscription.currentPeriodEnd) {
      const now = new Date();
      const endDate = new Date(subscription.currentPeriodEnd);
      
      console.log('🔍 SUBSCRIPTION CHECK: Date validation:', {
        now: now.toISOString(),
        endDate: endDate.toISOString(),
        isExpired: endDate < now
      });
      
      // If subscription is past its end date, treat as expired
      if (endDate < now) {
        console.log('🔍 SUBSCRIPTION CHECK: Subscription is past end date, treating as expired');
        return SubscriptionError.fromStatus('expired');
      }
    }

    console.log('🔍 SUBSCRIPTION CHECK: Subscription is valid');
    return null; // No subscription error
  } catch (error) {
    console.error('🔍 SUBSCRIPTION CHECK: Error checking subscription status:', error);
    return SubscriptionError.fromStatus('expired'); // On error, assume expired
  }
}
