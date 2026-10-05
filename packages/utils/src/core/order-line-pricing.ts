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

/** A new rent line starts on the per-rental option when there is one. */
export const getPreferredPricingOption = <T extends { type: string; isDefault?: boolean }>(options: T[]): T | null =>
  options.find(option => option.type === 'FIXED') ||
  options.find(option => option.isDefault) ||
  options[0] ||
  null;

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

/** Pricing type used for the line total and the saved order. */
export const resolveOrderLinePricingType = (item: OrderLinePricingItem): string => {
  const opt = resolveOrderLineOption(item);
  if (opt) return opt.type;
  return (item.pricingType || item.product?.pricingType || 'FIXED') as string;
};

/** Line total: unit × qty, times rental days for a per-day line of a RENT order. */
export const computeOrderLineTotal = (
  item: OrderLinePricingItem,
  orderType: OrderLineOrderType,
  days: number
): number => {
  const qty = item.quantity || 1;
  const unit = item.unitPrice || 0;
  if (orderType === 'RENT' && resolveOrderLinePricingType(item) === 'DAILY') {
    return unit * qty * Math.max(1, days);
  }
  return unit * qty;
};

/** What the line row shows: per day or not, the days counted, and the line total. */
export const getOrderLineDisplay = (
  item: OrderLinePricingItem,
  orderType: OrderLineOrderType,
  pickupDate?: string,
  returnDate?: string
): { isDaily: boolean; days: number; total: number } => {
  const isDaily = orderType === 'RENT' && (item.pricingType === 'DAILY' || item.product?.pricingType === 'DAILY');
  let days = 1;
  if (isDaily && pickupDate && returnDate) {
    // Pickup and return day both count (#351)
    days = countRentalDays(pickupDate, returnDate);
  }
  const lineDays = isDaily ? days : 1;
  return { isDaily, days: lineDays, total: (item.unitPrice || 0) * (item.quantity || 1) * lineDays };
};

/** Unit price and line total after the order switches between RENT and SALE. */
export const repriceOrderLineForOrderType = (
  item: OrderLinePricingItem,
  orderType: OrderLineOrderType,
  _days: number
): { unitPrice: number; totalPrice: number } => {
  const rentPrice = item.product?.rentPrice ?? 0;
  const salePrice = item.product?.salePrice ?? rentPrice;
  const unitPrice = orderType === 'RENT' ? rentPrice : salePrice;
  return { unitPrice, totalPrice: unitPrice * (item.quantity || 1) };
};
