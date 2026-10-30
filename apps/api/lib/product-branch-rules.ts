/**
 * #825 — products across branches (outlets).
 *
 * Name, prices, photos, category, description and the other product fields are shared by every branch of a shop:
 * the merchant (and ADMIN), OUTLET_ADMIN and OUTLET_INVENTORY change them and delete products (the branch roles only
 * for products stocked at their outlet). OUTLET_STAFF does not (owner 2026-10-11): it creates nothing, and with a
 * customised products.update it edits its own branch stock only. Every branch role writes stock only at its own outlet.
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

/** Branch roles that may not change shared product fields or delete products. */
export const SHARED_FIELDS_LOCKED_ROLES = ['OUTLET_STAFF'] as const;

/** True when this role edits only its own branch stock: no shared field, no photo, no delete. */
export function sharedFieldsLockedFor(role: string | null | undefined): boolean {
  return (SHARED_FIELDS_LOCKED_ROLES as readonly string[]).includes(role ?? '');
}

/** Fields shared by every branch (checked for roles in SHARED_FIELDS_LOCKED_ROLES). */
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

/** Same filtering and default choice as the database layer (`normalizePricingOptions`; #951: a 0đ option counts). */
function pricingKey(options: unknown): string {
  const allowed = (Array.isArray(options) ? (options as PricingOptionLike[]) : []).filter(
    (o) => o && (o.type === 'FIXED' || o.type === 'DAILY') && o.price != null && o.price !== '' && Number(o.price) >= 0 && o.isActive !== false
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

type OutletRowLike = { outletId?: number | null; outlet?: { id?: number; name?: string | null } | null; stock?: number | null; renting?: number | null };

/**
 * Whether the product is really held at this outlet: its row there has units on the shelf or out on rent.
 * Since #825 every product has a row at every active outlet (0 where the branch never stocked it), so a row alone
 * no longer means the branch holds it. OUTLET_ADMIN / OUTLET_INVENTORY change shared fields and delete only
 * products their outlet holds.
 */
export function holdsStockAt(outletStock: OutletRowLike[] | null | undefined, outletId: number | null | undefined): boolean {
  if (!outletId) return false;
  const row = (outletStock || []).find((r) => (r.outlet?.id ?? r.outletId) === outletId);
  return !!row && ((row.stock ?? 0) > 0 || (row.renting ?? 0) > 0);
}

/**
 * #1341 rule 15: OUTLET_ADMIN / OUTLET_INVENTORY change shared fields of a product their branch holds (above) OR lists
 * ("Hiện ở chi nhánh"), so a listed product that sold out can still be edited. Delete keeps `holdsStockAt`.
 */
export function holdsOrListsAt(
  outletStock: Array<OutletRowLike & { isListed?: boolean | null }> | null | undefined,
  outletId: number | null | undefined
): boolean {
  if (!outletId) return false;
  if (holdsStockAt(outletStock, outletId)) return true;
  const row = (outletStock || []).find((r) => (r.outlet?.id ?? r.outletId) === outletId);
  return !!row && row.isListed !== false;
}

/** Another outlet that still holds a product (#825 delete rule). */
export interface OtherOutletHold {
  id: number;
  name: string;
  stock: number;
  renting: number;
  /** RESERVED / PICKUPED (not deleted) orders of that outlet with a line of the product */
  openOrders: number;
}

/**
 * Outlets other than `ownOutletId` that hold the product: stock > 0, units on rent, or an open order there.
 * An OUTLET_ADMIN / OUTLET_INVENTORY deletes a product only when this is empty (owner 2026-10-11, #823).
 * `openOrders`: open order counts per outlet for this product.
 */
export function otherOutletsHolding(
  outletStock: OutletRowLike[] | null | undefined,
  ownOutletId: number | null | undefined,
  openOrders: Array<{ outletId: number; name: string; orders: number }>
): OtherOutletHold[] {
  const byId = new Map<number, OtherOutletHold>();
  for (const row of outletStock || []) {
    const id = row.outlet?.id ?? row.outletId;
    if (id == null || id === ownOutletId) continue;
    byId.set(id, { id, name: row.outlet?.name || '', stock: row.stock ?? 0, renting: row.renting ?? 0, openOrders: 0 });
  }
  for (const o of openOrders) {
    if (o.outletId === ownOutletId) continue;
    const hold = byId.get(o.outletId) || { id: o.outletId, name: o.name, stock: 0, renting: 0, openOrders: 0 };
    hold.openOrders += o.orders;
    if (!hold.name) hold.name = o.name;
    byId.set(o.outletId, hold);
  }
  return [...byId.values()]
    .filter((h) => h.stock > 0 || h.renting > 0 || h.openOrders > 0)
    .sort((a, b) => a.id - b.id);
}

/** Message parameter for PRODUCT_HELD_BY_OTHER_OUTLETS: "Main (3), Kho (0)" (name and stock on the shelf). */
export function heldOutletsLabel(holds: OtherOutletHold[]): string {
  return holds.map((h) => `${h.name} (${h.stock})`).join(', ');
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
