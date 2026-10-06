/**
 * #567 — the shop's time zone for a request.
 *
 * Phase 1: not wired into any route yet (phase 2 replaces the Vietnam constant with `shopTimeZone(...)` in
 * every day-logic path). Import-light on purpose: the zone helpers are import-free and the Prisma client is
 * passed in (or loaded lazily), so unit tests can run it without a database.
 *
 * Rules (intent decision log):
 * - A user who belongs to a shop gets the shop's `Merchant.timezone`. A client-sent `timeZone` is ignored for
 *   them, so an old app with a hard-coded or device zone cannot split a shop's days.
 * - ADMIN / OPS without a shop: a valid `timeZone` query param, else Asia/Ho_Chi_Minh.
 * - A missing merchant row or an invalid stored value reads as Asia/Ho_Chi_Minh (today's behaviour).
 */
import { DEFAULT_SHOP_TIMEZONE, isValidTimeZone, resolveShopTimeZone } from '../../../packages/utils/src/core/timezone';

export { DEFAULT_SHOP_TIMEZONE, isValidTimeZone };

/** The Prisma delegate the resolver reads. Routes pass `db.prisma` (or nothing: it is loaded lazily). */
export type ShopTimeZoneClient = {
  merchant: {
    findUnique: (args: Record<string, unknown>) => Promise<{ timezone?: string | null } | null>;
  };
};

export interface ShopTimeZoneScope {
  merchantId?: number | null;
}

/** Minimal request surface: the URL for the ADMIN/OPS `timeZone` param. */
export interface ShopTimeZoneRequest {
  url?: string;
  nextUrl?: { searchParams?: URLSearchParams };
}

// One DB read per request: the answer is cached on the request object (or on the scope when there is none).
const cache = new WeakMap<object, Promise<string>>();

function timeZoneParam(request?: ShopTimeZoneRequest | null): string | null {
  if (!request) return null;
  try {
    const params = request.nextUrl?.searchParams ?? (request.url ? new URL(request.url).searchParams : null);
    const value = params?.get('timeZone')?.trim();
    return value && isValidTimeZone(value) ? value : null;
  } catch {
    return null;
  }
}

async function defaultClient(): Promise<ShopTimeZoneClient> {
  const { db } = await import('@rentalshop/database');
  return db.prisma as unknown as ShopTimeZoneClient;
}

async function resolve(
  userScope: ShopTimeZoneScope,
  request: ShopTimeZoneRequest | null | undefined,
  client: ShopTimeZoneClient | undefined
): Promise<string> {
  const merchantId = userScope?.merchantId;
  if (!merchantId) return timeZoneParam(request) ?? DEFAULT_SHOP_TIMEZONE;
  const prisma = client ?? (await defaultClient());
  const row = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { timezone: true } });
  return resolveShopTimeZone(row?.timezone);
}

/**
 * The IANA zone that splits this request's days. Cached per request (or per scope object without a request),
 * so several helpers in one handler cost one `Merchant` read.
 */
export function shopTimeZone(
  userScope: ShopTimeZoneScope,
  request?: ShopTimeZoneRequest | null,
  client?: ShopTimeZoneClient
): Promise<string> {
  const key = (request ?? userScope) as object | undefined;
  if (key && typeof key === 'object') {
    const hit = cache.get(key);
    if (hit) return hit;
    const pending = resolve(userScope, request, client).catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, pending);
    return pending;
  }
  return resolve(userScope ?? {}, request, client);
}

/**
 * Zone to store for a new shop from a register body (#567, decision: the registering device's zone). Lenient on
 * purpose: missing (old apps), not a string or unknown → Asia/Ho_Chi_Minh; register never fails on this field.
 */
export function registerTimeZone(body: unknown): string {
  const raw = body && typeof body === 'object' ? (body as { timezone?: unknown }).timezone : undefined;
  return resolveShopTimeZone(typeof raw === 'string' ? raw.trim() : raw);
}

/**
 * `{ timezone }` for a merchant payload (#567, additive). A row that carries the column always yields it (an
 * invalid stored value reads as Vietnam); a row without the column (not selected) adds nothing, and clients
 * read a missing `timezone` as Asia/Ho_Chi_Minh.
 */
export function merchantTimeZoneField(row: unknown): { timezone?: string } {
  if (!row || typeof row !== 'object' || !('timezone' in row)) return {};
  const value = (row as { timezone?: unknown }).timezone;
  if (value === undefined) return {};
  return { timezone: resolveShopTimeZone(value) };
}

/** Audit row for a shop time zone change (#567). An audit failure never fails the request. */
export async function recordShopTimeZoneChange(
  request: { headers: { get: (name: string) => string | null } },
  user: { id: number; email?: string; role: string },
  merchantId: number,
  merchantName: string | undefined,
  oldValue: string | null | undefined,
  newValue: string
): Promise<void> {
  try {
    const [{ prisma }, { createAuditHelper }] = await Promise.all([
      import('@rentalshop/database'),
      import('@rentalshop/utils/server'),
    ]);
    await createAuditHelper(prisma).logUpdate({
      entityType: 'Merchant',
      entityId: String(merchantId),
      entityName: merchantName,
      oldValues: { timezone: oldValue ?? null },
      newValues: { timezone: newValue },
      description: `Shop time zone changed: ${oldValue ?? 'unset'} → ${newValue}`,
      context: {
        userId: String(user.id),
        userEmail: user.email,
        userRole: user.role,
        merchantId: String(merchantId),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });
  } catch (error) {
    console.error('Audit log merchant timezone failed:', error);
  }
}
