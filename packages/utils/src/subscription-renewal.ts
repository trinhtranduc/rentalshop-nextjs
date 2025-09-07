// ============================================================================
// SUBSCRIPTION RENEWAL AUTOMATION
// ============================================================================

import { 
  getExpiredSubscriptions, 
  getSubscriptionByPublicId,
  updateSubscription,
  createSubscriptionPayment 
} from '@rentalshop/database';
import { createPaymentGatewayManager, PaymentGatewayConfig } from './payment-gateways';
import { Subscription, SubscriptionStatus } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface RenewalConfig {
  paymentGateway: PaymentGatewayConfig;
  autoRenewEnabled: boolean;
  gracePeriodDays: number;
  retryAttempts: number;
  retryDelayHours: number;
}

export interface RenewalResult {
  subscriptionId: number;
  success: boolean;
  status: string;
  error?: string;
  paymentId?: number;
  nextBillingDate?: Date;
}

export interface RenewalStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
}

// ============================================================================
// SUBSCRIPTION RENEWAL MANAGER
// ============================================================================

export class SubscriptionRenewalManager {
  private config: RenewalConfig;
  private paymentManager: any;

  constructor(config: RenewalConfig) {
    this.config = config;
    this.paymentManager = createPaymentGatewayManager(config.paymentGateway);
  }

  // ============================================================================
  // MAIN RENEWAL PROCESS
  // ============================================================================

  async processRenewals(): Promise<RenewalStats> {
    const stats: RenewalStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      console.log('🔄 Starting subscription renewal process...');

      // Get expired subscriptions
      const expiredSubscriptions = await getExpiredSubscriptions();
      stats.totalProcessed = expiredSubscriptions.length;

      console.log(`📊 Found ${expiredSubscriptions.length} expired subscriptions`);

      // Process each subscription
      for (const subscription of expiredSubscriptions) {
        try {
          const result = await this.processSubscriptionRenewal(subscription);
          
          if (result.success) {
            stats.successful++;
            console.log(`✅ Successfully renewed subscription ${subscription.id}`);
          } else {
            stats.failed++;
            console.log(`❌ Failed to renew subscription ${subscription.id}: ${result.error}`);
            stats.errors.push(`Subscription ${subscription.id}: ${result.error}`);
          }
        } catch (error) {
          stats.failed++;
          const errorMsg = `Subscription ${subscription.id}: ${error}`;
          console.error(`❌ Error processing subscription ${subscription.id}:`, error);
          stats.errors.push(errorMsg);
        }
      }

      console.log('✅ Subscription renewal process completed:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error in subscription renewal process:', error);
      stats.errors.push(`Process error: ${error}`);
      return stats;
    }
  }

  // ============================================================================
  // INDIVIDUAL SUBSCRIPTION RENEWAL
  // ============================================================================

  private async processSubscriptionRenewal(subscription: Subscription): Promise<RenewalResult> {
    try {
      // Check if auto-renewal is enabled
      if (!subscription.autoRenew) {
        return {
          subscriptionId: subscription.id,
          success: false,
          status: 'SKIPPED',
          error: 'Auto-renewal is disabled'
        };
      }

      // Check if subscription is actually expired
      const now = new Date();
      const isExpired = subscription.endDate && new Date(subscription.endDate) < now;
      
      if (!isExpired) {
        return {
          subscriptionId: subscription.id,
          success: false,
          status: 'SKIPPED',
          error: 'Subscription is not expired'
        };
      }

      // Check grace period
      const gracePeriodEnd = new Date(subscription.endDate!.getTime() + (this.config.gracePeriodDays * 24 * 60 * 60 * 1000));
      if (now > gracePeriodEnd) {
        return {
          subscriptionId: subscription.id,
          success: false,
          status: 'SKIPPED',
          error: 'Grace period exceeded'
        };
      }

      // Process payment
      const paymentResult = await this.processRenewalPayment(subscription);
      
      if (!paymentResult.success) {
        return {
          subscriptionId: subscription.id,
          success: false,
          status: 'FAILED',
          error: paymentResult.error
        };
      }

      // Calculate new billing period
      const newEndDate = this.calculateNewBillingDate(subscription);
      const nextBillingDate = new Date(newEndDate);

      // Update subscription
      await updateSubscription(subscription.id, {
        status: 'ACTIVE',
        endDate: newEndDate,
        nextBillingDate: nextBillingDate
      });

      // Create payment record
      const paymentRecord = await createSubscriptionPayment({
        subscriptionId: subscription.id,
        amount: subscription.amount,
        currency: subscription.currency,
        method: 'AUTO_RENEWAL',
        status: 'COMPLETED',
        transactionId: paymentResult.transactionId,
        description: `Auto-renewal payment for ${subscription.plan?.name}`,
        failureReason: undefined
      });

      return {
        subscriptionId: subscription.id,
        success: true,
        status: 'RENEWED',
        paymentId: paymentRecord.id,
        nextBillingDate: nextBillingDate
      };
    } catch (error) {
      return {
        subscriptionId: subscription.id,
        success: false,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // PAYMENT PROCESSING
  // ============================================================================

  private async processRenewalPayment(subscription: Subscription): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    try {
      // For now, we'll simulate a successful payment
      // In a real implementation, you would:
      // 1. Get the customer's saved payment method
      // 2. Process the payment through the payment gateway
      // 3. Handle payment failures and retries

      const transactionId = `RENEWAL_${subscription.id}_${Date.now()}`;
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate 90% success rate for demo purposes
      const success = Math.random() > 0.1;

      if (success) {
        return {
          success: true,
          transactionId
        };
      } else {
        return {
          success: false,
          error: 'Payment failed - insufficient funds'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing error'
      };
    }
  }

  // ============================================================================
  // BILLING CALCULATIONS
  // ============================================================================

  private calculateNewBillingDate(subscription: Subscription): Date {
    const currentEndDate = subscription.endDate || new Date();
    const billingCycle = subscription.billingCycle;

    let monthsToAdd = 1; // Default to monthly

    switch (billingCycle) {
      case 'monthly':
        monthsToAdd = 1;
        break;
      case 'quarterly':
        monthsToAdd = 3;
        break;
      case 'semi_annual':
        monthsToAdd = 6;
        break;
      case 'annual':
        monthsToAdd = 12;
        break;
      default:
        monthsToAdd = 1;
    }

    const newDate = new Date(currentEndDate);
    newDate.setMonth(newDate.getMonth() + monthsToAdd);

    return newDate;
  }

  // ============================================================================
  // MANUAL RENEWAL
  // ============================================================================

  async renewSubscriptionManually(
    subscriptionId: number,
    paymentMethod: string = 'MANUAL_RENEWAL'
  ): Promise<RenewalResult> {
    try {
      const subscription = await getSubscriptionByPublicId(subscriptionId);
      if (!subscription) {
        return {
          subscriptionId,
          success: false,
          status: 'ERROR',
          error: 'Subscription not found'
        };
      }

      // Calculate new billing period
      const newEndDate = this.calculateNewBillingDate(subscription);
      const nextBillingDate = new Date(newEndDate);

      // Update subscription
      await updateSubscription(subscriptionId, {
        status: 'ACTIVE',
        endDate: newEndDate,
        nextBillingDate: nextBillingDate
      });

      // Create payment record
      const paymentRecord = await createSubscriptionPayment({
        subscriptionId: subscriptionId,
        amount: subscription.amount,
        currency: subscription.currency,
        method: paymentMethod,
        status: 'COMPLETED',
        transactionId: `MANUAL_${subscriptionId}_${Date.now()}`,
        description: `Manual renewal for ${subscription.plan?.name}`,
        failureReason: undefined
      });

      return {
        subscriptionId,
        success: true,
        status: 'RENEWED',
        paymentId: paymentRecord.id,
        nextBillingDate: nextBillingDate
      };
    } catch (error) {
      return {
        subscriptionId,
        success: false,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  updateConfig(newConfig: Partial<RenewalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.paymentManager = createPaymentGatewayManager(this.config.paymentGateway);
  }

  getConfig(): RenewalConfig {
    return { ...this.config };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createSubscriptionRenewalManager(config: RenewalConfig): SubscriptionRenewalManager {
  return new SubscriptionRenewalManager(config);
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_RENEWAL_CONFIG: RenewalConfig = {
  paymentGateway: {
    defaultGateway: 'STRIPE'
  },
  autoRenewEnabled: true,
  gracePeriodDays: 7,
  retryAttempts: 3,
  retryDelayHours: 24
};
