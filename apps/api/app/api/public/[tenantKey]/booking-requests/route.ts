import { NextRequest, NextResponse } from 'next/server';
import type { BookingRequest, BookingRequestItem } from '@prisma/client';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { buildCorsHeaders } from '@rentalshop/utils/server';
import {
  BOOKING_TTL_MS,
  RATE_PER_IP,
  RATE_PER_PHONE,
  bookingPlanDates,
  clientIpOf,
  generateBookingCode,
  loadBookingOutlet,
  normalizePhone,
  takeRateSlot,
  validateBookingDates,
} from '../../../../../lib/booking-requests';
import { publicJson, resolveBookingShop } from '../../../../../lib/booking-public';
import { notifyOutletBookingRequest } from '../../../../../lib/push-notifications';

const bodySchema = z.object({
  outletId: z.number().int().positive(),
  pickupDate: z.string(),
  returnDate: z.string(),
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(50) }))
    .min(1)
    .max(20),
  name: z.string().trim().min(1).max(120),
  phone: z.string().max(32),
  note: z.string().max(1000).optional().nullable(),
  /** Honeypot: hidden on the form; a bot fills it */
  website: z.string().max(500).optional().nullable(),
});

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(request) });
}

/**
 * POST /api/public/[tenantKey]/booking-requests (#1124) — a customer sends a booking request from the shop page.
 * No login. Honeypot `website` filled → a fake success, nothing saved. Limits: 5 / 10 min per IP (this instance)
 * and 3 / hour per phone and shop (database). Guests are not blocked for full days (#1174); the shop decides
 * at confirm. Nothing is held while the shop decides. 201 {code, status, expiresAt}.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantKey: string }> | { tenantKey: string } }
) {
  try {
    const { tenantKey } = await Promise.resolve(params);
    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return publicJson(request, ResponseBuilder.validationError(parsed.error.flatten()), 400);
    const input = parsed.data;
    const now = new Date();

    // Honeypot before any lookup: a bot learns nothing
    if (input.website && input.website.trim() !== '') {
      return publicJson(request, ResponseBuilder.success('BOOKING_REQUEST_CREATED', {
        code: generateBookingCode(),
        status: 'PENDING',
        expiresAt: new Date(now.getTime() + BOOKING_TTL_MS).toISOString(),
      }), 201);
    }

    const resolved = await resolveBookingShop(request, tenantKey);
    if ('response' in resolved) return resolved.response;
    const { shop } = resolved;

    const phone = normalizePhone(input.phone);
    if (!phone) return publicJson(request, ResponseBuilder.error('INVALID_PHONE'), 400);
    const dates = validateBookingDates(input.pickupDate, input.returnDate, now);
    if (!dates.ok) return publicJson(request, ResponseBuilder.error(dates.code), 400);

    const outlet = await loadBookingOutlet(db.prisma, shop.id, input.outletId);
    if (!outlet) return publicJson(request, ResponseBuilder.error('BOOKING_OUTLET_UNAVAILABLE'), 400);

    // Same product twice → one line with the summed quantity
    const wanted = new Map<number, number>();
    for (const item of input.items) wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
    const products = await db.prisma.product.findMany({
      where: { id: { in: [...wanted.keys()] }, merchantId: shop.id, isActive: true, deletedAt: null },
      select: { id: true, name: true, rentPrice: true },
    });
    if (products.length !== wanted.size) return publicJson(request, ResponseBuilder.error('PRODUCT_NOT_FOUND'), 400);

    const ip = clientIpOf(request);
    if (!takeRateSlot(`booking:ip:${ip}`, RATE_PER_IP.limit, RATE_PER_IP.windowMs, now.getTime())) {
      return publicJson(request, ResponseBuilder.error('BOOKING_RATE_LIMITED'), 429);
    }
    const recentFromPhone = await db.prisma.bookingRequest.count({
      where: { merchantId: shop.id, customerPhone: phone, createdAt: { gte: new Date(now.getTime() - RATE_PER_PHONE.windowMs) } },
    });
    if (recentFromPhone >= RATE_PER_PHONE.limit) {
      return publicJson(request, ResponseBuilder.error('BOOKING_RATE_LIMITED'), 429);
    }

    const { pickupPlanAt, returnPlanAt } = bookingPlanDates(input.pickupDate, input.returnDate);
    const byId = new Map(products.map((p) => [p.id, p]));
    let created: (BookingRequest & { items: BookingRequestItem[] }) | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        created = await db.prisma.bookingRequest.create({
          data: {
            code: generateBookingCode(),
            merchantId: shop.id,
            outletId: outlet.id,
            customerName: input.name.trim(),
            customerPhone: phone,
            note: input.note?.trim() || null,
            pickupPlanAt,
            returnPlanAt,
            expiresAt: new Date(now.getTime() + BOOKING_TTL_MS),
            clientIp: ip.slice(0, 64),
            items: {
              create: [...wanted.entries()].map(([productId, quantity]) => ({
                productId,
                quantity,
                productName: byId.get(productId)!.name,
                unitPrice: byId.get(productId)!.rentPrice ?? null,
              })),
            },
          },
          include: { items: true },
        });
      } catch (error) {
        if ((error as { code?: string })?.code !== 'P2002') throw error; // the random code was taken: draw another
      }
    }
    if (!created) throw new Error('Could not draw a free booking code');

    notifyOutletBookingRequest(outlet.id, {
      bookingRequestId: created.id,
      code: created.code,
      customerName: created.customerName,
      pickupDate: input.pickupDate,
      returnDate: input.returnDate,
      itemCount: [...wanted.values()].reduce((a, b) => a + b, 0),
    });

    return publicJson(request, ResponseBuilder.success('BOOKING_REQUEST_CREATED', {
      code: created.code,
      status: 'PENDING',
      expiresAt: new Date(created.expiresAt).toISOString(),
    }), 201);
  } catch (error) {
    console.error('Error in POST /api/public/[tenantKey]/booking-requests:', error);
    const { response, statusCode } = handleApiError(error);
    return publicJson(request, response, statusCode);
  }
}
