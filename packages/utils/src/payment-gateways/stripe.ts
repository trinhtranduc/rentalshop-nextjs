// ============================================================================
// STRIPE PAYMENT GATEWAY INTEGRATION
// ============================================================================

import Stripe from 'stripe';

// ============================================================================
// TYPES
// ============================================================================

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  currency: string;
  country: string;
}

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
  metadata?: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  priceId: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

// ============================================================================
// STRIPE CLIENT
// ============================================================================

export class StripeGateway {
  private stripe: Stripe;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  // ============================================================================
  // CUSTOMER MANAGEMENT
  // ============================================================================

  async createCustomer(email: string, name?: string, phone?: string, metadata?: Record<string, string>): Promise<StripeCustomer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        phone,
        metadata: {
          ...metadata,
          source: 'rentalshop'
        }
      });

      return {
        id: customer.id,
        email: customer.email || email,
        name: customer.name || name,
        phone: customer.phone || phone,
        metadata: customer.metadata
      };
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  async getCustomer(customerId: string): Promise<StripeCustomer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
      
      return {
        id: customer.id,
        email: customer.email || '',
        name: customer.name || undefined,
        phone: customer.phone || undefined,
        metadata: customer.metadata
      };
    } catch (error) {
      console.error('Error fetching Stripe customer:', error);
      throw new Error('Failed to fetch customer');
    }
  }

  async updateCustomer(customerId: string, updates: Partial<StripeCustomer>): Promise<StripeCustomer> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        email: updates.email,
        name: updates.name,
        phone: updates.phone,
        metadata: updates.metadata
      });

      return {
        id: customer.id,
        email: customer.email || '',
        name: customer.name || undefined,
        phone: customer.phone || undefined,
        metadata: customer.metadata
      };
    } catch (error) {
      console.error('Error updating Stripe customer:', error);
      throw new Error('Failed to update customer');
    }
  }

  // ============================================================================
  // PAYMENT INTENTS (One-time payments)
  // ============================================================================

  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId?: string,
    metadata?: Record<string, string>
  ): Promise<StripePaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customerId,
        metadata: {
          ...metadata,
          source: 'rentalshop'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret || '',
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret || '',
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      console.error('Error fetching payment intent:', error);
      throw new Error('Failed to fetch payment intent');
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret || '',
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw new Error('Failed to confirm payment intent');
    }
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>
  ): Promise<StripeSubscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata: {
          ...metadata,
          source: 'rentalshop'
        },
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<StripeSubscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw new Error('Failed to fetch subscription');
    }
  }

  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<StripeSubscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: !immediately,
        ...(immediately && { status: 'canceled' })
      });

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  // ============================================================================
  // PRICES & PRODUCTS
  // ============================================================================

  async createPrice(
    productId: string,
    unitAmount: number,
    currency: string,
    recurring?: { interval: 'month' | 'year' }
  ): Promise<string> {
    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: Math.round(unitAmount * 100),
        currency: currency.toLowerCase(),
        recurring: recurring ? {
          interval: recurring.interval
        } : undefined,
      });

      return price.id;
    } catch (error) {
      console.error('Error creating price:', error);
      throw new Error('Failed to create price');
    }
  }

  async createProduct(name: string, description?: string, metadata?: Record<string, string>): Promise<string> {
    try {
      const product = await this.stripe.products.create({
        name,
        description,
        metadata: {
          ...metadata,
          source: 'rentalshop'
        }
      });

      return product.id;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('Failed to create product');
    }
  }

  // ============================================================================
  // WEBHOOKS
  // ============================================================================

  async verifyWebhookSignature(payload: string, signature: string): Promise<Stripe.Event> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );

      return event;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getPublishableKey(): string {
    return this.config.publishableKey;
  }

  formatAmount(amount: number, currency: string): number {
    // Convert to cents for Stripe
    return Math.round(amount * 100);
  }

  parseAmount(amount: number, currency: string): number {
    // Convert from cents to dollars
    return amount / 100;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createStripeGateway(config: StripeConfig): StripeGateway {
  return new StripeGateway(config);
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_STRIPE_CONFIG: Partial<StripeConfig> = {
  currency: 'usd',
  country: 'US'
};
