// ============================================================================
// MANUAL PAYMENTS API
// ============================================================================
// Handles manual payment creation for subscription management
// MULTI-TENANT: Uses subdomain-based tenant DB

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMainDb } from '@rentalshop/database';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Manual payment creation schema
const createManualPaymentSchema = z.object({
  orderId: z.number().positive().optional(), // For order payments
  subscriptionId: z.number().positive().optional(), // For subscription payments
  planId: z.number().positive().optional(), // For subscription payments (from Main DB)
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required').default('USD'),
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
export const POST = withManagementAuth(async (request: NextRequest, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createManualPaymentSchema.parse(body);

    // Determine payment type and validate required fields
    let order = null;
    let subscription = null;
    let planName = 'Manual Payment';

    if (validatedData.orderId) {
      // Order payment
      order = await db.order.findUnique({
        where: { id: validatedData.orderId }
      });

      if (!order) {
        return NextResponse.json(
          ResponseBuilder.error('ORDER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }
    } else if (validatedData.subscriptionId) {
      // Subscription payment
      subscription = await db.subscription.findUnique({
        where: { id: validatedData.subscriptionId }
      });

      if (!subscription) {
        return NextResponse.json(
          ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Get plan name from Main DB if planId provided
      if (validatedData.planId) {
        const mainDb = await getMainDb();
        try {
          const planResult = await mainDb.query(
            'SELECT name FROM "Plan" WHERE "publicId" = $1',
            [validatedData.planId]
          );
          if (planResult.rows.length > 0) {
            planName = planResult.rows[0].name;
          }
          mainDb.end();
        } catch (error) {
          console.error('Error fetching plan from Main DB:', error);
        }
      }
    } else {
      return NextResponse.json(
        ResponseBuilder.error('PAYMENT_TARGET_REQUIRED', 'Either orderId or subscriptionId is required'),
        { status: 400 }
      );
    }

    // Create payment record
    const payment = await db.payment.create({
      data: {
        amount: validatedData.amount,
        currency: validatedData.currency,
        method: validatedData.method,
        type: order ? 'ORDER_PAYMENT' : 'SUBSCRIPTION_PAYMENT',
        status: 'COMPLETED', // Manual payments are immediately completed
        reference: validatedData.invoiceNumber || validatedData.transactionId || `MANUAL-${Date.now()}`,
        notes: validatedData.description || (order ? `Manual payment for order ${order.orderNumber}` : `Manual payment for ${planName}`),
        orderId: order?.id,
        subscriptionId: subscription?.id
      }
    });

    // If extending subscription, update the subscription
    if (validatedData.extendSubscription && subscription && validatedData.monthsToExtend) {
      const newEndDate = new Date(subscription.currentPeriodEnd);
      newEndDate.setMonth(newEndDate.getMonth() + validatedData.monthsToExtend);

      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodEnd: newEndDate,
          updatedAt: new Date()
        }
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        entityType: 'PAYMENT',
        entityId: payment.id.toString(),
        action: 'MANUAL_PAYMENT_CREATED',
        details: JSON.stringify({
          paymentId: payment.id,
          amount: payment.amount,
          method: payment.method,
          orderId: order?.id,
          subscriptionId: subscription?.id,
          planId: validatedData.planId,
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

    return NextResponse.json(
      ResponseBuilder.success('MANUAL_PAYMENT_CREATED_SUCCESS', {
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          type: payment.type,
          status: payment.status,
          reference: payment.reference,
          notes: payment.notes,
          createdAt: payment.createdAt
        }
      })
    );

  } catch (error) {
    console.error('Manual payment creation error:', error);

    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
