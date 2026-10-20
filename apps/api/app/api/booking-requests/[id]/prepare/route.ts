import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { effectiveBookingStatus, splitCustomerName } from '../../../../../lib/booking-requests';
import { bookingScope, findScopedRequest } from '../../../../../lib/booking-shop';

/**
 * POST /api/booking-requests/[id]/prepare (#1124) — "Xác nhận" on a request: find the shop's customer by phone (or
 * create one from the request's name and phone) and return what the cart needs to create the order. Creates no
 * order and does not change the request; POST /api/orders with `bookingRequestId` confirms it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);
  return withPermissions(['orders.create'])(async (_request: NextRequest, { user, userScope }) => {
    try {
      const scope = bookingScope(user, userScope);
      if (!scope) return NextResponse.json(ResponseBuilder.error('NO_MERCHANT_ACCESS'), { status: 403 });
      const row = await findScopedRequest(db.prisma, Number(id), scope);
      if (!row) return NextResponse.json(ResponseBuilder.error('BOOKING_REQUEST_NOT_FOUND'), { status: 404 });
      if (effectiveBookingStatus(row) !== 'PENDING') {
        return NextResponse.json(ResponseBuilder.error('BOOKING_REQUEST_CLOSED'), { status: 409 });
      }

      const select = { id: true, firstName: true, lastName: true, phone: true };
      type CustomerPick = { id: number; firstName: string; lastName: string | null; phone: string | null };
      const pick = (c: CustomerPick | null) => (c ? { id: c.id, firstName: c.firstName, lastName: c.lastName ?? null, phone: c.phone ?? null } : null);
      let customer = pick(await db.prisma.customer.findFirst({
        where: { merchantId: row.merchantId, phone: row.customerPhone, deletedAt: null },
        select,
      }));
      let customerCreated = false;
      if (!customer) {
        const { firstName, lastName } = splitCustomerName(row.customerName);
        try {
          const created = await db.prisma.customer.create({
            data: { merchantId: row.merchantId, firstName: firstName || row.customerName, lastName: lastName || null, phone: row.customerPhone },
          });
          customer = pick(created);
          customerCreated = true;
        } catch (error) {
          // (merchantId, phone) is unique: a soft-deleted customer still holds the phone → reuse that record
          if ((error as { code?: string })?.code !== 'P2002') throw error;
          customer = pick(await db.prisma.customer.findFirst({ where: { merchantId: row.merchantId, phone: row.customerPhone }, select }));
        }
      }

      return NextResponse.json(ResponseBuilder.success('BOOKING_REQUEST_PREPARED', {
        bookingRequestId: row.id,
        orderType: 'RENT',
        outletId: row.outletId,
        customer,
        customerCreated,
        pickupPlanAt: new Date(row.pickupPlanAt).toISOString(),
        returnPlanAt: new Date(row.returnPlanAt).toISOString(),
        notes: row.note ?? null,
        items: row.items.map((i) => ({ productId: i.productId, quantity: i.quantity, productName: i.productName })),
      }));
    } catch (error) {
      console.error('Error in POST /api/booking-requests/[id]/prepare:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
