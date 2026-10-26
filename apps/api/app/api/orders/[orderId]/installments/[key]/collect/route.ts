import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { API, PAYMENT_METHOD, isStaffLikeRole } from '@rentalshop/constants';
import { z } from 'zod';
import { safeAudit } from '../../../../../../../lib/change-timeline';
import {
  InstallmentError,
  STAFF_COLLECT_METHODS,
  findOrderInScope,
  installmentsView,
  isScopeError,
  loadShop,
  lockOrderRow,
  recomputeDepositFromPayments,
} from '../../../../../../../lib/installments';
import {
  INSTALLMENT_PAYMENT_NOTE,
  effectivePlan,
  parseDepositPlan,
} from '../../../../../../../../../packages/utils/src/core/deposit-plan';
import { formatDateKeyInTimeZone, getUtcRangeForDateKeys } from '../../../../../../../../../packages/utils/src/core/date-range';

const collectSchema = z.object({
  amount: z.number().positive(),
  method: z.enum([PAYMENT_METHOD.CASH, PAYMENT_METHOD.TRANSFER, PAYMENT_METHOD.CHECK, PAYMENT_METHOD.MANUAL] as [string, ...string[]]),
  /** Civil day of the shop (`YYYY-MM-DD`) the money was taken; today when missing */
  collectedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(500).optional(),
  reference: z.string().trim().min(8).max(100),
});

/**
 * POST /api/orders/[orderId]/installments/[key]/collect  (#1199)
 *
 * Collects one deposit stage (`i1`, `i2`, `rest`) of an order that has a deposit plan: one COMPLETED `Payment`
 * (notes INSTALLMENT, installmentKey = key), then `Order.depositAmount` is recomputed. Everything runs in one
 * transaction holding a row lock on the order; the partial unique index (orderId, installmentKey) is the last guard.
 *
 * - Idempotent by `reference` (8-100 chars): a repeat returns the first payment with 200 and changes nothing.
 * - amount above the stage → 400 INSTALLMENT_OVERPAID. Less than the stage is allowed: the stage is then worth
 *   what was collected (PARTIAL) and `rest` takes the difference. A stage already collected → 409 INSTALLMENT_ALREADY_PAID.
 * - Roles: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY of the order's shop / outlet. Staff-like roles
 *   take cash or transfer only and only today (no `collectedOn` in the past) → 403 INSTALLMENT_FORBIDDEN_ROLE.
 * - Explicit stages while RESERVED; `rest` while RESERVED too (after hand-over it counts as taken). Cancelled or closed → 400 INVALID_ORDER_STATUS.
 * - `collectedOn` is stored as 12:00 of that shop day (away from the 17:00Z day edge) and echoed in `metadata`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; key: string }> | { orderId: string; key: string } }
) {
  const { orderId: rawOrderId, key } = await Promise.resolve(params);
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(rawOrderId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'), { status: 400 });
      }
      const orderId = parseInt(rawOrderId, 10);
      const parsed = collectSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const { amount, method, collectedOn, note, reference } = parsed.data;

      const scoped = await findOrderInScope(db, user, userScope, orderId);
      if (isScopeError(scoped)) {
        return NextResponse.json(ResponseBuilder.error(scoped.code), { status: scoped.status });
      }
      const { merchantId } = scoped;

      const shop = await loadShop(prisma, merchantId);
      const todayKey = formatDateKeyInTimeZone(new Date(), shop.timezone);
      if (collectedOn && collectedOn > todayKey) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }
      if (isStaffLikeRole(user.role)) {
        if (!STAFF_COLLECT_METHODS.includes(method) || (collectedOn && collectedOn !== todayKey)) {
          return NextResponse.json(ResponseBuilder.error('INSTALLMENT_FORBIDDEN_ROLE'), { status: API.STATUS.FORBIDDEN });
        }
      }
      const dayKey = collectedOn ?? todayKey;
      const processedAt = collectedOn
        ? new Date(getUtcRangeForDateKeys({ from: collectedOn }, shop.timezone).start.getTime() + 12 * 60 * 60 * 1000)
        : new Date();

      let result: { replay: boolean; payment: any; order: any };
      try {
        result = await prisma.$transaction(
          async (tx: any) => {
            await lockOrderRow(tx, orderId);
            const duplicate = await tx.payment.findFirst({ where: { orderId, reference } });
            const fresh = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
            if (duplicate) return { replay: true, payment: duplicate, order: fresh };

            if (!fresh || fresh.deletedAt) throw new InstallmentError('ORDER_NOT_FOUND', 404);
            if (parseDepositPlan(fresh.depositPlan) == null) throw new InstallmentError('INSTALLMENT_NO_PLAN', 400);
            if (fresh.orderType !== 'RENT' || fresh.status !== 'RESERVED') throw new InstallmentError('INVALID_ORDER_STATUS', 400);

            const stage = effectivePlan(fresh, shop).find((candidate) => candidate.key === key);
            if (!stage) throw new InstallmentError('INSTALLMENT_NOT_FOUND', 404);
            const taken = (fresh.payments as any[]).some(
              (payment) => payment.status === 'COMPLETED' && payment.notes === INSTALLMENT_PAYMENT_NOTE && payment.installmentKey === key
            );
            if (taken || stage.paidAmount > 0) throw new InstallmentError('INSTALLMENT_ALREADY_PAID', 409);
            if (amount > stage.plannedAmount + 1e-9) throw new InstallmentError('INSTALLMENT_OVERPAID', 400);

            const payment = await tx.payment.create({
              data: {
                orderId,
                merchantId,
                amount,
                currency: shop.currency,
                method,
                type: 'ORDER_PAYMENT',
                status: 'COMPLETED',
                reference,
                notes: INSTALLMENT_PAYMENT_NOTE,
                installmentKey: key,
                description: note || null,
                processedAt,
                processedBy: String(user.id),
                metadata: JSON.stringify({ kind: 'COLLECT', source: 'INSTALLMENT', collectedOn: dayKey, plannedAmount: stage.plannedAmount }),
              },
            });
            await recomputeDepositFromPayments(tx, orderId);
            const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
            return { replay: false, payment, order };
          },
          { maxWait: 5000, timeout: 15000 }
        );
      } catch (error) {
        if (error instanceof InstallmentError) {
          return NextResponse.json(ResponseBuilder.error(error.code), { status: error.status });
        }
        // The partial unique index: another request collected this stage between our check and our insert
        if ((error as { code?: string })?.code === 'P2002') {
          return NextResponse.json(ResponseBuilder.error('INSTALLMENT_ALREADY_PAID'), { status: 409 });
        }
        throw error;
      }

      if (!result.replay) {
        await safeAudit('installment', () => createAuditHelper(prisma).logCustom({
          action: 'CUSTOM',
          entityType: 'Order',
          entityId: String(orderId),
          entityName: result.order?.orderNumber || String(orderId),
          description: `Deposit stage ${key} collected: ${amount}`,
          category: 'BUSINESS',
          newValues: { payment: { kind: 'COLLECT', stage: key, amount, method, collectedOn: dayKey } },
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
      }

      const data = {
        payment: result.payment,
        depositAmount: result.order?.depositAmount ?? 0,
        ...(result.order ? installmentsView(result.order, shop) : {}),
      };
      return NextResponse.json(
        ResponseBuilder.success(result.replay ? 'ORDER_PAYMENT_ALREADY_PROCESSED' : 'INSTALLMENT_COLLECTED', data),
        { status: result.replay ? 200 : 201 }
      );
    } catch (error) {
      console.error('Error collecting deposit stage:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

export const runtime = 'nodejs';
