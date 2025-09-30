// ============================================================================
// PAYMENT PROCESSING API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createPaymentGatewayManager, PaymentGatewayConfig } from '@rentalshop/utils';
import { withAuthRoles } from '@rentalshop/auth';
import { createSubscriptionPayment } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

// ============================================================================
// TYPES
// ============================================================================

interface PaymentRequest {
  amount: number;
  currency: string;
  gateway: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' | 'MANUAL';
  subscriptionId?: number;
  description?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// PAYMENT GATEWAY CONFIGURATION
// ============================================================================

const getPaymentGatewayConfig = (): PaymentGatewayConfig => {
  // Default to Stripe if available, otherwise PayPal
  if (process.env.STRIPE_SECRET_KEY) {
    return {
      provider: 'stripe' as const,
      apiKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      environment: 'production',
      defaultGateway: 'STRIPE'
    };
  } else if (process.env.PAYPAL_CLIENT_ID) {
    return {
      provider: 'paypal' as const,
      apiKey: process.env.PAYPAL_CLIENT_ID,
      webhookSecret: process.env.PAYPAL_CLIENT_SECRET,
      environment: (process.env.PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      defaultGateway: 'PAYPAL'
    };
  } else {
    // Fallback configuration
    return {
      provider: 'stripe' as const,
      apiKey: 'test_key',
      environment: 'sandbox',
      defaultGateway: 'STRIPE'
    };
  }
};

// ============================================================================
// POST /api/payments/process - Process payment
// ============================================================================
async function handleProcessPayment(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any }
) {
  try {

    const body: PaymentRequest = await request.json();
    const { amount, currency, gateway, subscriptionId, description, metadata } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!currency) {
      return NextResponse.json(
        { success: false, message: 'Currency is required' },
        { status: 400 }
      );
    }

    if (!gateway) {
      return NextResponse.json(
        { success: false, message: 'Payment gateway is required' },
        { status: 400 }
      );
    }

    // Create payment gateway manager
    const paymentManager = createPaymentGatewayManager(getPaymentGatewayConfig());

    // Add user context to metadata
    const paymentMetadata = {
      ...metadata,
      userId: user.id,
      merchantId: user.merchantId,
      userEmail: user.email,
      timestamp: new Date().toISOString()
    };

    // Create payment intent
    const result = await paymentManager.createPayment(amount, currency, paymentMetadata);

    // If payment is for a subscription, create payment record
    if (subscriptionId && result.success) {
      try {
        await createSubscriptionPayment({
          subscriptionId,
          amount,
          currency,
          method: gateway,
          status: result.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
          transactionId: result.transactionId,
          description: description || `Payment via ${gateway}`,
          failureReason: result.error
        });
      } catch (error) {
        console.error('Error creating subscription payment record:', error);
        // Don't fail the payment if we can't create the record
      }
    }

    return NextResponse.json({
      success: result.success,
      data: {
        transactionId: result.transactionId,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        gateway: result.gateway,
        metadata: result.metadata
      },
      message: result.success ? 'Payment processed successfully' : 'Payment failed',
      error: result.error
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process payment' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// ============================================================================
// GET /api/payments/process - Get available payment gateways
// ============================================================================
async function handleGetPaymentGateways(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any }
) {
  try {

    // Create payment gateway manager
    const paymentManager = createPaymentGatewayManager(getPaymentGatewayConfig());

    // Return simple payment gateway configuration
    const config = getPaymentGatewayConfig();
    return NextResponse.json({
      success: true,
      data: {
        availableGateways: [config.provider],
        defaultGateway: config.defaultGateway || config.provider.toUpperCase(),
        environment: config.environment
      }
    });
  } catch (error) {
    console.error('Error fetching payment gateways:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment gateways' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// Export functions with withAuthRoles wrapper
export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(
  (req, context) => handleProcessPayment(req, context)
);

export const GET = withAuthRoles(['ADMIN', 'MERCHANT'])(
  (req, context) => handleGetPaymentGateways(req, context)
);
