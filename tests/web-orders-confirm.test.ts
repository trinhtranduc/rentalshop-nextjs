/**
 * #569 shop web: the "Tạo đơn thuê?" / "Bán & thu tiền?" confirm, copied from iOS CreateOrderConfirmSheet.
 * Every amount must be the one in the request body (buildPayload) or the cart totals (computeTotals).
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it, jest } from '@jest/globals';

// The @rentalshop/utils barrel pulls in React files; the model only needs the pure pricing modules
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/order-line-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/rental-days') as object),
}));
import {
  addProduct,
  buildPayload,
  computeTotals,
  rentalDays,
  selectMode,
  setLinePrice,
  type CartLine,
  type OrderType,
  type PayloadInput,
  type ProductLike,
} from '../apps/client/app/orders/create/create-model';
import { confirmView } from '../apps/client/app/orders/create/confirm-model';

const WEEKDAYS = 'CN,T2,T3,T4,T5,T6,T7'.split(',');
const VEST: ProductLike = { id: 13, name: 'Vest đen', rentPrice: 34_000, salePrice: 201_000, deposit: 48_000, pricingOptions: [] };
const AO_DAI: ProductLike = { id: 5, name: 'Áo dài đỏ', rentPrice: 75_000, salePrice: 105_000, deposit: 13_000, pricingOptions: [] };

function cart(orderType: OrderType): CartLine[] {
  let lines = addProduct([], VEST, orderType);
  lines = addProduct(lines, VEST, orderType);
  lines = addProduct(lines, AO_DAI, orderType);
  if (orderType === 'RENT') {
    lines = selectMode(lines, 5, 'DAILY');
    lines = setLinePrice(lines, 5, 50_000);
  }
  return lines;
}

function scene(over: Partial<PayloadInput> & { loyaltyDiscount?: number; warnings?: string[] } = {}) {
  const orderType = over.orderType ?? 'RENT';
  const input: PayloadInput = {
    mode: 'create',
    orderType,
    customerId: 64,
    outletId: 1,
    pickup: orderType === 'RENT' ? '2026-10-08' : '',
    ret: orderType === 'RENT' ? '2026-10-16' : '',
    lines: cart(orderType),
    discountType: 'amount',
    discountValue: 30_000,
    depositAmount: null,
    securityDeposit: 200_000,
    notes: '',
    ...over,
  };
  const days = orderType === 'RENT' ? rentalDays(input.pickup, input.ret) : 0;
  const payload = buildPayload(input);
  const totals = computeTotals({ ...input, days, loyaltyDiscount: over.loyaltyDiscount });
  const view = confirmView({
    payload,
    totals,
    names: Object.fromEntries(input.lines.map((l) => [l.productId, l.name])),
    customer: { name: 'Trần Văn Minh', phone: '0901234567' },
    pickup: input.pickup,
    ret: input.ret,
    days,
    weekdays: WEEKDAYS,
    warnings: over.warnings ?? [],
  });
  return { payload, totals, view };
}

describe('rent', () => {
  it('copies the iOS rows: title, customer, days, items, total, deposit now', () => {
    const { payload, view } = scene();
    expect(view).toMatchObject({
      isSale: false,
      titleKey: 'rentTitle',
      customer: 'Trần Văn Minh',
      range: 'T5 08/10 → T6 16/10',
      days: 9,
      collectKey: 'collectDeposit',
      confirmKey: 'create',
      warnings: [],
    });
    expect(view.items).toEqual([
      { productId: 13, name: 'Vest đen', quantity: 2, days: null, total: 68_000 },
      { productId: 5, name: 'Áo dài đỏ', quantity: 1, days: 9, total: 450_000 },
    ]);
    // Same numbers as the body sent
    expect(view.items.map((i) => i.total)).toEqual(payload.orderItems.map((i) => i.totalPrice));
    expect(view.discount).toBe(payload.discountAmount);
    expect(view.discount).toBe(30_000);
    expect(view.total).toBe(payload.totalAmount);
    expect(view.total).toBe(488_000);
    // iOS collectNow (rent) = the deposit; Σ item deposit × qty until typed
    expect(view.collect).toBe(payload.depositAmount);
    expect(view.collect).toBe(48_000 * 2 + 13_000);
  });

  it('takes a typed deposit and a percentage discount from the payload', () => {
    const { payload, view } = scene({ depositAmount: 300_000, discountType: 'percentage', discountValue: 10 });
    expect(view.collect).toBe(300_000);
    expect(view.discount).toBe(payload.discountAmount);
    expect(view.discount).toBeCloseTo(51_800);
    expect(view.total).toBe(payload.totalAmount);
  });

  it('shows the overlap block and "Vẫn tạo đơn" when the shop allows overlaps', () => {
    const { view } = scene({ warnings: ['Vest đen thiếu 1 bộ ngày 08–10/10 (đã thuê ở #123456).'] });
    expect(view.warnings).toHaveLength(1);
    expect(view.confirmKey).toBe('createAnyway');
  });

  it('falls back to the phone, then to a dash, for the customer', () => {
    const { payload, totals } = scene();
    const base = { payload, totals, names: {}, pickup: '2026-10-08', ret: '2026-10-08', days: 1, weekdays: WEEKDAYS, warnings: [] };
    expect(confirmView({ ...base, customer: { name: ' ', phone: '0901234567' } }).customer).toBe('0901234567');
    expect(confirmView({ ...base, customer: null }).customer).toBe('—');
    expect(confirmView({ ...base, customer: null }).range).toBe('T5 08/10 → T5 08/10');
  });
});

describe('sale', () => {
  it('asks "Bán & thu tiền?" and collects the total now', () => {
    const { payload, totals, view } = scene({ orderType: 'SALE', discountValue: 0 });
    expect(view).toMatchObject({ isSale: true, titleKey: 'saleTitle', range: null, days: null, collectKey: 'collectSale', confirmKey: 'sell' });
    expect(view.items).toEqual([
      { productId: 13, name: 'Vest đen', quantity: 2, days: null, total: 402_000 },
      { productId: 5, name: 'Áo dài đỏ', quantity: 1, days: null, total: 105_000 },
    ]);
    expect(view.total).toBe(payload.totalAmount);
    expect(view.collect).toBe(totals.dueAtPickup);
    expect(view.collect).toBe(507_000);
  });

  it('takes reward points off the total and the amount now, as the cart does', () => {
    const { payload, totals, view } = scene({ orderType: 'SALE', discountValue: 0, loyaltyDiscount: 7_000 });
    expect(view.loyalty).toBe(7_000);
    expect(view.total).toBe(payload.totalAmount - totals.loyaltyDiscount);
    expect(view.collect).toBe(500_000);
  });

  it('never shows overlap warnings on a sale', () => {
    expect(scene({ orderType: 'SALE', warnings: ['x'] }).view).toMatchObject({ warnings: [], confirmKey: 'sell' });
  });
});
