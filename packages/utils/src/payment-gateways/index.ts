// ============================================================================
// PAYMENT GATEWAY MANAGER
// ============================================================================

import { StripeGateway, createStripeGateway, StripeConfig } from './stripe';
import { PayPalGateway, createPayPalGateway, PayPalConfig } from './paypal';

// ============================================================================
// TYPES
// ============================================================================

export type PaymentGatewayType = 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' | 'MANUAL';

export interface PaymentGatewayConfig {
  stripe?: StripeConfig;
  paypal?: PayPalConfig;
  defaultGateway: PaymentGatewayType;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: string;
  amount: number;
  currency: string;
  gateway: PaymentGatewayType;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  status: string;
  gateway: PaymentGatewayType;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// PAYMENT GATEWAY MANAGER
// ============================================================================

export class PaymentGatewayManager {
  private stripe?: StripeGateway;
  private paypal?: PayPalGateway;
  private defaultGateway: PaymentGatewayType;

  constructor(config: PaymentGatewayConfig) {
    this.defaultGateway = config.defaultGateway;

    if (config.stripe) {
      this.stripe = createStripeGateway(config.stripe);
    }

    if (config.paypal) {
      this.paypal = createPayPalGateway(config.paypal);
    }
  }

  // ============================================================================
  // PAYMENT PROCESSING
  // ============================================================================

  async processPayment(
    amount: number,
    currency: string,
    gateway: PaymentGatewayType = this.defaultGateway,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    try {
      switch (gateway) {
        case 'STRIPE':
          if (!this.stripe) {
            throw new Error('Stripe gateway not configured');
          }
          return await this.processStripePayment(amount, currency, metadata);

        case 'PAYPAL':
          if (!this.paypal) {
            throw new Error('PayPal gateway not configured');
          }
          return await this.processPayPalPayment(amount, currency, metadata);

        case 'BANK_TRANSFER':
          return await this.processBankTransferPayment(amount, currency, metadata);

        case 'MANUAL':
          return await this.processManualPayment(amount, currency, metadata);

        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
    } catch (error) {
      console.error(`Error processing payment with ${gateway}:`, error);
      return {
        success: false,
        status: 'FAILED',
        amount,
        currency,
        gateway,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processStripePayment(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    if (!this.stripe) {
      throw new Error('Stripe gateway not configured');
    }

    const paymentIntent = await this.stripe.createPaymentIntent(
      amount,
      currency,
      metadata?.customerId,
      metadata
    );

    return {
      success: paymentIntent.status === 'succeeded',
      transactionId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      gateway: 'STRIPE',
      metadata: paymentIntent.metadata
    };
  }

  private async processPayPalPayment(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    if (!this.paypal) {
      throw new Error('PayPal gateway not configured');
    }

    const order = await this.paypal.createOrder(
      amount,
      currency,
      metadata?.description || 'RentalShop Payment',
      metadata?.returnUrl || '',
      metadata?.cancelUrl || '',
      metadata
    );

    return {
      success: order.status === 'CREATED',
      transactionId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      gateway: 'PAYPAL',
      metadata: { links: order.links }
    };
  }

  private async processBankTransferPayment(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    // Bank transfer is typically manual - just return pending status
    return {
      success: true,
      transactionId: `BANK_${Date.now()}`,
      status: 'PENDING',
      amount,
      currency,
      gateway: 'BANK_TRANSFER',
      metadata: {
        ...metadata,
        instructions: 'Please transfer the amount to our bank account',
        reference: `REF_${Date.now()}`
      }
    };
  }

  private async processManualPayment(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    // Manual payment is typically handled by admin
    return {
      success: true,
      transactionId: `MANUAL_${Date.now()}`,
      status: 'PENDING',
      amount,
      currency,
      gateway: 'MANUAL',
      metadata: {
        ...metadata,
        note: 'Payment to be processed manually by admin'
      }
    };
  }

  // ============================================================================
  // SUBSCRIPTION PROCESSING
  // ============================================================================

  async createSubscription(
    planId: string,
    customerEmail: string,
    customerName?: string,
    gateway: PaymentGatewayType = this.defaultGateway,
    metadata?: Record<string, any>
  ): Promise<SubscriptionResult> {
    try {
      switch (gateway) {
        case 'STRIPE':
          if (!this.stripe) {
            throw new Error('Stripe gateway not configured');
          }
          return await this.createStripeSubscription(planId, customerEmail, customerName, metadata);

        case 'PAYPAL':
          if (!this.paypal) {
            throw new Error('PayPal gateway not configured');
          }
          return await this.createPayPalSubscription(planId, customerEmail, customerName, metadata);

        default:
          throw new Error(`Subscription not supported for gateway: ${gateway}`);
      }
    } catch (error) {
      console.error(`Error creating subscription with ${gateway}:`, error);
      return {
        success: false,
        status: 'FAILED',
        gateway,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createStripeSubscription(
    planId: string,
    customerEmail: string,
    customerName?: string,
    metadata?: Record<string, any>
  ): Promise<SubscriptionResult> {
    if (!this.stripe) {
      throw new Error('Stripe gateway not configured');
    }

    // First create or get customer
    const customer = await this.stripe.createCustomer(customerEmail, customerName, undefined, metadata);
    
    // Create subscription
    const subscription = await this.stripe.createSubscription(
      customer.id,
      planId,
      metadata
    );

    return {
      success: subscription.status === 'active',
      subscriptionId: subscription.id,
      status: subscription.status,
      gateway: 'STRIPE',
      metadata: { customerId: customer.id }
    };
  }

  private async createPayPalSubscription(
    planId: string,
    customerEmail: string,
    customerName?: string,
    metadata?: Record<string, any>
  ): Promise<SubscriptionResult> {
    if (!this.paypal) {
      throw new Error('PayPal gateway not configured');
    }

    const subscription = await this.paypal.createSubscription(
      planId,
      customerEmail,
      customerName,
      metadata?.returnUrl,
      metadata?.cancelUrl
    );

    return {
      success: subscription.status === 'ACTIVE',
      subscriptionId: subscription.id,
      status: subscription.status,
      gateway: 'PAYPAL',
      metadata: { subscriber: subscription.subscriber }
    };
  }

  // ============================================================================
  // GATEWAY ACCESS
  // ============================================================================

  getStripeGateway(): StripeGateway | undefined {
    return this.stripe;
  }

  getPayPalGateway(): PayPalGateway | undefined {
    return this.paypal;
  }

  getDefaultGateway(): PaymentGatewayType {
    return this.defaultGateway;
  }

  isGatewayAvailable(gateway: PaymentGatewayType): boolean {
    switch (gateway) {
      case 'STRIPE':
        return !!this.stripe;
      case 'PAYPAL':
        return !!this.paypal;
      case 'BANK_TRANSFER':
      case 'MANUAL':
        return true;
      default:
        return false;
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  getAvailableGateways(): PaymentGatewayType[] {
    const gateways: PaymentGatewayType[] = ['BANK_TRANSFER', 'MANUAL'];
    
    if (this.stripe) {
      gateways.unshift('STRIPE');
    }
    
    if (this.paypal) {
      gateways.unshift('PAYPAL');
    }

    return gateways;
  }

  getGatewayConfig(gateway: PaymentGatewayType): Record<string, any> {
    switch (gateway) {
      case 'STRIPE':
        return this.stripe ? {
          publishableKey: this.stripe.getPublishableKey()
        } : {};
      case 'PAYPAL':
        return this.paypal ? {
          clientId: this.paypal.getClientId(),
          environment: this.paypal.getEnvironment()
        } : {};
      default:
        return {};
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createPaymentGatewayManager(config: PaymentGatewayConfig): PaymentGatewayManager {
  return new PaymentGatewayManager(config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export * from './stripe';
export * from './paypal';
