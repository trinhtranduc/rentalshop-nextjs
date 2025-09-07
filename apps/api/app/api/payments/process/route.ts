// ============================================================================
// PAYMENT PROCESSING API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createPaymentGatewayManager, PaymentGatewayConfig } from '@rentalshop/utils';
import { verifyTokenSimple } from '@rentalshop/auth';
import { createSubscriptionPayment } from '@rentalshop/database';

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
  return {
    stripe: process.env.STRIPE_SECRET_KEY ? {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      currency: 'USD',
      country: 'US'
    } : undefined,
    paypal: process.env.PAYPAL_CLIENT_ID ? {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      environment: (process.env.PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      currency: 'USD',
      country: 'US'
    } : undefined,
    defaultGateway: 'STRIPE'
  };
};

// ============================================================================
// POST /api/payments/process - Process payment
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

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

    // Check if gateway is available
    if (!paymentManager.isGatewayAvailable(gateway)) {
      return NextResponse.json(
        { success: false, message: `Payment gateway ${gateway} is not available` },
        { status: 400 }
      );
    }

    // Add user context to metadata
    const paymentMetadata = {
      ...metadata,
      userId: user.id,
      merchantId: user.merchantId,
      userEmail: user.email,
      timestamp: new Date().toISOString()
    };

    // Process payment
    const result = await paymentManager.processPayment(
      amount,
      currency,
      gateway,
      paymentMetadata
    );

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
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/payments/process - Get available payment gateways
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Create payment gateway manager
    const paymentManager = createPaymentGatewayManager(getPaymentGatewayConfig());

    // Get available gateways and their configurations
    const availableGateways = paymentManager.getAvailableGateways();
    const gatewayConfigs = availableGateways.reduce((configs, gateway) => {
      configs[gateway] = paymentManager.getGatewayConfig(gateway);
      return configs;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: {
        availableGateways,
        gatewayConfigs,
        defaultGateway: paymentManager.getDefaultGateway()
      }
    });
  } catch (error) {
    console.error('Error fetching payment gateways:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment gateways' },
      { status: 500 }
    );
  }
}
