/**
 * Product rental prices on the web product form and order form (#460).
 * Same rules as iOS `ProductPricing` / `ProductFormValidator` / `CartV2Logic.offersBothModes`
 * (`apps/mobile/POS ADBD/Model/ProductsV2.swift`): per-rental ("Theo lần") and per-day ("Theo ngày")
 * prices are both optional; one of them is the default for new orders.
 */

export type ProductPricingMode = 'FIXED' | 'DAILY';

export interface ProductPricingOptionLike {
  type: string;
  price: number;
  isDefault?: boolean | null;
  isActive?: boolean | null;
}

export interface ProductPricingSource {
  pricingType?: string | null;
  rentPrice?: number | null;
  pricingOptions?: ProductPricingOptionLike[] | null;
}

export interface ProductPricingOptionPayload {
  type: ProductPricingMode;
  price: number;
  isDefault: boolean;
}

export type ProductPricingIssue = 'negativeAmount' | 'perDayDefaultNeedsPrice';

const activeOptions = (options?: ProductPricingOptionLike[] | null): ProductPricingOptionLike[] =>
  (options || []).filter(option => option && option.isActive !== false);

const priceOf = (options: ProductPricingOptionLike[], mode: ProductPricingMode): number | null => {
  const price = Number(options.find(option => (option.type || '').toUpperCase() === mode)?.price);
  return price > 0 ? price : null;
};

/** #952: a saved option's price, 0đ included (#951); null when the product has no option of that mode. */
const optionPriceOf = (options: ProductPricingOptionLike[], mode: ProductPricingMode): number | null => {
  const option = options.find(o => (o.type || '').toUpperCase() === mode);
  if (!option || option.price == null) return null;
  const price = Number(option.price);
  return Number.isFinite(price) && price >= 0 ? price : null;
};

const positive = (value?: number | null): number | null => (value != null && value > 0 ? value : null);

/** #952: a price box value. null / undefined = an empty box (no price); 0 is a 0đ price (#951). */
const priced = (value?: number | null): number | null =>
  value != null && Number.isFinite(value) && value >= 0 ? value : null;

/** #952: what a price box holds: '' (or blanks) = no price (null), "0" = 0đ, "150,000" = 150000. */
export const readPriceBox = (text: string): number | null => {
  const clean = String(text ?? '').replace(/[^\d.]/g, '');
  if (!clean) return null;
  const value = parseFloat(clean);
  return Number.isFinite(value) ? value : null;
};

/** "Theo lần / Theo ngày" on an order line only when the product has a price for both. */
export const offersBothPricingModes = (options?: ProductPricingOptionLike[] | null): boolean => {
  const priced = activeOptions(options);
  return priceOf(priced, 'FIXED') != null && priceOf(priced, 'DAILY') != null;
};

/** The saved default: type of the default option (isDefault, else first), else `pricingType`. */
export const getProductDefaultPricingMode = (product: ProductPricingSource): ProductPricingMode => {
  const options = activeOptions(product.pricingOptions);
  const option = options.find(o => o.isDefault) || options[0];
  const type = (option?.type || product.pricingType || '').toUpperCase();
  return type === 'DAILY' ? 'DAILY' : 'FIXED';
};

/**
 * Per-rental and per-day prices; a saved 0đ option is a 0đ price (#952). A product without options uses
 * `rentPrice` (> 0; 0 there is "no price") for its `pricingType`.
 */
export const getProductRentalPrices = (
  product: ProductPricingSource
): { perRental: number | null; perDay: number | null } => {
  const options = activeOptions(product.pricingOptions);
  if (options.length > 0) {
    return { perRental: optionPriceOf(options, 'FIXED'), perDay: optionPriceOf(options, 'DAILY') };
  }
  const price = positive(product.rentPrice);
  const isDaily = (product.pricingType || '').toUpperCase() === 'DAILY';
  return { perRental: isDaily ? null : price, perDay: isDaily ? price : null };
};

/**
 * Options sent on save, same payload as the mobile apps. The API keeps one default and copies its price
 * into `rentPrice`. A default without a price falls back to the mode that has one.
 * #952: null / undefined is no price; 0 is a 0đ price and is sent.
 */
export const buildProductPricingOptions = (
  perRental: number | null | undefined,
  perDay: number | null | undefined,
  defaultMode: ProductPricingMode
): ProductPricingOptionPayload[] => {
  const fixed = priced(perRental);
  const daily = priced(perDay);
  let mode = defaultMode;
  if (mode === 'DAILY' && daily == null) mode = 'FIXED';
  if (mode === 'FIXED' && fixed == null && daily != null) mode = 'DAILY';
  const result: ProductPricingOptionPayload[] = [];
  if (fixed != null) result.push({ type: 'FIXED', price: fixed, isDefault: mode === 'FIXED' });
  if (daily != null) result.push({ type: 'DAILY', price: daily, isDefault: mode === 'DAILY' });
  return result;
};

/** Form check: no negative price, and a per-day default needs a per-day price (0đ is one, #952). Both prices may be empty. */
export const validateProductPricing = (input: {
  perRental?: number | null;
  perDay?: number | null;
  defaultMode: ProductPricingMode;
}): ProductPricingIssue[] => {
  const issues: ProductPricingIssue[] = [];
  if ((input.perRental ?? 0) < 0 || (input.perDay ?? 0) < 0) issues.push('negativeAmount');
  if (input.defaultMode === 'DAILY' && priced(input.perDay) == null) issues.push('perDayDefaultNeedsPrice');
  return issues;
};

/**
 * #952: the price fields of a product save (admin form): options from the two rental boxes, `rentPrice` = the
 * default option's price (0 when none), and `salePrice` only when its box holds a value (0 = 0đ). Same rule as the
 * shop web form (`apps/client/app/products/form/form-model.ts`, #951).
 */
export const buildProductFormPricing = (input: {
  perRental: number | null | undefined;
  perDay: number | null | undefined;
  defaultMode: ProductPricingMode;
  salePrice: number | null | undefined;
}): { rentPrice: number; salePrice?: number; pricingOptions: ProductPricingOptionPayload[] } => {
  const pricingOptions = buildProductPricingOptions(input.perRental, input.perDay, input.defaultMode);
  const sale = priced(input.salePrice);
  return {
    rentPrice: pricingOptions.find(o => o.isDefault)?.price ?? 0,
    ...(sale != null ? { salePrice: sale } : {}),
    pricingOptions,
  };
};
