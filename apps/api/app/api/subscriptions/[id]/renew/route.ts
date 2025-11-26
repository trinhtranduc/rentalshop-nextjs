import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, PAYMENT_METHOD, PAYMENT_TYPE, PAYMENT_STATUS, SUBSCRIPTION_STATUS, USER_ROLE } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/renew
 * Renew subscription with payment tracking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const subscriptionId = parseInt(resolvedParams.id);
  
  return withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_SUBSCRIPTION_ID'), { status: 400 });
      }

      const body = await request.json();
      const { 
        method, 
        duration = 1, 
        transactionId, 
        reference, 
        description, 
        paymentDate 
      } = body;

      // Validate required fields
      if (!method || !transactionId) {
        return NextResponse.json(
          ResponseBuilder.error('PAYMENT_METHOD_AND_TRANSACTION_ID_REQUIRED'),
          { status: 400 }
        );
      }

      if (!['STRIPE', 'TRANSFER'].includes(method)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PAYMENT_METHOD'),
          { status: 400 }
        );
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      // Calculate new period end based on duration (months)
      const currentPeriodEnd = new Date(existing.currentPeriodEnd || new Date());
      const newPeriodEnd = new Date(currentPeriodEnd);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + duration);

      // Calculate renewal amount with discount based on duration
      // Apply discount: 1 month = 0%, 3 months = 5%, 6 months = 10%, 12 months = 20%
      const getDiscountForDuration = (months: number): number => {
        if (months >= 12) return 0.20;
        if (months >= 6) return 0.10;
        if (months >= 3) return 0.05;
        return 0;
      };
      
      const discount = getDiscountForDuration(duration);
      const baseAmount = existing.amount * duration;
      const renewalAmount = baseAmount * (1 - discount);

      // Use database transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx: any) => {
        // Create payment record
        const payment = await tx.payment.create({
          data: {
            subscriptionId: subscriptionId,
            merchantId: existing.merchantId,
            amount: renewalAmount,
            currency: existing.currency || 'USD',
            method: method as any,
            type: PAYMENT_TYPE.SUBSCRIPTION_PAYMENT as any,
            status: method === PAYMENT_METHOD.STRIPE ? PAYMENT_STATUS.COMPLETED as any : PAYMENT_STATUS.PENDING as any,
            transactionId: transactionId,
            reference: reference || undefined,
            description: description || `${duration} month${duration > 1 ? 's' : ''} subscription renewal`,
            processedAt: method === PAYMENT_METHOD.STRIPE ? new Date() : (paymentDate ? new Date(paymentDate) : null),
            createdAt: paymentDate ? new Date(paymentDate) : new Date()
          }
        });

        // Update subscription period
        const updatedSubscription = await tx.subscription.update({
          where: { id: subscriptionId },
          data: {
            currentPeriodStart: currentPeriodEnd,
            currentPeriodEnd: newPeriodEnd,
            status: SUBSCRIPTION_STATUS.ACTIVE as any,
            updatedAt: new Date()
          },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            plan: true
          }
        });

        return { updatedSubscription, payment };
      });

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_RENEWED_SUCCESS', {
          subscription: result.updatedSubscription,
          payment: result.payment
        })
      );
    } catch (error) {
      console.error('Error renewing subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}