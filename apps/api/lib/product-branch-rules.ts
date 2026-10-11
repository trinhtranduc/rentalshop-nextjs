/**
 * #825 — products across branches (outlets).
 *
 * Name, prices, photos, category, description and the other product fields are shared by every branch of a shop:
 * only the merchant (and ADMIN) changes them. A branch role (`isOutletRole`) edits its own branch stock only.
 * Installed apps and stale web tabs send the whole product on every save, so a field counts as changed only when its
 * value differs from the stored one. Pure functions (no imports) so they are unit-tested on their own.
 */

type PricingOptionLike = { type?: unknown; price?: unknown; isDefault?: unknown; isActive?: unknown };

/** The PUT `data` JSON. */
export type ProductBody = Record<string, unknown>;

/** The stored product (`db.products.findById`). */
export interface StoredProduct {
  [field: string]: unknown;
  category?: { id?: number } | null;
  categoryId?: number | null;
  merchant?: { id?: number } | null;
  pricingOptions?: PricingOptionLike[] | null;
  pricingType?: string | null;
  isActive?: boolean | null;
}

/** Fields shared by every branch (checked for branch roles). */
export const SHARED_PRODUCT_FIELDS = [
  'name',
  'description',
  'barcode',
  'rentPrice',
  'salePrice',
  'costPrice',
  'deposit',
  'categoryId',
  'images',
  'isActive',
  'pricingType',
  'durationConfig',
  'pricingOptions',
  'merchantId',
] as const;

const text = (v: unknown): string => (v == null ? '' : String(v).trim());
const money = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

/** Photo URLs of a stored product (array, JSON array string, or comma string on older rows). */
function storedImages(raw: unknown): string[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string') {
    const s = raw.trim();
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        list = Array.isArray(parsed) ? parsed : [];
      } catch {
        list = [];
      }
    } else list = s.split(',');
  }
  return list.map(text).filter(Boolean);
}

/** Same filtering and default choice as the database layer (`normalizePricingOptions`). */
function pricingKey(options: unknown): string {
  const allowed = (Array.isArray(options) ? (options as PricingOptionLike[]) : []).filter(
    (o) => o && (o.type === 'FIXED' || o.type === 'DAILY') && Number(o.price) > 0 && o.isActive !== false
  );
  if (allowed.length === 0) return '';
  const def = allowed.find((o) => o.isDefault) || allowed[0];
  const prices = allowed.map((o) => `${String(o.type)}:${Number(o.price)}`).sort();
  return `${prices.join(',')}|default=${String(def.type)}`;
}

/**
 * Shared fields whose value in `body` (the PUT `data` JSON) differs from the stored `product` (`db.products.findById`).
 * A field left out of the body is unchanged. An empty `images` list means "keep the photos" (the route drops it).
 */
export function changedSharedFields(body: ProductBody, product: StoredProduct): string[] {
  const changed: string[] = [];
  const has = (k: string) => body[k] !== undefined;

  if (has('name') && text(body.name) !== text(product.name)) changed.push('name');
  for (const k of ['description', 'barcode', 'durationConfig']) {
    if (has(k) && text(body[k]) !== text(product[k])) changed.push(k);
  }
  // null and 0 are the same price (no sale price, no deposit)
  for (const k of ['rentPrice', 'salePrice', 'costPrice', 'deposit']) {
    if (has(k) && money(body[k]) !== money(product[k])) changed.push(k);
  }
  // 0 / null category keeps the saved one (database layer)
  if (has('categoryId') && body.categoryId != null && Number(body.categoryId) !== 0) {
    const stored = product.category?.id ?? product.categoryId;
    if (Number(body.categoryId) !== Number(stored)) changed.push('categoryId');
  }
  if (has('images')) {
    const next = (Array.isArray(body.images) ? body.images : storedImages(body.images)).map(text).filter(Boolean);
    const saved = storedImages(product.images);
    if (next.length > 0 && next.join('\n') !== saved.join('\n')) changed.push('images');
  }
  if (typeof body.isActive === 'boolean' && body.isActive !== (product.isActive !== false)) changed.push('isActive');
  if (has('pricingType') && body.pricingType != null && String(body.pricingType) !== String(product.pricingType ?? 'FIXED')) {
    changed.push('pricingType');
  }
  if (has('pricingOptions') && body.pricingOptions != null) {
    const stored: PricingOptionLike[] = product.pricingOptions && product.pricingOptions.length > 0
      ? product.pricingOptions
      : [{ type: product.pricingType || 'FIXED', price: product.rentPrice, isDefault: true }];
    if (pricingKey(body.pricingOptions) !== pricingKey(stored)) changed.push('pricingOptions');
  }
  if (has('merchantId') && body.merchantId != null && Number(body.merchantId) !== Number(product.merchant?.id)) {
    changed.push('merchantId');
  }
  return changed;
}

/** Stock rows a new product gets: the given ones, plus 0 at every other active outlet of the shop. */
export function zeroStockRowsForOtherOutlets(
  given: Array<{ outletId: number }>,
  activeOutletIds: number[]
): Array<{ outletId: number; stock: number }> {
  const present = new Set(given.map((r) => r.outletId));
  const out: Array<{ outletId: number; stock: number }> = [];
  for (const id of activeOutletIds) {
    if (!present.has(id)) {
      present.add(id);
      out.push({ outletId: id, stock: 0 });
    }
  }
  return out;
}
