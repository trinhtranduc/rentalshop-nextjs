/**
 * #1124 — the shop behind a public booking URL: tenant key → active shop with online booking turned on.
 */
import { NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { ResponseBuilder } from '@rentalshop/utils';
import { buildCorsHeaders } from '@rentalshop/utils/server';
import { loadBookingShop } from './booking-requests';

export type BookingShop = { id: number; name: string; phone: string | null };

export function publicJson(request: Parameters<typeof buildCorsHeaders>[0], body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: buildCorsHeaders(request) });
}

/** The shop, or the error response to return (400 bad key, 404 unknown, 403 inactive / booking off) */
export async function resolveBookingShop(
  request: Parameters<typeof buildCorsHeaders>[0],
  tenantKey: string | undefined
): Promise<{ shop: BookingShop } | { response: ReturnType<typeof publicJson> }> {
  if (!tenantKey || !/^[a-z0-9-]+$/i.test(tenantKey)) {
    return { response: publicJson(request, ResponseBuilder.error('INVALID_TENANT_KEY'), 400) };
  }
  const found = await db.merchants.findByTenantKey(tenantKey);
  if (!found) return { response: publicJson(request, ResponseBuilder.error('MERCHANT_NOT_FOUND'), 404) };
  const merchant = await loadBookingShop(db.prisma, found.id);
  if (!merchant) return { response: publicJson(request, ResponseBuilder.error('MERCHANT_NOT_FOUND'), 404) };
  if (!merchant.isActive) return { response: publicJson(request, ResponseBuilder.error('MERCHANT_INACTIVE'), 403) };
  if (!merchant.onlineBookingEnabled) return { response: publicJson(request, ResponseBuilder.error('BOOKING_DISABLED'), 403) };
  return { shop: { id: merchant.id, name: merchant.name, phone: merchant.phone ?? null } };
}
