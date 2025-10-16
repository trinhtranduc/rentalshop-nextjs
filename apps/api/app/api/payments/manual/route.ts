// ============================================================================
// MANUAL PAYMENTS API
// ============================================================================
// Handles manual payment creation for subscription management

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

// Manual payment creation schema
const createManualPaymentSchema = z.object({
  merchantId: z.number().positive('Merchant ID is required'),
  planId: z.number().positive('Plan ID is required'),
  // planVariantId: z.number().positive('Plan variant ID is required'), // Not supported in current schema
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  method: z.enum(['STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'CREDIT_CARD', 'CASH']),
  description: z.string().optional(),
  extendSubscription: z.boolean().default(false),
  monthsToExtend: z.number().optional(),
  invoiceNumber: z.string().optional(),
  transactionId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ============================================================================
// POST /api/payments/manual - Create manual payment
// ============================================================================
export const POST = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user }) => {
  try {

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createManualPaymentSchema.parse(body);

    // Get merchant using simplified database API
    const merchant = await db.merchants.findById(validatedData.merchantId);

    if (!merchant) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Get plan using simplified database API
    const plan = await db.plans.findById(validatedData.planId);

    if (!plan) {
      return NextResponse.json(
        ResponseBuilder.error('PLAN_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Create payment record using simplified database API
    const payment = await db.payments.create({
      amount: validatedData.amount,
      method: validatedData.method,
      type: 'SUBSCRIPTION_PAYMENT',
      status: 'COMPLETED', // Manual payments are immediately completed
      reference: validatedData.invoiceNumber || `MANUAL-${Date.now()}`,
      notes: validatedData.description || `Manual payment for ${plan.name}`,
      // merchantId: merchant.id, // TODO: Add merchantId field to PaymentCreateInput type
      // subscriptionId: merchant.subscription?.id, // TODO: Add subscriptionId field to PaymentCreateInput type
      processedBy: user.id
    });

    // If extending subscription, update the subscription
    if (validatedData.extendSubscription && merchant.subscription && validatedData.monthsToExtend) {
      const currentSubscription = merchant.subscription;
      if (currentSubscription.currentPeriodEnd) {
        const newEndDate = new Date(currentSubscription.currentPeriodEnd);
        newEndDate.setMonth(newEndDate.getMonth() + validatedData.monthsToExtend);

        await db.subscriptions.update(currentSubscription.id, {
          currentPeriodEnd: newEndDate,
          updatedAt: new Date()
        });
      }
    }

    // Create audit log
    await db.auditLogs.create({
      entityType: 'PAYMENT',
      entityId: payment.id.toString(),
      action: 'MANUAL_PAYMENT_CREATED',
      details: JSON.stringify({
        paymentId: payment.id,
        amount: payment.amount,
        method: payment.method,
        merchantId: merchant.id,
        planId: plan.id,
        planVariantId: null,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        createdBy: user.id,
        createdByEmail: user.email
      }),
      userId: user.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      code: 'MANUAL_PAYMENT_CREATED_SUCCESS',
      code: 'MANUAL_PAYMENT_CREATED_SUCCESS', message: 'Manual payment created successfully',
      data: {
        payment: {
          id: payment.id,
          amount: payment.amount,
          method: payment.method,
          type: payment.type,
          status: payment.status,
          reference: payment.reference,
          notes: payment.notes,
          createdAt: payment.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Manual payment creation error:', error);

    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
