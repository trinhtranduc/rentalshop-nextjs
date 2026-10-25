import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { z } from 'zod';
import { safeAudit } from '../../../../../lib/change-timeline';
import {
  InstallmentError,
  findOrderInScope,
  installmentsView,
  isScopeError,
  loadShop,
  lockOrderRow,
} from '../../../../../lib/installments';
import {
  INSTALLMENT_PAYMENT_NOTE,
  MAX_CANCELLATION_POLICY_LENGTH,
  applyTemplate,
  depositPlanItemInputSchema,
  depositPlanSchema,
  parseDepositPlan,
  planOverflow,
} from '../../../../../../../packages/utils/src/core/deposit-plan';

const editSchema = z.object({
  items: z.array(depositPlanItemInputSchema).min(1).max(3),
  policy: z.string().max(MAX_CANCELLATION_POLICY_LENGTH).optional(),
});

/**
 * PUT /api/orders/[orderId]/deposit-plan  (#1199)
 *
 * Edit the stages of one order: labels, percentages, a fixed `amountOverride`, due days (`dueRule` or `dueDateKey`).
 * Only the shop owner (MERCHANT), OUTLET_ADMIN of the order's outlet, or ADMIN; staff 403 (they only see and collect).
 * The body replaces `items`; the automatic last stage `rest` is never sent. A stage that already has a payment must stay
 * in the list (409 INSTALLMENT_ALREADY_PAID otherwise) and keeps the collected amount. Later stages and `rest` recompute.
 * Stages adding up to more than the total → 400 INSTALLMENT_EXCEEDS_TOTAL. The order needs a plan (400 INSTALLMENT_NO_PLAN)
 * and must still be RESERVED (400 INVALID_ORDER_STATUS). Every edit is written to the audit log.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  const { orderId: rawOrderId } = await Promise.resolve(params);
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(rawOrderId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'), { status: 400 });
      }
      const orderId = parseInt(rawOrderId, 10);
      const parsed = editSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const scoped = await findOrderInScope(db, user, userScope, orderId);
      if (isScopeError(scoped)) {
        return NextResponse.json(ResponseBuilder.error(scoped.code), { status: scoped.status });
      }
      const { merchantId } = scoped;
      const shop = await loadShop(prisma, merchantId);

      let result: { before: any; order: any };
      try {
        result = await prisma.$transaction(
          async (tx: any) => {
            await lockOrderRow(tx, orderId);
            const fresh = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
            if (!fresh || fresh.deletedAt) throw new InstallmentError('ORDER_NOT_FOUND', 404);
            const current = parseDepositPlan(fresh.depositPlan);
            if (!current) throw new InstallmentError('INSTALLMENT_NO_PLAN', 400);
            if (fresh.orderType !== 'RENT' || fresh.status !== 'RESERVED') throw new InstallmentError('INVALID_ORDER_STATUS', 400);

            const collectedKeys = new Set(
              (fresh.payments as any[])
                .filter((payment) => payment.status === 'COMPLETED' && payment.notes === INSTALLMENT_PAYMENT_NOTE && payment.installmentKey)
                .map((payment) => payment.installmentKey as string)
            );
            const used = new Set(parsed.data.items.map((item) => item.key).filter(Boolean) as string[]);
            for (const key of collectedKeys) {
              if (key !== 'rest' && !used.has(key)) throw new InstallmentError('INSTALLMENT_ALREADY_PAID', 409);
            }
            const items = parsed.data.items.map((item) => {
              if (item.key) return item;
              let n = 1;
              while (used.has(`i${n}`)) n += 1;
              const key = `i${n}`;
              used.add(key);
              return { ...item, key };
            });
            const next = applyTemplate(items as any, parsed.data.policy ?? current.policy ?? null);
            if (!depositPlanSchema.safeParse(next).success) throw new InstallmentError('INSTALLMENT_EXCEEDS_TOTAL', 400);
            if (planOverflow({ ...fresh, depositPlan: next }, shop) > 0) throw new InstallmentError('INSTALLMENT_EXCEEDS_TOTAL', 400);

            const order = await tx.order.update({
              where: { id: orderId },
              data: { depositPlan: next as any },
              include: { payments: true },
            });
            return { before: current, order };
          },
          { maxWait: 5000, timeout: 15000 }
        );
      } catch (error) {
        if (error instanceof InstallmentError) {
          return NextResponse.json(ResponseBuilder.error(error.code), { status: error.status });
        }
        throw error;
      }

      await safeAudit('installment', () => createAuditHelper(prisma).logCustom({
        action: 'CUSTOM',
        entityType: 'Order',
        entityId: String(orderId),
        entityName: result.order?.orderNumber || String(orderId),
        description: 'Deposit plan edited',
        category: 'BUSINESS',
        oldValues: { depositPlan: result.before },
        newValues: { depositPlan: result.order?.depositPlan },
        context: {
          userId: String(user.id),
          userEmail: user.email,
          userRole: user.role,
          merchantId: String(merchantId),
          outletId: userScope.outletId != null ? String(userScope.outletId) : undefined,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          requestId: request.headers.get('x-request-id') || undefined,
        },
      }));

      return NextResponse.json(
        ResponseBuilder.success('DEPOSIT_PLAN_UPDATED', {
          depositAmount: result.order.depositAmount,
          ...installmentsView(result.order, shop),
        })
      );
    } catch (error) {
      console.error('Error editing deposit plan:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

export const runtime = 'nodejs';
