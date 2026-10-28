import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { z } from 'zod';
import { safeAudit } from '../../../../../../../lib/change-timeline';
import {
  InstallmentError,
  findOrderInScope,
  installmentsView,
  isScopeError,
  loadShop,
  lockOrderRow,
  recomputeDepositFromPayments,
} from '../../../../../../../lib/installments';
import { INSTALLMENT_PAYMENT_NOTE } from '../../../../../../../../../packages/utils/src/core/deposit-plan';

const voidSchema = z.object({ note: z.string().trim().max(500).optional() });

/**
 * POST /api/orders/[orderId]/installments/[key]/void  (#1199)
 *
 * Undo a stage collected by mistake: the COMPLETED `Payment` of that stage becomes CANCELLED (this frees the
 * unique slot, so the stage can be collected again), `depositAmount` is recomputed, and the audit log records who
 * and why. Only the shop owner (MERCHANT) or a platform ADMIN. Nothing is deleted.
 * No such collected stage → 404 INSTALLMENT_NOT_FOUND. A cancelled or closed order → 400 INVALID_ORDER_STATUS.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; key: string }> | { orderId: string; key: string } }
) {
  const { orderId: rawOrderId, key } = await Promise.resolve(params);
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(rawOrderId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'), { status: 400 });
      }
      const orderId = parseInt(rawOrderId, 10);
      const parsed = voidSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const scoped = await findOrderInScope(db, user, userScope, orderId);
      if (isScopeError(scoped)) {
        return NextResponse.json(ResponseBuilder.error(scoped.code), { status: scoped.status });
      }
      const { merchantId } = scoped;
      const shop = await loadShop(prisma, merchantId);
      const note = parsed.data.note;

      let voided: { payment: any; order: any };
      try {
        voided = await prisma.$transaction(
          async (tx: any) => {
            await lockOrderRow(tx, orderId);
            const fresh = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
            if (!fresh || fresh.deletedAt) throw new InstallmentError('ORDER_NOT_FOUND', 404);
            if (['CANCELLED', 'RETURNED', 'COMPLETED'].includes(fresh.status)) throw new InstallmentError('INVALID_ORDER_STATUS', 400);
            const target = (fresh.payments as any[]).find(
              (payment) => payment.status === 'COMPLETED' && payment.notes === INSTALLMENT_PAYMENT_NOTE && payment.installmentKey === key
            );
            if (!target) throw new InstallmentError('INSTALLMENT_NOT_FOUND', 404);

            let previous: Record<string, unknown> = {};
            try {
              previous = target.metadata ? JSON.parse(target.metadata) : {};
            } catch {
              previous = {};
            }
            const payment = await tx.payment.update({
              where: { id: target.id },
              data: {
                status: 'CANCELLED',
                metadata: JSON.stringify({
                  ...previous,
                  voidedAt: new Date().toISOString(),
                  voidedBy: user.id,
                  ...(note ? { voidNote: note } : {}),
                }),
              },
            });
            await recomputeDepositFromPayments(tx, orderId);
            const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
            return { payment, order };
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
        entityName: voided.order?.orderNumber || String(orderId),
        description: `Deposit stage ${key} voided: ${voided.payment.amount}${note ? ` (${note})` : ''}`,
        category: 'BUSINESS',
        oldValues: { stage: key, amount: voided.payment.amount, status: 'COMPLETED' },
        newValues: { stage: key, status: 'CANCELLED', note: note ?? null },
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
        ResponseBuilder.success('INSTALLMENT_VOIDED', {
          payment: voided.payment,
          depositAmount: voided.order?.depositAmount ?? 0,
          ...(voided.order ? installmentsView(voided.order, shop) : {}),
        })
      );
    } catch (error) {
      console.error('Error voiding deposit stage:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

export const runtime = 'nodejs';
