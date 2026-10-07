/**
 * Order line pricing on the web order form (#444): which pricing type a line uses,
 * the line total, and the unit price after the order type changes.
 * Pure, so the form display, the subtotal and the saved payload share one rule.
 */
import { countRentalDays } from './rental-days';

export type OrderLineOrderType = 'RENT' | 'SALE';

export interface OrderLinePricingOption {
  id?: number | null;
  type: string;
  price: number;
  isDefault?: boolean;
}

export interface OrderLinePricingItem {
  quantity?: number | null;
  unitPrice?: number | null;
  pricingType?: string | null;
  selectedPricingOptionId?: number | null;
  product?: {
    pricingType?: string | null;
    pricingOptions?: OrderLinePricingOption[] | null;
    rentPrice?: number | null;
    salePrice?: number | null;
  } | null;
}

/**
 * A new rent line starts on the product's default option (#460, same as the iOS cart):
 * the active option marked default, else the first active option.
 */
export const getPreferredPricingOption = <T extends { type: string; isDefault?: boolean | null; isActive?: boolean | null }>(
  options: T[]
): T | null => {
  const active = (options || []).filter(option => option && option.isActive !== false);
  return active.find(option => option.isDefault) || active[0] || null;
};

const getOptions = (item: OrderLinePricingItem): OrderLinePricingOption[] =>
  (item.product?.pricingOptions as OrderLinePricingOption[] | null | undefined) || [];

/** The configured option a line uses: selected id, then the line's type, then the preferred option. */
export const resolveOrderLineOption = (item: OrderLinePricingItem): OrderLinePricingOption | null => {
  const opts = getOptions(item);
  if (opts.length === 0) return null;
  if (item.selectedPricingOptionId != null) {
    const found = opts.find(o => o.id === item.selectedPricingOptionId);
    if (found) return found;
  }
  if (item.pricingType) {
    const matchingType = opts.find(option => option.type === item.pricingType);
    if (matchingType) return matchingType;
  }
  return getPreferredPricingOption(opts);
};

/**
 * Pricing type of the line, used for the toggle, the display, the total and the saved order.
 * The line's own type wins (#444): `product.pricingType` only mirrors the product's default option,
 * so a FIXED line on a per-day-default product stays FIXED.
 */
export const resolveOrderLinePricingType = (item: OrderLinePricingItem): string => {
  if (item.pricingType) return item.pricingType.toUpperCase();
  const opt = resolveOrderLineOption(item);
  if (opt) return opt.type.toUpperCase();
  return (item.product?.pricingType || 'FIXED').toUpperCase();
};

const isDailyLine = (item: OrderLinePricingItem, orderType: OrderLineOrderType): boolean =>
  orderType === 'RENT' && resolveOrderLinePricingType(item) === 'DAILY';

/** Line total: unit × qty, times rental days for a per-day line of a RENT order. */
export const computeOrderLineTotal = (
  item: OrderLinePricingItem,
  orderType: OrderLineOrderType,
  days: number
): number => {
  const qty = item.quantity || 1;
  const unit = item.unitPrice || 0;
  return isDailyLine(item, orderType) ? unit * qty * Math.max(1, days) : unit * qty;
};

/**
 * What the line row shows: per day or not, the days counted, and the line total.
 * The total comes from `computeOrderLineTotal`, so it always equals the saved total.
 */
export const getOrderLineDisplay = (
  item: OrderLinePricingItem,
  orderType: OrderLineOrderType,
  pickupDate?: string,
  returnDate?: string
): { isDaily: boolean; days: number; total: number } => {
  const isDaily = isDailyLine(item, orderType);
  // Pickup and return day both count (#351); 1 without both dates
  const days = isDaily ? countRentalDays(pickupDate, returnDate) : 1;
  return { isDaily, days, total: computeOrderLineTotal(item, orderType, days) };
};

/**
 * Unit price and line total after the order switches between RENT and SALE.
 * SALE: sale price (fallback rent price), unit × qty.
 * RENT: the selected option's price (by id, else the option of the line's type), else rent price;
 * the total follows the per-day rule.
 */
export const repriceOrderLineForOrderType = (
  item: OrderLinePricingItem,
  orderType: OrderLineOrderType,
  days: number
): { unitPrice: number; totalPrice: number } => {
  const rentPrice = item.product?.rentPrice ?? 0;
  if (orderType === 'SALE') {
    const unitPrice = item.product?.salePrice ?? rentPrice;
    return { unitPrice, totalPrice: computeOrderLineTotal({ ...item, unitPrice }, 'SALE', days) };
  }
  const opts = getOptions(item);
  const lineType = resolveOrderLinePricingType(item);
  const selected =
    (item.selectedPricingOptionId != null ? opts.find(o => o.id === item.selectedPricingOptionId) : undefined) ??
    opts.find(o => (o.type || '').toUpperCase() === lineType);
  const unitPrice = selected?.price ?? rentPrice;
  return { unitPrice, totalPrice: computeOrderLineTotal({ ...item, unitPrice }, 'RENT', days) };
};
