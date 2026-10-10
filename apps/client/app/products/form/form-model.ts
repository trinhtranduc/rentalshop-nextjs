/**
 * Product form (#547): one form for /products/add and /products/[id]/edit on the shell tokens.
 * Pure logic only (no @rentalshop/* import) so it is unit-tested in tests/web-products-form.test.ts.
 *
 * Rules are the old shared `ProductForm` (packages/ui/src/components/forms/ProductForm.tsx) and
 * `@rentalshop/utils` product-pricing-options (#460, same as iOS):
 * - per-rental ("Theo lần") and per-day ("Theo ngày") prices are both optional; one is the default for new orders;
 * - prices are shown and sent only to users with products.manage who are not OUTLET_STAFF;
 * - Giá bán > 0 when prices are shown, quantity > 0, deposit / outlet stock not negative;
 * - photos: at most 3, jpg / png / webp, 5 MB each.
 */

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

// ----------------------------------------------------------------------------
// Sources
// ----------------------------------------------------------------------------

export interface PricingOptionSource {
  type?: string | null;
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
  outletStock?: Array<{ outletId?: number | null; stock?: Num; outlet?: { id?: number | null } | null }> | null;
  embeddingGeneratedAt?: string | Date | null;
}

export interface OutletLite {
  id: number;
  name: string;
  address?: string | null;
}

// ----------------------------------------------------------------------------
// Pricing (copy of @rentalshop/utils product-pricing-options)
// ----------------------------------------------------------------------------

const activeOptions = (options?: PricingOptionSource[] | null) => (options || []).filter((o) => o && o.isActive !== false);
const optionPrice = (options: PricingOptionSource[], mode: PricingMode): number | null =>
  positive(options.find((o) => String(o.type || '').toUpperCase() === mode)?.price);

/** Saved default: the default option (isDefault, else the first), else `pricingType`. */
export function defaultModeOf(p: Pick<ProductSource, 'pricingOptions' | 'pricingType'>): PricingMode {
  const options = activeOptions(p.pricingOptions);
  const option = options.find((o) => o.isDefault) || options[0];
  return String(option?.type || p.pricingType || '').toUpperCase() === 'DAILY' ? 'DAILY' : 'FIXED';
}

/** Per-rental and per-day prices; a product without options uses `rentPrice` for its `pricingType`. */
export function rentalPricesOf(p: Pick<ProductSource, 'pricingOptions' | 'pricingType' | 'rentPrice'>): { perRental: number | null; perDay: number | null } {
  const options = activeOptions(p.pricingOptions);
  if (options.length > 0) return { perRental: optionPrice(options, 'FIXED'), perDay: optionPrice(options, 'DAILY') };
  const price = positive(p.rentPrice);
  const daily = String(p.pricingType || '').toUpperCase() === 'DAILY';
  return { perRental: daily ? null : price, perDay: daily ? price : null };
}

export interface PricingOptionPayload {
  type: PricingMode;
  price: number;
  isDefault: boolean;
}

/** The default a set of prices can hold: a default without a price falls back to the mode that has one. */
export function effectiveDefaultMode(perRental: Num, perDay: Num, defaultMode: PricingMode): PricingMode {
  const fixed = positive(perRental);
  const daily = positive(perDay);
  if (defaultMode === 'DAILY' && daily == null) return 'FIXED';
  if (defaultMode === 'FIXED' && fixed == null && daily != null) return 'DAILY';
  return defaultMode;
}

/** "Mặc định khi tạo đơn" is only a choice when both prices are set; with one price, that one is the default. */
export function hasDefaultChoice(perRental: Num, perDay: Num): boolean {
  return positive(perRental) != null && positive(perDay) != null;
}

/** Priced options only, one default; a default without a price falls back to the mode that has one. */
export function buildPricingOptions(perRental: Num, perDay: Num, defaultMode: PricingMode): PricingOptionPayload[] {
  const fixed = positive(perRental);
  const daily = positive(perDay);
  const mode = effectiveDefaultMode(perRental, perDay, defaultMode);
  const out: PricingOptionPayload[] = [];
  if (fixed != null) out.push({ type: 'FIXED', price: fixed, isDefault: mode === 'FIXED' });
  if (daily != null) out.push({ type: 'DAILY', price: daily, isDefault: mode === 'DAILY' });
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
  perRental: number;
  perDay: number;
  defaultMode: PricingMode;
  deposit: number;
  salePrice: number;
  costPrice: number;
  /** Total quantity; with several outlets it is always the sum of `outletStock`. */
  totalStock: number;
  outletStock: Array<{ outletId: number; stock: number }>;
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

/** New product: first category, a generated code, every outlet at 0. */
export function emptyForm(outlets: OutletLite[], categories: Array<{ id: number }>, barcode: string): FormState {
  return {
    name: '',
    description: '',
    barcode,
    categoryId: categories[0]?.id ?? 0,
    perRental: 0,
    perDay: 0,
    defaultMode: 'FIXED',
    deposit: 0,
    salePrice: 0,
    costPrice: 0,
    totalStock: 0,
    outletStock: outlets.map((o) => ({ outletId: o.id, stock: 0 })),
    keptImages: [],
  };
}

/** Edit: the saved product, one stock row per outlet of the shop (0 where it has none), total = their sum. */
export function formFromProduct(p: ProductSource, outlets: OutletLite[], categories: Array<{ id: number }>): FormState {
  const saved = new Map<number, number>();
  for (const row of p.outletStock || []) {
    const id = row?.outlet?.id ?? row?.outletId;
    if (typeof id === 'number' && id > 0) saved.set(id, Math.max(0, num(row.stock)));
  }
  const outletStock = outlets.map((o) => ({ outletId: o.id, stock: saved.get(o.id) ?? 0 }));
  const { perRental, perDay } = rentalPricesOf(p);
  return {
    name: p.name || '',
    description: p.description || '',
    barcode: p.barcode || '',
    categoryId: p.category?.id || p.categoryId || categories[0]?.id || 0,
    perRental: perRental ?? 0,
    perDay: perDay ?? 0,
    defaultMode: defaultModeOf(p),
    deposit: Math.max(0, num(p.deposit)),
    salePrice: Math.max(0, num(p.salePrice)),
    costPrice: Math.max(0, num(p.costPrice)),
    totalStock: outletStock.reduce((sum, r) => sum + r.stock, 0),
    outletStock,
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

/** The single quantity box (one outlet): the outlet row follows the total. */
export function setTotalStock(form: FormState, total: number): FormState {
  const totalStock = Math.max(0, total);
  const outletStock = form.outletStock.length === 1 ? [{ ...form.outletStock[0], stock: totalStock }] : form.outletStock;
  return { ...form, totalStock, outletStock };
}

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

export type FieldKey = 'name' | 'categoryId' | 'perRental' | 'defaultMode' | 'salePrice' | 'deposit' | 'totalStock' | 'outletStock';
export type ErrorCode =
  | 'nameRequired'
  | 'categoryRequired'
  | 'priceNegative'
  | 'dailyNeedsPrice'
  | 'depositNegative'
  | 'stockRequired'
  | 'outletStockNegative';

/** Field order on the page (first error gets focus). */
export const FIELD_ORDER: FieldKey[] = ['name', 'perRental', 'defaultMode', 'salePrice', 'deposit', 'totalStock', 'outletStock', 'categoryId'];

export function validateForm(form: FormState, opts: { canEditPricing: boolean }): Partial<Record<FieldKey, ErrorCode>> {
  const errors: Partial<Record<FieldKey, ErrorCode>> = {};
  if (!form.name.trim()) errors.name = 'nameRequired';
  if (!form.categoryId) errors.categoryId = 'categoryRequired';
  if (opts.canEditPricing) {
    if (form.perRental < 0 || form.perDay < 0) errors.perRental = 'priceNegative';
    if (form.defaultMode === 'DAILY' && !(form.perDay > 0)) errors.defaultMode = 'dailyNeedsPrice';
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

export interface PayloadOptions {
  canEditPricing: boolean;
  /** Edit only */
  productId?: number;
  merchantId?: number;
}

/**
 * Body of POST /api/products (create) or PUT /api/products/[id] (edit), sent as the multipart `data` field with the
 * new photo files next to it (unchanged productsApi calls). Prices only with price rights; the API keeps the saved
 * prices otherwise. On edit `images` lists the saved photos to keep; the API adds the uploaded files after them.
 */
export function buildPayload(form: FormState, opts: PayloadOptions): Record<string, unknown> {
  const pricing: Record<string, unknown> = {};
  if (opts.canEditPricing) {
    const pricingOptions = buildPricingOptions(form.perRental, form.perDay, form.defaultMode);
    pricing.rentPrice = pricingOptions.find((o) => o.isDefault)?.price ?? 0;
    if (form.salePrice > 0) pricing.salePrice = form.salePrice;
    pricing.pricingOptions = pricingOptions;
    if (form.costPrice > 0) pricing.costPrice = form.costPrice;
  }
  const base = {
    name: form.name.trim(),
    description: form.description,
    barcode: form.barcode.trim(),
    categoryId: form.categoryId,
    totalStock: form.totalStock,
    deposit: form.deposit,
    outletStock: form.outletStock.map((r) => ({ outletId: r.outletId, stock: r.stock })),
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
