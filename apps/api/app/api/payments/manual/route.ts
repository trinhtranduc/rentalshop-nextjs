// ============================================================================
// MANUAL PAYMENTS API
// ============================================================================
// Handles manual payment creation for subscription management

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
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
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createManualPaymentSchema.parse(body);

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { id: validatedData.merchantId },
      include: { 
        plan: true,
        subscription: true
      }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Get plan and plan variant
    const plan = await prisma.plan.findUnique({
      where: { id: validatedData.planId }
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, message: 'Plan not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Create payment record
    const result = await prisma.$transaction(async (tx) => {
      // Get next payment public ID
      const lastPayment = await tx.payment.findFirst({
        orderBy: { id: 'desc' }
      });
      const paymentPublicId = (lastPayment?.id || 0) + 1;

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          id: paymentPublicId,
          amount: validatedData.amount,
          method: validatedData.method,
          type: 'SUBSCRIPTION_PAYMENT',
          status: 'COMPLETED', // Manual payments are immediately completed
          reference: validatedData.invoiceNumber || `MANUAL-${paymentPublicId}`,
          notes: validatedData.description || `Manual payment for ${plan.name}`,
          merchantId: merchant.id,
          subscriptionId: merchant.subscription?.id,
          processedBy: user.id
        }
      });

      // If extending subscription, update the subscription
      if (validatedData.extendSubscription && merchant.subscription && validatedData.monthsToExtend) {
        const currentSubscription = merchant.subscription;
        if (currentSubscription.currentPeriodEnd) {
          const newEndDate = new Date(currentSubscription.currentPeriodEnd);
          newEndDate.setMonth(newEndDate.getMonth() + validatedData.monthsToExtend);

          await tx.subscription.update({
            where: { id: currentSubscription.id },
            data: {
              currentPeriodEnd: newEndDate,
              updatedAt: new Date()
            }
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'PAYMENT',
          entityId: payment.id,
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
        }
      });

      return payment;
    });

    return NextResponse.json({
      success: true,
      message: 'Manual payment created successfully',
      data: {
        payment: {
          id: result.id,
          amount: result.amount,
          method: result.method,
          type: result.type,
          status: result.status,
          reference: result.reference,
          notes: result.notes,
          createdAt: result.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Manual payment creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation error',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create manual payment' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
