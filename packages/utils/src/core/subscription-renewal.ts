// ============================================================================
// REFACTORED SUBSCRIPTION RENEWAL SYSTEM
// ============================================================================

import { 
  getExpiredSubscriptions, 
  getSubscriptionById,
  updateSubscription,
  createSubscriptionPayment 
} from '@rentalshop/database';
import { createPaymentGatewayManager, PaymentGatewayConfig } from './payment-gateways';
import { Subscription, SubscriptionStatus } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionRenewalConfig {
  paymentGateway: PaymentGatewayConfig;
  autoRenewEnabled: boolean;
  gracePeriodDays: number;
  retryAttempts: number;
  retryDelayHours: number;
}

export interface SubscriptionRenewalResult {
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
// BILLING CALCULATOR
// ============================================================================

export class BillingCalculator {
  /**
   * Calculate new billing date based on subscription interval
   */
  calculateNewBillingDate(subscription: Subscription): Date {
    const currentEndDate = subscription.currentPeriodEnd || new Date();
    const billingInterval = subscription.billingInterval;

    let monthsToAdd = 1; // Default to monthly

    switch (billingInterval) {
      case 'month':
        monthsToAdd = 1;
        break;
      case 'quarter':
        monthsToAdd = 3;
        break;
      case 'semiAnnual':
        monthsToAdd = 6;
        break;
      case 'year':
        monthsToAdd = 12;
        break;
      default:
        monthsToAdd = 1;
    }

    const newDate = new Date(currentEndDate);
    newDate.setMonth(newDate.getMonth() + monthsToAdd);

    return newDate;
  }

  /**
   * Check if subscription is expired
   */
  isSubscriptionExpired(subscription: Subscription): boolean {
    const now = new Date();
    return subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) < now : false;
  }

  /**
   * Check if grace period is exceeded
   */
  isGracePeriodExceeded(subscription: Subscription, gracePeriodDays: number): boolean {
    const now = new Date();
    const gracePeriodEnd = new Date(
      subscription.currentPeriodEnd!.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000)
    );
    return now > gracePeriodEnd;
  }
}

// ============================================================================
// PAYMENT PROCESSOR
// ============================================================================

export class PaymentProcessor {
  private paymentManager: any;

  constructor(paymentGateway: PaymentGatewayConfig) {
    this.paymentManager = createPaymentGatewayManager(paymentGateway);
  }

  /**
   * Process renewal payment
   */
  async processRenewalPayment(subscription: Subscription): Promise<{
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

  /**
   * Create payment record
   */
  async createPaymentRecord(subscription: Subscription, transactionId: string, method: string = 'AUTO_RENEWAL') {
    return await createSubscriptionPayment({
      subscriptionId: subscription.id,
      amount: subscription.amount,
      currency: subscription.plan.currency,
      method: method,
      status: 'COMPLETED',
      transactionId: transactionId,
      description: `Auto-renewal payment for ${subscription.plan?.name}`,
      failureReason: undefined
    });
  }
}

// ============================================================================
// SUBSCRIPTION VALIDATOR
// ============================================================================

export class SubscriptionValidator {
  /**
   * Validate if subscription can be renewed
   */
  validateForRenewal(subscription: Subscription, gracePeriodDays: number): {
    canRenew: boolean;
    reason?: string;
  } {
    // Check if subscription is active
    if (subscription.status !== 'active') {
      return {
        canRenew: false,
        reason: 'Subscription is not active'
      };
    }

    // Check if subscription is expired
    const now = new Date();
    const isExpired = subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now;
    
    if (!isExpired) {
      return {
        canRenew: false,
        reason: 'Subscription is not expired'
      };
    }

    // Check grace period
    const gracePeriodEnd = new Date(subscription.currentPeriodEnd!.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000));
    if (now > gracePeriodEnd) {
      return {
        canRenew: false,
        reason: 'Grace period exceeded'
      };
    }

    return { canRenew: true };
  }
}

// ============================================================================
// RENEWAL PROCESSOR
// ============================================================================

export class RenewalProcessor {
  private billingCalculator: BillingCalculator;
  private paymentProcessor: PaymentProcessor;
  private validator: SubscriptionValidator;

  constructor(config: SubscriptionRenewalConfig) {
    this.billingCalculator = new BillingCalculator();
    this.paymentProcessor = new PaymentProcessor(config.paymentGateway);
    this.validator = new SubscriptionValidator();
  }

  /**
   * Process individual subscription renewal
   */
  async processSubscriptionRenewal(subscription: Subscription, config: SubscriptionRenewalConfig): Promise<SubscriptionRenewalResult> {
    try {
      // Validate subscription
      const validation = this.validator.validateForRenewal(subscription, config.gracePeriodDays);
      if (!validation.canRenew) {
        return {
          subscriptionId: subscription.id,
          success: false,
          status: 'SKIPPED',
          error: validation.reason
        };
      }

      // Process payment
      const paymentResult = await this.paymentProcessor.processRenewalPayment(subscription);
      
      if (!paymentResult.success) {
        return {
          subscriptionId: subscription.id,
          success: false,
          status: 'FAILED',
          error: paymentResult.error
        };
      }

      // Calculate new billing period
      const newEndDate = this.billingCalculator.calculateNewBillingDate(subscription);
      const nextBillingDate = new Date(newEndDate);

      // Update subscription
      await updateSubscription(subscription.id, {
        status: 'active',
        currentPeriodEnd: newEndDate
      });

      // Create payment record
      const paymentRecord = await this.paymentProcessor.createPaymentRecord(
        subscription, 
        paymentResult.transactionId!
      );

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
}

// ============================================================================
// MAIN RENEWAL MANAGER (SIMPLIFIED)
// ============================================================================

export class SubscriptionRenewalManager {
  private config: SubscriptionRenewalConfig;
  private renewalProcessor: RenewalProcessor;

  constructor(config: SubscriptionRenewalConfig) {
    this.config = config;
    this.renewalProcessor = new RenewalProcessor(config);
  }

  /**
   * Process all expired subscriptions
   */
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
          const result = await this.renewalProcessor.processSubscriptionRenewal(subscription, this.config);
          
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

  /**
   * Manual renewal
   */
  async renewSubscriptionManually(
    subscriptionId: number,
    paymentMethod: string = 'MANUAL_RENEWAL'
  ): Promise<SubscriptionRenewalResult> {
    try {
      const subscription = await getSubscriptionById(subscriptionId);
      if (!subscription) {
        return {
          subscriptionId,
          success: false,
          status: 'ERROR',
          error: 'Subscription not found'
        };
      }

      // Calculate new billing period
      const billingCalculator = new BillingCalculator();
      const newEndDate = billingCalculator.calculateNewBillingDate(subscription);
      const nextBillingDate = new Date(newEndDate);

      // Update subscription
      await updateSubscription(subscriptionId, {
        status: 'active',
        currentPeriodEnd: newEndDate
      });

      // Create payment record
      const paymentProcessor = new PaymentProcessor(this.config.paymentGateway);
      const paymentRecord = await paymentProcessor.createPaymentRecord(
        subscription, 
        `MANUAL_${subscriptionId}_${Date.now()}`,
        paymentMethod
      );

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

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SubscriptionRenewalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.renewalProcessor = new RenewalProcessor(this.config);
  }

  getConfig(): SubscriptionRenewalConfig {
    return { ...this.config };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createSubscriptionRenewalManager(config: SubscriptionRenewalConfig): SubscriptionRenewalManager {
  return new SubscriptionRenewalManager(config);
}

export function createBillingCalculator(): BillingCalculator {
  return new BillingCalculator();
}

export function createPaymentProcessor(paymentGateway: PaymentGatewayConfig): PaymentProcessor {
  return new PaymentProcessor(paymentGateway);
}

export function createSubscriptionValidator(): SubscriptionValidator {
  return new SubscriptionValidator();
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_RENEWAL_CONFIG: SubscriptionRenewalConfig = {
  paymentGateway: {
    provider: 'stripe',
    apiKey: 'sk_test_mock_key',
    environment: 'sandbox',
    defaultGateway: 'STRIPE'
  },
  autoRenewEnabled: true,
  gracePeriodDays: 7,
  retryAttempts: 3,
  retryDelayHours: 24
};
