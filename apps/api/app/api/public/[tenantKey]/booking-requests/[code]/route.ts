import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { buildCorsHeaders } from '@rentalshop/utils/server';
import { effectiveBookingStatus, maskPhone, planDayKey } from '../../../../../../lib/booking-requests';
import { publicJson, resolveBookingShop } from '../../../../../../lib/booking-public';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(request) });
}

/**
 * GET /api/public/[tenantKey]/booking-requests/[code] (#1124) — the customer's tracking page.
 * Status (PENDING past 24 h reads EXPIRED), Vietnam days, outlet, items, the order number once confirmed, the
 * reason when rejected. The phone is masked; nothing else about the shop's customers or stock.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantKey: string; code: string }> | { tenantKey: string; code: string } }
) {
  try {
    const { tenantKey, code } = await Promise.resolve(params);
    const resolved = await resolveBookingShop(request, tenantKey);
    if ('response' in resolved) return resolved.response;
    const { shop } = resolved;

    const normalized = String(code || '').trim().toUpperCase();
    const row = /^[A-Z0-9]{5}$/.test(normalized)
      ? await db.prisma.bookingRequest.findUnique({ where: { code: normalized }, include: { items: true } })
      : null;
    if (!row || row.merchantId !== shop.id) {
      return publicJson(request, ResponseBuilder.error('BOOKING_REQUEST_NOT_FOUND'), 404);
    }
    const outlet = await db.prisma.outlet.findUnique({ where: { id: row.outletId }, select: { id: true, name: true, phone: true, address: true } });
    const order = row.orderId
      ? await db.prisma.order.findUnique({ where: { id: row.orderId }, select: { id: true, orderNumber: true } })
      : null;

    return publicJson(request, ResponseBuilder.success('BOOKING_REQUEST_FOUND', {
      code: row.code,
      status: effectiveBookingStatus(row),
      shop: { name: shop.name, phone: shop.phone },
      outlet: outlet ? { id: outlet.id, name: outlet.name, phone: outlet.phone ?? null, address: outlet.address ?? null } : null,
      customerName: row.customerName,
      customerPhone: maskPhone(row.customerPhone),
      pickupDate: planDayKey(new Date(row.pickupPlanAt)),
      returnDate: planDayKey(new Date(row.returnPlanAt)),
      items: row.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice ?? null })),
      orderNumber: order?.orderNumber ?? null,
      rejectReason: row.rejectReason ?? null,
      rejectNote: row.rejectNote ?? null,
      expiresAt: new Date(row.expiresAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  } catch (error) {
    console.error('Error in GET /api/public/[tenantKey]/booking-requests/[code]:', error);
    const { response, statusCode } = handleApiError(error);
    return publicJson(request, response, statusCode);
  }
}
