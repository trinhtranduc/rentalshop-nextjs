// ============================================================================
// SUBSCRIPTION EXPIRY MIDDLEWARE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getExpiredSubscriptions, markSubscriptionAsExpired } from '@rentalshop/database';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionExpiryConfig {
  checkInterval: number; // Check interval in milliseconds
  gracePeriod: number;   // Grace period in days before marking as expired
  autoMarkExpired: boolean; // Whether to automatically mark expired subscriptions
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SubscriptionExpiryConfig = {
  checkInterval: 60 * 60 * 1000, // 1 hour
  gracePeriod: 0, // No grace period
  autoMarkExpired: true
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let lastCheckTime = 0;
let isChecking = false;

// ============================================================================
// SUBSCRIPTION EXPIRY CHECKER
// ============================================================================

export async function checkSubscriptionExpiry(config: SubscriptionExpiryConfig = DEFAULT_CONFIG) {
  // Prevent concurrent checks
  if (isChecking) {
    return;
  }

  const now = Date.now();
  if (now - lastCheckTime < config.checkInterval) {
    return;
  }

  try {
    isChecking = true;
    lastCheckTime = now;

    console.log('🔍 Checking for expired subscriptions...');

    // Get expired subscriptions
    const expiredSubscriptions = await getExpiredSubscriptions();
    
    if (expiredSubscriptions.length === 0) {
      console.log('✅ No expired subscriptions found');
      return;
    }

    console.log(`⚠️ Found ${expiredSubscriptions.length} expired subscriptions`);

    // Process each expired subscription
    for (const subscription of expiredSubscriptions) {
      try {
        // Check if subscription is actually expired
        const now = new Date();
        const isActuallyExpired = subscription.endDate && 
          new Date(subscription.endDate) < now;

        if (isActuallyExpired && config.autoMarkExpired) {
          // Mark as expired
          await markSubscriptionAsExpired(subscription.id);
          console.log(`✅ Marked subscription ${subscription.id} as expired`);
          
          // TODO: Send notification to merchant
          // TODO: Send notification to admin
          // TODO: Log audit event
        }
      } catch (error) {
        console.error(`❌ Error processing expired subscription ${subscription.id}:`, error);
      }
    }

    console.log('✅ Subscription expiry check completed');
  } catch (error) {
    console.error('❌ Error checking subscription expiry:', error);
  } finally {
    isChecking = false;
  }
}

// ============================================================================
// MIDDLEWARE FUNCTION
// ============================================================================

export function createSubscriptionExpiryMiddleware(config: SubscriptionExpiryConfig = DEFAULT_CONFIG) {
  return async function subscriptionExpiryMiddleware(request: NextRequest) {
    // Only check on API routes
    if (!request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // Skip certain API routes to avoid infinite loops
    const skipRoutes = [
      '/api/subscriptions/expired',
      '/api/subscriptions/extend',
      '/api/subscriptions/status'
    ];

    if (skipRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Run expiry check in background
    checkSubscriptionExpiry(config).catch(error => {
      console.error('Background subscription expiry check failed:', error);
    });

    return NextResponse.next();
  };
}

// ============================================================================
// MANUAL EXPIRY CHECK (for admin use)
// ============================================================================

export async function manualExpiryCheck() {
  try {
    console.log('🔍 Running manual subscription expiry check...');
    
    const expiredSubscriptions = await getExpiredSubscriptions();
    
    const results = {
      totalChecked: expiredSubscriptions.length,
      expiredFound: 0,
      markedAsExpired: 0,
      errors: [] as string[]
    };

    for (const subscription of expiredSubscriptions) {
      try {
        results.expiredFound++;
        
        // Mark as expired
        await markSubscriptionAsExpired(subscription.id);
        results.markedAsExpired++;
        
        console.log(`✅ Marked subscription ${subscription.id} as expired`);
      } catch (error) {
        const errorMsg = `Failed to mark subscription ${subscription.id} as expired: ${error}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log('✅ Manual expiry check completed:', results);
    return results;
  } catch (error) {
    console.error('❌ Manual expiry check failed:', error);
    throw error;
  }
}

// ============================================================================
// EXPIRY NOTIFICATION HELPERS
// ============================================================================

export async function sendExpiryNotification(subscription: any) {
  // TODO: Implement notification system
  // - Email notification to merchant
  // - In-app notification
  // - Admin notification
  console.log(`📧 Sending expiry notification for subscription ${subscription.id}`);
}

export async function sendAdminNotification(subscription: any) {
  // TODO: Implement admin notification
  console.log(`📧 Sending admin notification for expired subscription ${subscription.id}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DEFAULT_CONFIG,
  checkSubscriptionExpiry,
  createSubscriptionExpiryMiddleware,
  manualExpiryCheck,
  sendExpiryNotification,
  sendAdminNotification
};
