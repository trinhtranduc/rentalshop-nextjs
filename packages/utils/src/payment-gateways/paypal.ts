// ============================================================================
// PAYPAL PAYMENT GATEWAY INTEGRATION
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  currency: string;
  country: string;
}

export interface PayPalOrder {
  id: string;
  status: string;
  amount: number;
  currency: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalSubscription {
  id: string;
  status: string;
  plan_id: string;
  subscriber: {
    payer_id: string;
    email_address: string;
  };
  create_time: string;
  update_time: string;
  start_time: string;
    billing_info: {
    next_billing_time: string;
    failed_payments_count: number;
    cycle_executions: Array<{
      tenure_type: string;
      sequence: number;
      cycles_completed: number;
      cycles_remaining: number;
    }>;
  };
}

export interface PayPalPlan {
  id: string;
  name: string;
  description: string;
  status: string;
  billing_cycles: Array<{
    frequency: {
      interval_unit: string;
      interval_count: number;
    };
    tenure_type: string;
    sequence: number;
    total_cycles: number;
    pricing_scheme: {
      fixed_price: {
        value: string;
        currency_code: string;
      };
    };
  }>;
}

// ============================================================================
// PAYPAL CLIENT
// ============================================================================

export class PayPalGateway {
  private config: PayPalConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: PayPalConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com';
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error('Failed to get PayPal access token');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

      return this.accessToken;
    } catch (error) {
      console.error('Error getting PayPal access token:', error);
      throw new Error('Failed to authenticate with PayPal');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`PayPal API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    return response.json();
  }

  // ============================================================================
  // ORDERS (One-time payments)
  // ============================================================================

  async createOrder(
    amount: number,
    currency: string,
    description: string,
    returnUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>
  ): Promise<PayPalOrder> {
    try {
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2)
          },
          description,
          custom_id: metadata?.subscriptionId || '',
          soft_descriptor: 'RentalShop'
        }],
        application_context: {
          brand_name: 'RentalShop',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      };

      const order = await this.makeRequest('/v2/checkout/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      return {
        id: order.id,
        status: order.status,
        amount,
        currency: currency.toUpperCase(),
        links: order.links
      };
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      throw new Error('Failed to create PayPal order');
    }
  }

  async getOrder(orderId: string): Promise<PayPalOrder> {
    try {
      const order = await this.makeRequest(`/v2/checkout/orders/${orderId}`);

      return {
        id: order.id,
        status: order.status,
        amount: parseFloat(order.purchase_units[0].amount.value),
        currency: order.purchase_units[0].amount.currency_code,
        links: order.links || []
      };
    } catch (error) {
      console.error('Error fetching PayPal order:', error);
      throw new Error('Failed to fetch PayPal order');
    }
  }

  async captureOrder(orderId: string): Promise<PayPalOrder> {
    try {
      const capture = await this.makeRequest(`/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST'
      });

      return {
        id: capture.id,
        status: capture.status,
        amount: parseFloat(capture.purchase_units[0].payments.captures[0].amount.value),
        currency: capture.purchase_units[0].payments.captures[0].amount.currency_code,
        links: capture.links
      };
    } catch (error) {
      console.error('Error capturing PayPal order:', error);
      throw new Error('Failed to capture PayPal order');
    }
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  async createPlan(
    name: string,
    description: string,
    amount: number,
    currency: string,
    interval: 'MONTH' | 'YEAR'
  ): Promise<PayPalPlan> {
    try {
      const planData = {
        product_id: await this.createProduct(name, description),
        name,
        description,
        status: 'ACTIVE',
        billing_cycles: [{
          frequency: {
            interval_unit: interval,
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 = unlimited
          pricing_scheme: {
            fixed_price: {
              value: amount.toFixed(2),
              currency_code: currency.toUpperCase()
            }
          }
        }]
      };

      const plan = await this.makeRequest('/v1/billing/plans', {
        method: 'POST',
        body: JSON.stringify(planData)
      });

      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        status: plan.status,
        billing_cycles: plan.billing_cycles
      };
    } catch (error) {
      console.error('Error creating PayPal plan:', error);
      throw new Error('Failed to create PayPal plan');
    }
  }

  async createProduct(name: string, description: string): Promise<string> {
    try {
      const productData = {
        name,
        description,
        type: 'SERVICE',
        category: 'SOFTWARE'
      };

      const product = await this.makeRequest('/v1/catalogs/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      });

      return product.id;
    } catch (error) {
      console.error('Error creating PayPal product:', error);
      throw new Error('Failed to create PayPal product');
    }
  }

  async createSubscription(
    planId: string,
    customerEmail: string,
    customerName?: string,
    returnUrl?: string,
    cancelUrl?: string
  ): Promise<PayPalSubscription> {
    try {
      const subscriptionData = {
        plan_id: planId,
        subscriber: {
          email_address: customerEmail,
          name: customerName ? {
            given_name: customerName.split(' ')[0],
            surname: customerName.split(' ').slice(1).join(' ')
          } : undefined
        },
        application_context: returnUrl && cancelUrl ? {
          brand_name: 'RentalShop',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: returnUrl,
          cancel_url: cancelUrl
        } : undefined
      };

      const subscription = await this.makeRequest('/v1/billing/subscriptions', {
        method: 'POST',
        body: JSON.stringify(subscriptionData)
      });

      return {
        id: subscription.id,
        status: subscription.status,
        plan_id: subscription.plan_id,
        subscriber: subscription.subscriber,
        create_time: subscription.create_time,
        update_time: subscription.update_time,
        start_time: subscription.start_time,
        billing_info: subscription.billing_info
      };
    } catch (error) {
      console.error('Error creating PayPal subscription:', error);
      throw new Error('Failed to create PayPal subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
    try {
      const subscription = await this.makeRequest(`/v1/billing/subscriptions/${subscriptionId}`);

      return {
        id: subscription.id,
        status: subscription.status,
        plan_id: subscription.plan_id,
        subscriber: subscription.subscriber,
        create_time: subscription.create_time,
        update_time: subscription.update_time,
        start_time: subscription.start_time,
        billing_info: subscription.billing_info
      };
    } catch (error) {
      console.error('Error fetching PayPal subscription:', error);
      throw new Error('Failed to fetch PayPal subscription');
    }
  }

  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    try {
      const cancelData = {
        reason: reason || 'Customer requested cancellation'
      };

      await this.makeRequest(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        body: JSON.stringify(cancelData)
      });
    } catch (error) {
      console.error('Error canceling PayPal subscription:', error);
      throw new Error('Failed to cancel PayPal subscription');
    }
  }

  // ============================================================================
  // WEBHOOKS
  // ============================================================================

  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
    webhookId: string
  ): Promise<any> {
    try {
      const verificationData = {
        auth_algo: headers['paypal-auth-algo'],
        cert_id: headers['paypal-cert-id'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: JSON.parse(body)
      };

      const verification = await this.makeRequest('/v1/notifications/verify-webhook-signature', {
        method: 'POST',
        body: JSON.stringify(verificationData)
      });

      if (verification.verification_status !== 'SUCCESS') {
        throw new Error('Webhook signature verification failed');
      }

      return verification.webhook_event;
    } catch (error) {
      console.error('Error verifying PayPal webhook:', error);
      throw new Error('Failed to verify webhook signature');
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getClientId(): string {
    return this.config.clientId;
  }

  getEnvironment(): string {
    return this.config.environment;
  }

  formatAmount(amount: number, currency: string): string {
    return amount.toFixed(2);
  }

  parseAmount(amount: string): number {
    return parseFloat(amount);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createPayPalGateway(config: PayPalConfig): PayPalGateway {
  return new PayPalGateway(config);
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_PAYPAL_CONFIG: Partial<PayPalConfig> = {
  environment: 'sandbox',
  currency: 'USD',
  country: 'US'
};
