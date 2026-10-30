/**
 * Product form (#547): one form for /products/add and /products/[id]/edit on the shell tokens.
 * Pure logic only (no @rentalshop/* import) so it is unit-tested in tests/web-products-form.test.ts.
 *
 * Rules are the old shared `ProductForm` (packages/ui/src/components/forms/ProductForm.tsx) and
 * `@rentalshop/utils` product-pricing-options (#460, same as iOS):
 * - #1249 (mockup the owner fixed last): "Theo lần" (the default for new orders), "Theo mỗi ngày" and "Theo block ngày"
 *   (the table, set up on its own screen) all exist together and are all sent: FIXED + DAILY + BLOCK; no default switch;
 * - prices are shown and sent only to users with products.manage who are not OUTLET_STAFF;
 * - #951: an empty price box is no price, 0 is a 0đ price; prices, deposit and outlet stock not negative; quantity > 0;
 * - photos: at most 3, jpg / png / webp, 5 MB each.
 */

import { blockComplete, type BlockDraft } from '../block-draft';

type Num = number | string | null | undefined;

export type PricingMode = 'FIXED' | 'DAILY';

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

const num = (n: unknown): number => {
  const v = typeof n === 'string' ? Number(n) : (n as number);
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};
const positive = (n: Num): number | null => {
  const v = num(n);
  return v > 0 ? v : null;
};
/** #951: a price box value: null / '' = no price, otherwise a number ≥ 0 (0 is a 0đ price). */
const priced = (n: Num): number | null => {
  if (n == null || n === '') return null;
  const v = typeof n === 'string' ? Number(n) : n;
  return Number.isFinite(v) && v >= 0 ? v : null;
};

// ----------------------------------------------------------------------------
// Sources
// ----------------------------------------------------------------------------

export interface PricingOptionSource {
  type?: string | null;
  blockTiers?: unknown;
  blockStartDay?: number | null;
  blockExtraMode?: string | null;
  blockExtraPrice?: number | null;
  price?: Num;
  isDefault?: boolean | null;
  isActive?: boolean | null;
}

export interface ProductSource {
  id?: number;
  name?: string | null;
  description?: string | null;
  barcode?: string | null;
  categoryId?: number | null;
  category?: { id?: number | null; name?: string | null } | null;
  rentPrice?: Num;
  salePrice?: Num;
  costPrice?: Num;
  deposit?: Num;
  pricingType?: string | null;
  pricingOptions?: PricingOptionSource[] | null;
  images?: unknown;
  outletStock?: Array<{
    outletId?: number | null;
    stock?: Num;
    renting?: Num;
    /** #1341 "Hiện ở chi nhánh"; an API from before the column sends none (read as listed) */
    isListed?: boolean | null;
    outlet?: { id?: number | null } | null;
  }> | null;
  embeddingGeneratedAt?: string | Date | null;
  /** #830: the other open branches, sent to OUTLET_ADMIN / OUTLET_INVENTORY only */
  otherOutlets?: unknown[] | null;
}

export interface OutletLite {
  id: number;
  name: string;
  address?: string | null;
  /** #1341: the default branch ticks first on a new product; a closed branch has no tick */
  isDefault?: boolean | null;
  isActive?: boolean | null;
}

// ----------------------------------------------------------------------------
// Pricing (copy of @rentalshop/utils product-pricing-options)
// ----------------------------------------------------------------------------

const activeOptions = (options?: PricingOptionSource[] | null) => (options || []).filter((o) => o && o.isActive !== false);
// #951: an option priced 0 is a 0đ price
const optionPrice = (options: PricingOptionSource[], mode: PricingMode): number | null =>
  priced(options.find((o) => String(o.type || '').toUpperCase() === mode)?.price);

/** Saved default: the default option (isDefault, else the first), else `pricingType`. */
export function defaultModeOf(p: Pick<ProductSource, 'pricingOptions' | 'pricingType'>): PricingMode {
  const options = activeOptions(p.pricingOptions);
  const option = options.find((o) => o.isDefault) || options[0];
  return String(option?.type || p.pricingType || '').toUpperCase() === 'DAILY' ? 'DAILY' : 'FIXED';
}

/** Per-rental and per-day prices; a product without options uses `rentPrice` (> 0; 0 there is "no price") for its `pricingType`. */
export function rentalPricesOf(p: Pick<ProductSource, 'pricingOptions' | 'pricingType' | 'rentPrice'>): { perRental: number | null; perDay: number | null } {
  const options = activeOptions(p.pricingOptions);
  if (options.length > 0) return { perRental: optionPrice(options, 'FIXED'), perDay: optionPrice(options, 'DAILY') };
  const price = positive(p.rentPrice);
  const daily = String(p.pricingType || '').toUpperCase() === 'DAILY';
  return { perRental: daily ? null : price, perDay: daily ? price : null };
}

const BLOCK_DAYS_MAX = 31;

/** #1249: the saved day table (an active BLOCK option with usable tiers), or null */
export function savedBlockOf(p: Pick<ProductSource, 'pricingOptions'>): BlockDraft | null {
  const o = activeOptions(p.pricingOptions).find((x) => String(x.type || '').toUpperCase() === 'BLOCK');
  const tiers = o?.blockTiers;
  if (!o || !Array.isArray(tiers) || tiers.length < 1 || tiers.length > BLOCK_DAYS_MAX) return null;
  if (!tiers.every((t) => typeof t === 'number' && Number.isFinite(t) && t >= 0)) return null;
  const start = o.blockStartDay;
  return {
    tiers: [...(tiers as number[])],
    startDay: typeof start === 'number' && start >= 1 && start <= BLOCK_DAYS_MAX ? start : 1,
    extraMode: o.blockExtraMode === 'HOLD_LAST' ? 'HOLD_LAST' : 'EXTRA_PER_DAY',
    extraPrice: priced(o.blockExtraPrice),
  };
}

export interface PricingOptionPayload {
  type: PricingMode | 'BLOCK';
  price: number;
  isDefault: boolean;
  blockTiers?: number[];
  blockStartDay?: number | null;
  blockExtraMode?: string;
  blockExtraPrice?: number | null;
}

/**
 * #1249 the rent options the form sends: "Theo lần" (FIXED, the default for new orders), "Theo mỗi ngày" (DAILY, only
 * when its box has a price) and "Theo block ngày" (BLOCK, only when a complete table was saved), all together.
 * Without a "Theo lần" price the first of the others is the default.
 */
export function buildPricingOptions(p: { perRental: Num; perDay: Num; block: BlockDraft | null }): PricingOptionPayload[] {
  const out: PricingOptionPayload[] = [];
  const fixed = priced(p.perRental);
  if (fixed != null) out.push({ type: 'FIXED', price: fixed, isDefault: true });
  const daily = priced(p.perDay);
  if (daily != null) out.push({ type: 'DAILY', price: daily, isDefault: out.length === 0 });
  if (p.block && blockComplete(p.block)) {
    out.push({
      type: 'BLOCK',
      price: p.block.tiers[0] as number,
      isDefault: out.length === 0,
      blockTiers: p.block.tiers as number[],
      blockStartDay: p.block.startDay === 1 ? null : p.block.startDay,
      blockExtraMode: p.block.extraMode,
      blockExtraPrice: p.block.extraMode === 'EXTRA_PER_DAY' ? p.block.extraPrice ?? 0 : null,
    });
  }
  return out;
}

// ----------------------------------------------------------------------------
// Form state
// ----------------------------------------------------------------------------

export interface FormState {
  name: string;
  description: string;
  barcode: string;
  categoryId: number;
  /** #951: null = empty box (no price), 0 = 0đ. */
  perRental: number | null;
  perDay: number | null;
  /** The saved table (complete), or null when none was set up ("Chưa cài") */
  block: BlockDraft | null;
  deposit: number;
  /** null = empty box (nothing sent), 0 = 0đ. */
  salePrice: number | null;
  costPrice: number;
  /** Total quantity; with several outlets it is always the sum of `outletStock`. */
  totalStock: number;
  outletStock: Array<{ outletId: number; stock: number }>;
  /** #1341 "Hiện ở chi nhánh": the tick of each branch in the form (all branches, ticked or not) */
  listed: Record<number, boolean>;
  /** #1341: what the server has (edit); empty on a new product. `listingChanges` compares the two. */
  savedListed: Record<number, boolean>;
  /** Saved photo URLs still kept (edit). New files live next to the form, not in the state. */
  keptImages: string[];
}

/** Photo URLs (`images` is an array, a JSON array string, or a comma string on older rows). */
export function imagesOf(raw: unknown): string[] {
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
  return list.map((x) => (typeof x === 'string' ? x.trim() : '')).filter((x) => x.length > 0 && !x.startsWith('uploading-'));
}

/** Code for a new product: last 8 digits of the clock + 3 random digits (same as the old form). */
export function generateBarcode(now: number = Date.now(), random: number = Math.random()): string {
  return `${String(now).slice(-8)}${String(Math.floor(random * 1000)).padStart(3, '0')}`;
}

/**
 * #1341: the branch ticked on a new product: the branch chosen in the product list, else the default branch, else the first
 * (mockup B3c). undefined when the shop has no branch.
 */
export function defaultListedOutletId(outlets: OutletLite[], preferredId?: number | null): number | undefined {
  const open = outlets.filter((o) => o.isActive !== false);
  const pool = open.length > 0 ? open : outlets;
  return pool.find((o) => o.id === preferredId)?.id ?? pool.find((o) => o.isDefault)?.id ?? pool[0]?.id;
}

/**
 * #1341: a branch role is only given its own branch by the outlet list, so it cannot tell a one-branch shop from a
 * several-branch one. The product can: a row at every open branch (#825) or `otherOutlets` (#830). Several branches = the
 * greyed "Hiện ở chi nhánh" tick shows on its own row (mockup B3f). A new product (no rows yet) is not several.
 */
export function branchShopHasSeveralBranches(p: Pick<ProductSource, 'outletStock' | 'otherOutlets'> | null | undefined): boolean {
  if (!p) return false;
  return (p.outletStock?.length ?? 0) > 1 || (p.otherOutlets?.length ?? 0) > 0;
}

/** #1341: only the owner ticks / unticks "Hiện ở chi nhánh"; the other roles see the ticks greyed out. */
export function canTickBranches(role: string | null | undefined): boolean {
  return role === 'MERCHANT' || role === 'ADMIN';
}

/** New product: first category, a generated code, every outlet at 0, the chosen (or default) branch ticked. */
export function emptyForm(outlets: OutletLite[], categories: Array<{ id: number }>, barcode: string, listedOutletId?: number | null): FormState {
  const ticked = defaultListedOutletId(outlets, listedOutletId);
  return {
    name: '',
    description: '',
    barcode,
    categoryId: categories[0]?.id ?? 0,
    perRental: null,
    perDay: null,
    block: null,
    deposit: 0,
    salePrice: null,
    costPrice: 0,
    totalStock: 0,
    outletStock: outlets.map((o) => ({ outletId: o.id, stock: 0 })),
    listed: Object.fromEntries(outlets.map((o) => [o.id, o.id === ticked])),
    savedListed: {},
    keptImages: [],
  };
}

/** Edit: the saved product, one stock row per outlet of the shop (0 where it has none), total = their sum. */
export function formFromProduct(p: ProductSource, outlets: OutletLite[], categories: Array<{ id: number }>): FormState {
  const saved = new Map<number, number>();
  // #1341: a branch is ticked when its row says so (a row from an API without the column counts as ticked); no row = not ticked
  const listedRows = new Map<number, boolean>();
  for (const row of p.outletStock || []) {
    const id = row?.outlet?.id ?? row?.outletId;
    if (typeof id === 'number' && id > 0) {
      saved.set(id, Math.max(0, num(row.stock)));
      listedRows.set(id, row.isListed !== false);
    }
  }
  const outletStock = outlets.map((o) => ({ outletId: o.id, stock: saved.get(o.id) ?? 0 }));
  const listed = Object.fromEntries(outlets.map((o) => [o.id, listedRows.get(o.id) ?? false]));
  const { perRental, perDay } = rentalPricesOf(p);
  // each saved price fills its own row; no table = "Chưa cài"
  const table = savedBlockOf(p);
  return {
    name: p.name || '',
    description: p.description || '',
    barcode: p.barcode || '',
    categoryId: p.category?.id || p.categoryId || categories[0]?.id || 0,
    perRental,
    perDay,
    block: table,
    deposit: Math.max(0, num(p.deposit)),
    // a stored 0 sale price is "not for sale" (the apps save 0 for an empty box): shown empty
    salePrice: positive(p.salePrice),
    costPrice: Math.max(0, num(p.costPrice)),
    totalStock: outletStock.reduce((sum, r) => sum + r.stock, 0),
    outletStock,
    listed,
    savedListed: { ...listed },
    keptImages: imagesOf(p.images),
  };
}

/** Typed digits → whole number ≥ 0 (quantities). */
export function parseCount(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits ? Math.min(Number(digits), 1_000_000) : 0;
}

/** One outlet's quantity; with several outlets the total follows the sum. */
export function setOutletStock(form: FormState, outletId: number, stock: number): FormState {
  const outletStock = form.outletStock.map((r) => (r.outletId === outletId ? { ...r, stock: Math.max(0, stock) } : r));
  const totalStock = outletStock.length > 1 ? outletStock.reduce((sum, r) => sum + r.stock, 0) : outletStock[0]?.stock ?? form.totalStock;
  return { ...form, outletStock, totalStock };
}

/** #1341: tick or untick one branch in the form (nothing is sent until the form is saved). */
export function setOutletListed(form: FormState, outletId: number, isListed: boolean): FormState {
  return { ...form, listed: { ...form.listed, [outletId]: isListed } };
}

/** #1341: the ticks to send to PUT /api/products/listing after an edit: branches whose tick differs from the saved one. */
export function listingChanges(form: FormState): Array<{ outletId: number; isListed: boolean }> {
  return Object.keys(form.savedListed)
    .map(Number)
    .filter((id) => form.listed[id] !== undefined && form.listed[id] !== form.savedListed[id])
    .sort((a, b) => a - b)
    .map((outletId) => ({ outletId, isListed: form.listed[outletId] }));
}

/**
 * #1341 reminder under an unticked branch that still holds units (mockup B3e): "Còn N cái ở chi nhánh này (M đang thuê), vẫn
 * tính vào tổng nhưng không hiện khi tạo đơn." Never blocks anything. null = no reminder.
 */
export function listingReminder(row: { isListed: boolean; stock: number; renting: number }): { stock: number; renting: number } | null {
  if (row.isListed) return null;
  return row.stock > 0 || row.renting > 0 ? { stock: row.stock, renting: row.renting } : null;
}

/** The single quantity box (one outlet): the outlet row follows the total. */
export function setTotalStock(form: FormState, total: number): FormState {
  const totalStock = Math.max(0, total);
  const outletStock = form.outletStock.length === 1 ? [{ ...form.outletStock[0], stock: totalStock }] : form.outletStock;
  return { ...form, totalStock, outletStock };
}

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

export type FieldKey = 'name' | 'categoryId' | 'perRental' | 'salePrice' | 'deposit' | 'totalStock' | 'outletStock';
export type ErrorCode =
  | 'nameRequired'
  | 'categoryRequired'
  | 'priceNegative'
  | 'depositNegative'
  | 'stockRequired'
  | 'outletStockNegative';

/** Field order on the page (first error gets focus). */
export const FIELD_ORDER: FieldKey[] = ['name', 'perRental', 'salePrice', 'deposit', 'totalStock', 'outletStock', 'categoryId'];

export function validateForm(form: FormState, opts: { canEditPricing: boolean }): Partial<Record<FieldKey, ErrorCode>> {
  const errors: Partial<Record<FieldKey, ErrorCode>> = {};
  if (!form.name.trim()) errors.name = 'nameRequired';
  if (!form.categoryId) errors.categoryId = 'categoryRequired';
  if (opts.canEditPricing) {
    if ((form.perRental ?? 0) < 0 || (form.perDay ?? 0) < 0) errors.perRental = 'priceNegative';
    if ((form.salePrice ?? 0) < 0) errors.salePrice = 'priceNegative';
    // #741: the sale price is optional (a rent-only product has 0, as the apps and the API create it)
  }
  if (form.deposit < 0) errors.deposit = 'depositNegative';
  if (!(form.totalStock > 0)) errors.totalStock = 'stockRequired';
  if (form.outletStock.some((r) => r.stock < 0)) errors.outletStock = 'outletStockNegative';
  return errors;
}

export function firstError(errors: Partial<Record<FieldKey, ErrorCode>>): FieldKey | null {
  return FIELD_ORDER.find((k) => errors[k]) ?? null;
}

// ----------------------------------------------------------------------------
// Payload
// ----------------------------------------------------------------------------

/** Branch roles (same list as `isOutletRole` in @rentalshop/constants; this module imports no @rentalshop/*). */
const BRANCH_ROLES = ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'];

/** #825: a branch role saves stock only at its own outlet. */
export function isBranchRole(role: string | null | undefined): boolean {
  return BRANCH_ROLES.includes(role ?? '');
}

/**
 * #825 (owner 2026-10-11): name, prices, photos, category, code and description are shared by every branch. The owner,
 * OUTLET_ADMIN and OUTLET_INVENTORY change them and delete products; OUTLET_STAFF edits its own branch stock only.
 */
export function sharedFieldsLockedFor(role: string | null | undefined): boolean {
  return role === 'OUTLET_STAFF';
}

/** #825 (owner 2026-10-11): outlet staff do not add products (the API refuses it). */
export function roleMayCreateProducts(role: string | null | undefined): boolean {
  return role !== 'OUTLET_STAFF';
}

/**
 * #825: whether a branch holds the product (units on the shelf or out on rent there). Every product has a row at every
 * outlet, 0 where the branch never stocked it; OUTLET_ADMIN / kho change shared fields only of products they hold.
 */
export function branchHoldsProduct(p: Pick<ProductSource, 'outletStock'> & { outletStock?: Array<{ renting?: Num }> | null }, outletId: number | undefined): boolean {
  if (!outletId) return false;
  const row = (p.outletStock || []).find((r) => (r?.outlet?.id ?? r?.outletId) === outletId) as { stock?: Num; renting?: Num } | undefined;
  return !!row && (num(row.stock) > 0 || num(row.renting) > 0);
}

export interface PayloadOptions {
  canEditPricing: boolean;
  /** #825: the branch of a branch-role user. Its stock row is the only one sent. */
  branchOutletId?: number;
  /** #825: edit by a role that may not change shared fields: only the id and the stock are sent. */
  stockOnly?: boolean;
  /** Edit only */
  productId?: number;
  merchantId?: number;
}

/** "Lưu bảng giá": the table goes into the form */
export function saveBlockTable(form: FormState, block: BlockDraft): FormState {
  return { ...form, block };
}

/** "Tắt giá theo khối ngày": the table is dropped (back to "Chưa cài"); the other two prices stay */
export function turnOffBlock(form: FormState): FormState {
  return { ...form, block: null };
}

/**
 * Body of POST /api/products (create) or PUT /api/products/[id] (edit), sent as the multipart `data` field with the
 * new photo files next to it (unchanged productsApi calls). Prices only with price rights; the API keeps the saved
 * prices otherwise. On edit `images` lists the saved photos to keep; the API adds the uploaded files after them.
 */
export function buildPayload(form: FormState, opts: PayloadOptions): Record<string, unknown> {
  const branch = opts.branchOutletId;
  // #1341: a NEW product with several branches carries the ticks (a branch role sends its own row only and the API lists it)
  const sendTicks = opts.productId == null && branch == null && form.outletStock.length > 1;
  const stockRows = form.outletStock
    .filter((r) => branch == null || r.outletId === branch)
    .map((r) => ({ outletId: r.outletId, stock: r.stock, ...(sendTicks ? { isListed: form.listed[r.outletId] === true } : {}) }));
  // #825: OUTLET_STAFF saves only its own stock on edit (the API refuses a changed shared field)
  if (opts.stockOnly && opts.productId != null) return { id: opts.productId, outletStock: stockRows };
  const pricing: Record<string, unknown> = {};
  if (opts.canEditPricing) {
    // #951: a typed 0 is a 0đ sale price; an empty box sends nothing
    if (priced(form.salePrice) != null) pricing.salePrice = form.salePrice;
    const options = buildPricingOptions(form);
    pricing.rentPrice = options.find((o) => o.isDefault)?.price ?? 0;
    pricing.pricingOptions = options;
    // The API keeps a saved table unless the client says it knows BLOCK (spec #1189 point 9): "Thuê theo ngày" must drop it
    pricing.pricingSchemaVersion = 2;
    if (form.costPrice > 0) pricing.costPrice = form.costPrice;
  }
  const base = {
    name: form.name.trim(),
    description: form.description,
    barcode: form.barcode.trim(),
    categoryId: form.categoryId,
    totalStock: form.totalStock,
    deposit: form.deposit,
    outletStock: stockRows,
    ...pricing,
  };
  // Create: the API schema requires rentPrice, so a user without price rights sends 0 (the API's own default,
  // same as iOS CreateProductRequest). Without it OUTLET_STAFF could not add a product ("rentPrice: Required").
  if (opts.productId == null) return { ...base, ...(opts.canEditPricing ? {} : { rentPrice: 0 }), images: [] };
  return {
    ...base,
    id: opts.productId,
    ...(opts.merchantId ? { merchantId: opts.merchantId } : {}),
    stock: form.totalStock,
    images: form.keptImages,
  };
}

// ----------------------------------------------------------------------------
// Photos
// ----------------------------------------------------------------------------

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

export type PhotoProblem = 'type' | 'size' | 'count';

/** Which picked files can be added next to `current` photos: type, size, then the 3-photo limit. */
export function checkPhotos<F extends FileLike>(current: number, files: F[]): { accepted: F[]; rejected: Array<{ name: string; problem: PhotoProblem }> } {
  const accepted: F[] = [];
  const rejected: Array<{ name: string; problem: PhotoProblem }> = [];
  for (const f of files) {
    const type = (f.type || '').toLowerCase();
    const okType = (PHOTO_TYPES as readonly string[]).includes(type) || (!type && /\.(jpe?g|png|webp)$/i.test(f.name));
    if (!okType) rejected.push({ name: f.name, problem: 'type' });
    else if (f.size > MAX_PHOTO_BYTES) rejected.push({ name: f.name, problem: 'size' });
    else if (current + accepted.length >= MAX_PHOTOS) rejected.push({ name: f.name, problem: 'count' });
    else accepted.push(f);
  }
  return { accepted, rejected };
}

/** Edit: every saved photo removed and none added keeps the saved ones (the API ignores an empty list). */
export function removedAllSavedPhotos(savedCount: number, keptCount: number, newCount: number): boolean {
  return savedCount > 0 && keptCount === 0 && newCount === 0;
}

/** Image-search state on the edit page. */
export function imageSearchState(indexedAt: unknown, busy: boolean): 'updating' | 'ready' | 'none' {
  if (busy) return 'updating';
  return indexedAt ? 'ready' : 'none';
}
