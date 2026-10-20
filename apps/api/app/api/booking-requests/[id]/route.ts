import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { firstShortDay, loadProductDays, planDayKey, shopBookingRow } from '../../../../lib/booking-requests';
import { bookingScope, findScopedRequest, outletNameMap } from '../../../../lib/booking-shop';

/**
 * GET /api/booking-requests/[id] (#1124) — one request for the shop: the row, each item's first short day for the
 * asked quantity today (null = still free every day), and the shop's customer with that phone if there is one.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);
  return withPermissions(['bookings.view'])(async (_request: NextRequest, { user, userScope }) => {
    try {
      const scope = bookingScope(user, userScope);
      if (!scope) return NextResponse.json(ResponseBuilder.error('NO_MERCHANT_ACCESS'), { status: 403 });
      const row = await findScopedRequest(db.prisma, Number(id), scope);
      if (!row) return NextResponse.json(ResponseBuilder.error('BOOKING_REQUEST_NOT_FOUND'), { status: 404 });

      const fromYmd = planDayKey(new Date(row.pickupPlanAt));
      const toYmd = planDayKey(new Date(row.returnPlanAt));
      const items = [];
      for (const item of row.items ?? []) {
        const days = await loadProductDays(db.prisma, { productId: item.productId, outletId: row.outletId, fromYmd, toYmd });
        items.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? null,
          shortDay: firstShortDay(days, item.quantity),
        });
      }
      const customer = await db.prisma.customer.findFirst({
        where: { merchantId: row.merchantId, phone: row.customerPhone, deletedAt: null },
        select: { id: true, firstName: true, lastName: true, phone: true },
      });
      const names = await outletNameMap(db.prisma, [row.outletId]);

      return NextResponse.json(ResponseBuilder.success('BOOKING_REQUEST_FOUND', {
        ...shopBookingRow(row, names),
        items,
        customer: customer ?? null,
      }));
    } catch (error) {
      console.error('Error in GET /api/booking-requests/[id]:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
