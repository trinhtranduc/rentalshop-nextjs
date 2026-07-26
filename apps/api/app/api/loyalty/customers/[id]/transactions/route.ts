import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { assertCustomerInMerchantScope } from '@rentalshop/loyalty';
import {
  handleApiError,
  loyaltyTransactionsQuerySchema,
  ResponseBuilder,
} from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);

  return withPermissions(['loyalty.view'])(async (_request, { user, userScope }) => {
    try {
      const merchantId = await resolveLoyaltyMerchantId(user, userScope);
      await withLoyaltyPlanGate(merchantId);

      const customerId = parseInt(id, 10);
      if (Number.isNaN(customerId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_CUSTOMER_ID'), { status: 400 });
      }

      await assertCustomerInMerchantScope(customerId, merchantId);

      const { searchParams } = new URL(request.url);
      const parsed = loyaltyTransactionsQuerySchema.safeParse(
        Object.fromEntries(searchParams.entries())
      );
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), {
          status: 400,
        });
      }

      const { page, limit, type } = parsed.data;
      const offset = (page - 1) * limit;

      const where: any = { customerId, merchantId };
      if (type) where.type = type;

      const [transactions, total] = await Promise.all([
        prisma.loyaltyTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.loyaltyTransaction.count({ where }),
      ]);

      const outletIds = [...new Set(transactions.map((tx) => tx.outletId).filter(Boolean))] as number[];
      const outlets =
        outletIds.length > 0
          ? await prisma.outlet.findMany({
              where: { id: { in: outletIds } },
              select: { id: true, name: true },
            })
          : [];
      const outletMap = new Map(outlets.map((outlet) => [outlet.id, outlet.name]));

      return NextResponse.json(
        ResponseBuilder.success('LOYALTY_TRANSACTIONS_FOUND', {
          transactions: transactions.map((tx) => ({
            ...tx,
            outletName: tx.outletId ? outletMap.get(tx.outletId) || null : null,
          })),
          total,
          page,
          limit,
        })
      );
    } catch (error) {
      const gateResponse = loyaltyErrorResponse(error);
      if (
        error instanceof Error &&
        ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED', 'CUSTOMER_NOT_FOUND'].includes(
          error.message
        )
      ) {
        return gateResponse;
      }
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
