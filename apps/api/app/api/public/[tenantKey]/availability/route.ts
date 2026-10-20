import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { buildCorsHeaders } from '@rentalshop/utils/server';
import { loadBookingOutlet, loadProductDays, publicDayStatuses, todayVnKey, validateCalendarWindow } from '../../../../../lib/booking-requests';
import { publicJson, resolveBookingShop } from '../../../../../lib/booking-public';

const querySchema = z.object({
  productId: z.coerce.number().int().positive(),
  outletId: z.coerce.number().int().positive(),
  from: z.string(),
  to: z.string(),
});

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(request) });
}

/**
 * GET /api/public/[tenantKey]/availability?productId&outletId&from=YYYY-MM-DD&to=YYYY-MM-DD (#1124)
 * Public booking calendar of one product at one outlet: `free` or `full` per Vietnam civil day (owner 2026-10-20:
 * no "few left", no quantities, no customer data). Days before today are `full`. At most 62 days.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantKey: string }> | { tenantKey: string } }
) {
  try {
    const { tenantKey } = await Promise.resolve(params);
    const resolved = await resolveBookingShop(request, tenantKey);
    if ('response' in resolved) return resolved.response;
    const { shop } = resolved;

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success || !validateCalendarWindow(parsed.data.from, parsed.data.to)) {
      return publicJson(request, ResponseBuilder.error('INVALID_DATE_RANGE'), 400);
    }
    const { productId, outletId, from, to } = parsed.data;

    const outlet = await loadBookingOutlet(db.prisma, shop.id, outletId);
    if (!outlet) return publicJson(request, ResponseBuilder.error('BOOKING_OUTLET_UNAVAILABLE'), 400);
    const products = await db.prisma.product.findMany({
      where: { id: { in: [productId] }, merchantId: shop.id, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (products.length === 0) return publicJson(request, ResponseBuilder.error('PRODUCT_NOT_FOUND'), 404);

    const days = await loadProductDays(db.prisma, { productId, outletId, fromYmd: from, toYmd: to });
    const statuses = publicDayStatuses(days, todayVnKey());
    return publicJson(request, ResponseBuilder.success('BOOKING_AVAILABILITY', { productId, outletId, from, to, days: statuses }));
  } catch (error) {
    console.error('Error in GET /api/public/[tenantKey]/availability:', error);
    const { response, statusCode } = handleApiError(error);
    return publicJson(request, response, statusCode);
  }
}
