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

const positive = (value?: number | null): number | null => (value != null && value > 0 ? value : null);

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

/** Per-rental and per-day prices; a product without options uses `rentPrice` for its `pricingType`. */
export const getProductRentalPrices = (
  product: ProductPricingSource
): { perRental: number | null; perDay: number | null } => {
  const options = activeOptions(product.pricingOptions);
  if (options.length > 0) {
    return { perRental: priceOf(options, 'FIXED'), perDay: priceOf(options, 'DAILY') };
  }
  const price = positive(product.rentPrice);
  const isDaily = (product.pricingType || '').toUpperCase() === 'DAILY';
  return { perRental: isDaily ? null : price, perDay: isDaily ? price : null };
};

/**
 * Options sent on save, same payload as the mobile apps. The API keeps one default and copies its price
 * into `rentPrice`. A default without a price falls back to the mode that has one.
 */
export const buildProductPricingOptions = (
  perRental: number | null | undefined,
  perDay: number | null | undefined,
  defaultMode: ProductPricingMode
): ProductPricingOptionPayload[] => {
  const fixed = positive(perRental);
  const daily = positive(perDay);
  let mode = defaultMode;
  if (mode === 'DAILY' && daily == null) mode = 'FIXED';
  if (mode === 'FIXED' && fixed == null && daily != null) mode = 'DAILY';
  const result: ProductPricingOptionPayload[] = [];
  if (fixed != null) result.push({ type: 'FIXED', price: fixed, isDefault: mode === 'FIXED' });
  if (daily != null) result.push({ type: 'DAILY', price: daily, isDefault: mode === 'DAILY' });
  return result;
};

/** Form check: no negative price, and a per-day default needs a per-day price. Both prices may be empty. */
export const validateProductPricing = (input: {
  perRental?: number | null;
  perDay?: number | null;
  defaultMode: ProductPricingMode;
}): ProductPricingIssue[] => {
  const issues: ProductPricingIssue[] = [];
  if ((input.perRental ?? 0) < 0 || (input.perDay ?? 0) < 0) issues.push('negativeAmount');
  if (input.defaultMode === 'DAILY' && (input.perDay ?? 0) <= 0) issues.push('perDayDefaultNeedsPrice');
  return issues;
};
