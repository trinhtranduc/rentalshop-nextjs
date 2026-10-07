/**
 * #569 "Tạo đơn thuê?" / "Bán & thu tiền?" confirm before a new order, copied from iOS
 * (`CreateOrderSheetLogic.confirm`, `CreateOrderConfirmSheet`, `CartV2Logic.collectNow`).
 * Pure and free of `@rentalshop/*`: every amount is read from the payload about to be sent
 * (`buildPayload`) and from `computeTotals`, never worked out again here.
 */
import { formatDayLabel } from '../../dashboard/overview-model';

/** The fields of `buildPayload(...)` the dialog shows. */
export interface ConfirmPayload {
  orderType: 'RENT' | 'SALE';
  discountAmount: number;
  depositAmount: number;
  totalAmount: number;
  orderItems: Array<{
    productId: number;
    quantity: number;
    totalPrice: number;
    rentDays: number;
    pricingType: string;
  }>;
}

export interface ConfirmInput {
  payload: ConfirmPayload;
  /** From `computeTotals` with the loyalty discount: what the cart shows. */
  totals: { loyaltyDiscount: number; dueAtPickup: number };
  /** Cart line names by product id. */
  names: Record<number, string>;
  customer: { name: string; phone: string } | null;
  pickup: string;
  ret: string;
  /** Rental days (both ends), as the cart counts them. */
  days: number;
  weekdays: string[];
  /** Lines of the orange "Trùng lịch" block (shop allows overlaps). */
  warnings: string[];
}

export interface ConfirmItem {
  productId: number;
  name: string;
  quantity: number;
  /** "× n ngày" for a per-day line; null otherwise. */
  days: number | null;
  total: number;
}

export interface ConfirmView {
  isSale: boolean;
  titleKey: 'rentTitle' | 'saleTitle';
  customer: string;
  /** `T5 08/10 → T6 16/10`; null for a sale. */
  range: string | null;
  days: number | null;
  items: ConfirmItem[];
  discount: number;
  loyalty: number;
  /** Tổng đơn, as the cart shows it (after reward points). */
  total: number;
  collectKey: 'collectDeposit' | 'collectSale';
  /** Rent: the deposit sent; sale: what the customer pays now. */
  collect: number;
  warnings: string[];
  confirmKey: 'create' | 'sell' | 'createAnyway';
}

export function confirmView(input: ConfirmInput): ConfirmView {
  const { payload, totals } = input;
  const isSale = payload.orderType === 'SALE';
  const hasDays = !isSale && !!input.pickup && !!input.ret;
  const warnings = isSale ? [] : input.warnings;
  const customer = input.customer ? input.customer.name.trim() || input.customer.phone.trim() : '';
  return {
    isSale,
    titleKey: isSale ? 'saleTitle' : 'rentTitle',
    customer: customer || '—',
    range: hasDays ? `${formatDayLabel(input.pickup, input.weekdays)} → ${formatDayLabel(input.ret, input.weekdays)}` : null,
    days: hasDays ? input.days : null,
    items: payload.orderItems.map((item) => ({
      productId: item.productId,
      name: input.names[item.productId] ?? '',
      quantity: item.quantity,
      days: !isSale && item.pricingType === 'DAILY' ? item.rentDays : null,
      total: item.totalPrice,
    })),
    discount: payload.discountAmount,
    loyalty: totals.loyaltyDiscount,
    total: payload.totalAmount - totals.loyaltyDiscount,
    collectKey: isSale ? 'collectSale' : 'collectDeposit',
    collect: isSale ? totals.dueAtPickup : payload.depositAmount,
    warnings,
    confirmKey: warnings.length ? 'createAnyway' : isSale ? 'sell' : 'create',
  };
}
