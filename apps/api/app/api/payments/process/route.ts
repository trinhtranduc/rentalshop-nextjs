import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { safeAudit } from '../../../../lib/change-timeline';
import {
  API,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  USER_ROLE,
  isStaffLikeRole,
} from '@rentalshop/constants';
import { z } from 'zod';
import { CANCEL_REFUND_NOTE, recomputeDepositFromPayments } from '../../../../lib/installments';
import { INSTALLMENT_PAYMENT_NOTE, parseDepositPlan } from '../../../../../../packages/utils/src/core/deposit-plan';

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
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'])(async (request, { user, userScope }) => {
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

      // #1199: these notes belong to the stage routes (collect / cancel); this route cannot write them
      if (notes === INSTALLMENT_PAYMENT_NOTE || notes === CANCEL_REFUND_NOTE) {
        return NextResponse.json(ResponseBuilder.error('ORDER_PAYMENT_INVALID'), { status: 400 });
      }

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

      // #1199 P6: on an order with a deposit plan, staff cannot refund money (the installed Android app only refunds
      // collateral, with notes RETURN_ADJUSTMENT). PICKUP collections stay as they were: they are the `rest` stage.
      const orderHasPlan = parseDepositPlan((order as any).depositPlan) != null;
      if (orderHasPlan && kind === 'REFUND' && isStaffLikeRole(user.role) && notes !== 'RETURN_ADJUSTMENT') {
        return NextResponse.json(ResponseBuilder.error('INSTALLMENT_FORBIDDEN_ROLE'), { status: API.STATUS.FORBIDDEN });
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

      // #1199: the order's pre-delivery total follows its payments (no-op for an order without a plan)
      if (orderHasPlan) await recomputeDepositFromPayments(prisma, orderId);

      // #519: the order's change history shows the money collected / refunded
      await safeAudit('payment', () => createAuditHelper(prisma).logCustom({
        action: 'CUSTOM',
        entityType: 'Order',
        entityId: String(orderId),
        entityName: order.orderNumber || String(orderId),
        description: `Order payment ${kind === 'REFUND' ? 'refunded' : 'collected'}: ${amount}`,
        category: 'BUSINESS',
        newValues: { payment: { kind, amount, method } },
        context: {
          userId: String(user.id),
          userEmail: user.email,
          userRole: user.role,
          merchantId: outlet.merchantId != null ? String(outlet.merchantId) : undefined,
          outletId: userScope.outletId != null ? String(userScope.outletId) : undefined,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          requestId: request.headers.get('x-request-id') || undefined,
        },
      }));

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
