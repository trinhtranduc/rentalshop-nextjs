/**
 * #1631 Polar (https://polar.sh) for web card payments: config from env, the product map, the REST calls the API makes,
 * and the Standard Webhooks signature check (the same check as `@polar-sh/sdk` 1.3.2 `validateEvent`, without the
 * dependency). Payload shapes follow API version 2026-10.
 *
 * Env (all optional; Polar is off until POLAR_ACCESS_TOKEN and POLAR_PRODUCTS are set, and the web then keeps Lemon):
 * - POLAR_SERVER: `production` → https://api.polar.sh, anything else → https://sandbox-api.polar.sh
 * - POLAR_ACCESS_TOKEN: organization access token (checkouts, customer sessions, products)
 * - POLAR_WEBHOOK_SECRET: the endpoint secret (`whsec_…`)
 * - POLAR_PRODUCTS: `professional_semi_annual=<product id>,professional_annual=<product id>` (also `basic_…`)
 * - POLAR_API_BASE_URL: overrides the base URL (local e2e against a fake Polar only)
 *
 * Pure and import-light (relative imports) so the rule tests load it without the API build.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import type { PlanTier } from './plan-renewal';

export type PolarInterval = 'semi_annual' | 'annual';

export interface PolarProductRef {
  key: string;
  tier: PlanTier;
  interval: PolarInterval;
  months: 6 | 12;
  productId: string;
}

const PRODUCT_KEYS: Record<string, { tier: PlanTier; interval: PolarInterval; months: 6 | 12 }> = {
  basic_semi_annual: { tier: 'basic', interval: 'semi_annual', months: 6 },
  basic_annual: { tier: 'basic', interval: 'annual', months: 12 },
  professional_semi_annual: { tier: 'professional', interval: 'semi_annual', months: 6 },
  professional_annual: { tier: 'professional', interval: 'annual', months: 12 },
};

/** `professional_semi_annual=prod_1,professional_annual=prod_2` → refs; unknown keys and blank ids are left out */
export function parsePolarProducts(raw: string | null | undefined): PolarProductRef[] {
  const refs: PolarProductRef[] = [];
  for (const part of String(raw ?? '').split(',')) {
    const [rawKey, ...rest] = part.split('=');
    const key = String(rawKey ?? '').trim().toLowerCase();
    const productId = rest.join('=').trim();
    const known = PRODUCT_KEYS[key];
    if (!known || !productId || refs.some((r) => r.key === key)) continue;
    refs.push({ key, ...known, productId });
  }
  return refs;
}

export interface PolarConfig {
  enabled: boolean;
  server: 'sandbox' | 'production';
  baseUrl: string;
  accessToken: string | null;
  webhookSecret: string | null;
  products: PolarProductRef[];
}

export function polarConfig(env: Record<string, string | undefined> = process.env): PolarConfig {
  const server = String(env.POLAR_SERVER ?? '').trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
  const override = String(env.POLAR_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
  const baseUrl = override || (server === 'production' ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh');
  const accessToken = String(env.POLAR_ACCESS_TOKEN ?? '').trim() || null;
  const webhookSecret = String(env.POLAR_WEBHOOK_SECRET ?? '').trim() || null;
  const products = parsePolarProducts(env.POLAR_PRODUCTS);
  return { enabled: !!accessToken && products.length > 0, server, baseUrl, accessToken, webhookSecret, products };
}

/** The API version whose shapes this code reads (`Polar-Version` header, as the SDK sends it) */
export const POLAR_API_VERSION = '2026-10';

/** The customer id Polar keeps for a shop: Merchant.id, the same number RevenueCat sees as `merchant_<id>` */
export function polarExternalCustomerId(merchantId: number): string {
  return `merchant_${merchantId}`;
}

export function merchantIdFromExternal(externalId: string | null | undefined): number | null {
  const match = /^merchant_(\d+)$/.exec(String(externalId ?? '').trim());
  return match ? parseInt(match[1], 10) : null;
}

/** Currencies without a minor unit (Stripe's list, which Polar follows) */
const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

/** Polar amounts are minor units: 1799000 VND = 1.799.000 ₫, 4999 USD = $49.99 */
export function minorToMajor(amount: number, currency: string | null | undefined): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  return ZERO_DECIMAL.has(String(currency ?? '').toUpperCase()) ? value : Math.round(value) / 100;
}

export interface PolarPriceLike {
  amount_type?: string | null;
  price_currency?: string | null;
  price_amount?: number | null;
  is_archived?: boolean | null;
}

export interface PolarProductLike {
  id?: string;
  name?: string | null;
  is_archived?: boolean | null;
  recurring_interval?: string | null;
  recurring_interval_count?: number | null;
  prices?: PolarPriceLike[] | null;
}

/** The product's fixed price, the preferred currency (VND) first; null when it has none */
export function fixedPrice(product: PolarProductLike, prefer = 'vnd'): { amount: number; currency: string; minor: number } | null {
  const fixed = (product.prices ?? []).filter(
    (p) => p && p.amount_type === 'fixed' && !p.is_archived && typeof p.price_amount === 'number' && !!p.price_currency
  );
  const price = fixed.find((p) => String(p.price_currency).toLowerCase() === prefer.toLowerCase()) ?? fixed[0];
  if (!price) return null;
  const currency = String(price.price_currency).toUpperCase();
  return { amount: minorToMajor(price.price_amount as number, currency), currency, minor: price.price_amount as number };
}

/** month × 6 → 6; year × 1 or month × 12 → 12; anything else → null */
export function productMonths(product: Pick<PolarProductLike, 'recurring_interval' | 'recurring_interval_count'>): 6 | 12 | null {
  const count = Number(product.recurring_interval_count ?? 1) || 1;
  const months = product.recurring_interval === 'year' ? count * 12 : product.recurring_interval === 'month' ? count : 0;
  return months === 6 || months === 12 ? months : null;
}

// ─── Webhook signature (Standard Webhooks) ───────────────────────────────────

export const WEBHOOK_TOLERANCE_SECONDS = 300;

export type SignatureResult =
  | { ok: true }
  | { ok: false; reason: 'missing_headers' | 'invalid_timestamp' | 'too_old' | 'too_new' | 'no_match' };

/**
 * `webhook-signature` holds `v1,<base64 HMAC-SHA256 of "<webhook-id>.<webhook-timestamp>.<body>">` (space-separated). The
 * key is the secret's UTF-8 bytes or, for `whsec_<base64>`, the decoded bytes (the SDK tries both).
 */
export function verifyPolarSignature(input: {
  body: string;
  id: string | null | undefined;
  timestamp: string | null | undefined;
  signature: string | null | undefined;
  secret: string;
  now?: Date;
}): SignatureResult {
  const { body, id, timestamp, signature, secret } = input;
  if (!id || !timestamp || !signature || !secret) return { ok: false, reason: 'missing_headers' };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'invalid_timestamp' };
  const nowSeconds = (input.now ?? new Date()).getTime() / 1000;
  if (ts < nowSeconds - WEBHOOK_TOLERANCE_SECONDS) return { ok: false, reason: 'too_old' };
  if (ts > nowSeconds + WEBHOOK_TOLERANCE_SECONDS) return { ok: false, reason: 'too_new' };

  const content = `${id}.${Math.floor(ts)}.${body}`;
  const keys: Buffer[] = [Buffer.from(secret, 'utf8')];
  const remainder = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(remainder)) {
    const decoded = Buffer.from(remainder, 'base64');
    if (decoded.length > 0 && !decoded.equals(keys[0])) keys.push(decoded);
  }
  const expected = keys.map((key) => createHmac('sha256', key).update(content, 'utf8').digest());
  for (const part of signature.split(' ')) {
    const [version, value] = part.split(',', 2);
    if (version !== 'v1' || !value) continue;
    const received = Buffer.from(value, 'base64');
    if (expected.some((e) => e.length === received.length && timingSafeEqual(e, received))) return { ok: true };
  }
  return { ok: false, reason: 'no_match' };
}

// ─── REST ────────────────────────────────────────────────────────────────────

export class PolarApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    const detail = (body as { detail?: unknown } | null)?.detail;
    super(`Polar API error ${status}${typeof detail === 'string' ? `: ${detail}` : ''}`);
    this.status = status;
    this.body = body;
  }
}

export async function polarRequest<T>(config: PolarConfig, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!config.accessToken) throw new PolarApiError(503, { detail: 'POLAR_ACCESS_TOKEN is not set' });
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Polar-Version': POLAR_API_VERSION,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) throw new PolarApiError(res.status, json);
  return json as T;
}

const PRODUCT_TTL_MS = 5 * 60 * 1000;
const productCache = new Map<string, { at: number; product: PolarProductLike }>();

/** A product (cached 5 minutes: the plan page asks on every open) */
export async function getPolarProduct(config: PolarConfig, productId: string): Promise<PolarProductLike> {
  const cacheKey = `${config.baseUrl}|${productId}`;
  const hit = productCache.get(cacheKey);
  if (hit && Date.now() - hit.at < PRODUCT_TTL_MS) return hit.product;
  const product = await polarRequest<PolarProductLike>(config, `/v1/products/${encodeURIComponent(productId)}`);
  productCache.set(cacheKey, { at: Date.now(), product });
  return product;
}

export interface PolarCheckoutCreate {
  products: string[];
  external_customer_id: string;
  customer_email?: string | null;
  customer_name?: string | null;
  customer_ip_address?: string | null;
  currency?: string | null;
  metadata?: Record<string, string | number | boolean>;
  success_url: string;
  return_url?: string | null;
  locale?: string | null;
}

export function createPolarCheckout(config: PolarConfig, body: PolarCheckoutCreate): Promise<{ id: string; url: string; expires_at?: string }> {
  return polarRequest(config, '/v1/checkouts/', { method: 'POST', body });
}

export function createPolarCustomerSession(
  config: PolarConfig,
  body: { external_customer_id: string; return_url?: string | null }
): Promise<{ id: string; customer_portal_url: string; expires_at?: string }> {
  return polarRequest(config, '/v1/customer-sessions/', { method: 'POST', body });
}
