import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { BOOKING_STATUSES, expireDueRequests, shopBookingRow } from '../../../lib/booking-requests';
import { bookingScope, outletNameMap } from '../../../lib/booking-shop';

const querySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  outletId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/booking-requests?status&outletId&page&limit (#1124) — the shop's online booking requests, newest first,
 * with `counts` per status (for the "Đặt online" chip). PENDING past 24 h is stored as EXPIRED here (lazy expiry).
 * Merchant users: their shop (optionally one outlet). Outlet users: only their outlet.
 */
export const GET = withPermissions(['orders.view'])(async (request: NextRequest, { user, userScope }) => {
  try {
    const scope = bookingScope(user, userScope);
    if (!scope) return NextResponse.json(ResponseBuilder.error('NO_MERCHANT_ACCESS'), { status: 403 });
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success) return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    const { status, page, limit } = parsed.data;
    const outletId = scope.outletId ?? parsed.data.outletId;

    await expireDueRequests(db.prisma, scope.merchantId);

    const baseWhere: Record<string, unknown> = { merchantId: scope.merchantId, ...(outletId ? { outletId } : {}) };
    const where = { ...baseWhere, ...(status ? { status } : {}) };
    const [rows, total, grouped] = await Promise.all([
      db.prisma.bookingRequest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true },
      }),
      db.prisma.bookingRequest.count({ where }),
      db.prisma.bookingRequest.groupBy({ by: ['status'], where: baseWhere, _count: { _all: true } }),
    ]);
    const counts = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const g of grouped as Array<{ status: string; _count: { _all: number } }>) counts[g.status] = g._count._all;
    const names = await outletNameMap(db.prisma, rows.map((r) => r.outletId));

    return NextResponse.json(ResponseBuilder.success('BOOKING_REQUESTS_FOUND', {
      requests: rows.map((r) => shopBookingRow(r, names)),
      counts,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    }));
  } catch (error) {
    console.error('Error in GET /api/booking-requests:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
