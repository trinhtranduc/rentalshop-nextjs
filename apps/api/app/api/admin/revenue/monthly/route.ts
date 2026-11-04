import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { getLocalDateKey, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, PLATFORM_OPS_ROLES } from '@rentalshop/constants';
import {
  RECEIVED_STATUSES,
  REVENUE_PAYMENT_TYPES,
  buildRevenueReport,
  parseRevenueQuery,
  revenueFetchRange,
  type RevenuePaymentRow,
} from '../../../../../lib/admin-revenue';

/** The columns read from `Payment`, plus the shop name and the plan name. */
interface PaymentDbRow {
  id: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  processedAt: Date | null;
  createdAt: Date;
  refundedAt: Date | null;
  updatedAt: Date;
  merchantId: number | null;
  merchant?: { id: number; name: string } | null;
  subscription?: { plan: { name: string } | null } | null;
}

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
});

/**
 * GET /api/admin/revenue/monthly?month=YYYY-MM | ?year=YYYY   (#1482)
 *
 * Money received from plan payments for the admin Dashboard block "Doanh thu gói dịch vụ": VND total, daily series
 * (Vietnam civil days), by channel, the 12 months of the year, the latest 10 payments, other currencies on their own
 * line, and the refunds of the period (dated by `refundedAt`, never subtracted from the total).
 *
 * Access: ADMIN and OPS only (platform data, no merchant scope). A merchant or outlet role gets 403.
 * Indexed fields used: `Payment(status, processedAt)`, `Payment(status, refundedAt)`, `Payment(merchantId, status)`.
 */
export const GET = withAuthRoles([...PLATFORM_OPS_ROLES])(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
    });
    const query = parsed.success ? parseRevenueQuery(parsed.data) : null;
    if (!query) {
      return NextResponse.json(ResponseBuilder.error('INVALID_QUERY'), { status: API.STATUS.BAD_REQUEST });
    }

    const { start, end } = revenueFetchRange(query);
    const type = { in: [...REVENUE_PAYMENT_TYPES] };
    const receivedWhere = {
      type,
      status: { in: [...RECEIVED_STATUSES] },
      // a row that never got a processedAt counts by createdAt
      OR: [
        { processedAt: { gte: start, lte: end } },
        { processedAt: null, createdAt: { gte: start, lte: end } },
      ],
    };

    const rows: PaymentDbRow[] = await db.prisma.payment.findMany({
      where: receivedWhere,
      select: {
        id: true, amount: true, currency: true, method: true, status: true,
        processedAt: true, createdAt: true, refundedAt: true, updatedAt: true, merchantId: true,
        merchant: { select: { id: true, name: true } },
        subscription: { select: { plan: { select: { name: true } } } },
      },
    });

    const refundRows: PaymentDbRow[] = await db.prisma.payment.findMany({
      where: {
        type,
        status: 'REFUNDED',
        // a refund made before `refundedAt` existed counts by updatedAt
        OR: [
          { refundedAt: { gte: start, lte: end } },
          { refundedAt: null, updatedAt: { gte: start, lte: end } },
        ],
      },
      select: {
        id: true, amount: true, currency: true, method: true, status: true,
        processedAt: true, createdAt: true, refundedAt: true, updatedAt: true, merchantId: true,
      },
    });

    // "New" = the shop's first received payment. Shops paid before the range only renew: one distinct lookup.
    const merchantIds = [...new Set(rows.map((r) => r.merchantId).filter((id): id is number => id != null))];
    const earlier: { merchantId: number | null }[] = merchantIds.length
      ? await db.prisma.payment.findMany({
          where: {
            type,
            status: { in: [...RECEIVED_STATUSES] },
            merchantId: { in: merchantIds },
            OR: [{ processedAt: { lt: start } }, { processedAt: null, createdAt: { lt: start } }],
          },
          select: { merchantId: true },
          distinct: ['merchantId'],
        })
      : [];

    const toRow = (r: PaymentDbRow): RevenuePaymentRow => ({
      id: r.id,
      amount: r.amount,
      currency: r.currency,
      method: r.method,
      status: r.status,
      processedAt: r.processedAt ?? null,
      createdAt: r.createdAt,
      refundedAt: r.refundedAt ?? null,
      updatedAt: r.updatedAt,
      merchantId: r.merchantId ?? null,
      merchantName: r.merchant?.name ?? null,
      planName: r.subscription?.plan?.name ?? null,
    });

    const report = buildRevenueReport({
      query,
      todayKey: getLocalDateKey(new Date()),
      received: rows.map(toRow),
      refunded: refundRows.map(toRow),
      earlierMerchantIds: new Set(earlier.map((e) => e.merchantId).filter((id): id is number => id != null)),
    });

    return NextResponse.json(ResponseBuilder.success('ADMIN_REVENUE_SUCCESS', report));
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
