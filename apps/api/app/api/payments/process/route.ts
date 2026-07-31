import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {
  API,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  USER_ROLE,
} from '@rentalshop/constants';
import { z } from 'zod';

const processOrderPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  amount: z.number().positive(),
  method: z.enum([
    PAYMENT_METHOD.CASH,
    PAYMENT_METHOD.TRANSFER,
    PAYMENT_METHOD.CHECK,
    PAYMENT_METHOD.MANUAL,
  ] as [string, ...string[]]),
  kind: z.enum(['COLLECT', 'REFUND']).default('COLLECT'),
  reference: z.string().trim().min(8).max(100),
  notes: z.string().trim().max(500).optional(),
});

/**
 * POST /api/payments/process
 * Process payment
 */
export async function POST(request: NextRequest) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const parsed = processOrderPaymentSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(
          {
            ...ResponseBuilder.error('ORDER_PAYMENT_INVALID'),
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }
      const { orderId, amount, method, kind, reference, notes } = parsed.data;

      // Check if order exists
      const order = await db.orders.findById(orderId);
      if (!order) {
        return NextResponse.json(
          ResponseBuilder.error('ORDER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      const outlet = await db.outlets.findById(order.outletId);
      if (!outlet) {
        return NextResponse.json(
          ResponseBuilder.error('OUTLET_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      const isAdmin = user.role === USER_ROLE.ADMIN;
      const sameMerchant = userScope.merchantId === outlet.merchantId;
      const sameOutlet = !userScope.outletId || userScope.outletId === order.outletId;
      if (!isAdmin && (!sameMerchant || !sameOutlet)) {
        return NextResponse.json(
          ResponseBuilder.error('ACCESS_DENIED'),
          { status: API.STATUS.FORBIDDEN }
        );
      }

      // Client-generated reference makes retries idempotent for the mobile flow.
      const existing = await db.payments.findFirst({ orderId, reference });
      if (existing) {
        return NextResponse.json(
          ResponseBuilder.success('ORDER_PAYMENT_ALREADY_PROCESSED', { payment: existing })
        );
      }

      const payment = await db.payments.create({
        orderId,
        merchantId: outlet.merchantId,
        amount,
        currency: 'VND',
        method,
        type: PAYMENT_TYPE.ORDER_PAYMENT,
        status: kind === 'REFUND' ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.COMPLETED,
        reference,
        notes,
        processedAt: new Date(),
        processedBy: String(user.id),
        metadata: JSON.stringify({ kind, source: 'ANDROID_POS' }),
      });

      return NextResponse.json(
        ResponseBuilder.success('ORDER_PAYMENT_PROCESSED', { payment }),
        { status: 201 }
      );

    } catch (error) {
      console.error('Error processing payment:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
