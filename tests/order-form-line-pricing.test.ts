/**
 * #444: the web order form showed a per-day line total for a FIXED line when the
 * product's default option is per-day, while the saved total used FIXED.
 * The line's own pricing type must drive both the display and the saved total.
 */
import { describe, expect, it, jest } from '@jest/globals';

// #1621 the web cart (create-model) takes its pricing helpers from @rentalshop/utils; its barrel pulls in React files
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/order-line-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/rental-days') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-line-text') as object),
  ...(jest.requireActual('../packages/utils/src/core/hour-blocks') as object),
}));
import {
  computeOrderLineTotal,
  getOrderLineDisplay,
  repriceOrderLineForOrderType,
  resolveOrderLinePricingType,
  type OrderLinePricingItem,
} from '../packages/utils/src/core/order-line-pricing';
import {
  addProduct,
  buildPayload,
  cardPrices,
  computeTotals,
  hydrateLines,
  lineChoiceKey,
  lineFromOrderItem,
  lineHourBlock,
  lineHourChoices,
  lineModes,
  lineTotal,
  needsPrice,
  repriceLines,
  selectMode,
  setLinePrice,
  setQuantity,
  type CartLine,
  type ProductLike,
} from '../apps/client/app/orders/create/create-model';

// 2026-10-03 → 2026-10-05: pickup and return day both count = 3 days
const PICKUP = '2026-10-03';
const RETURN = '2026-10-05';
const DAYS = 3;

const dailyDefaultProduct = {
  pricingType: 'DAILY', // copied from the default option
  rentPrice: 100_000,
  salePrice: 900_000,
  pricingOptions: [
    { id: 11, type: 'FIXED', price: 150_000, isDefault: false },
    { id: 12, type: 'DAILY', price: 100_000, isDefault: true },
  ],
};

const fixedLine: OrderLinePricingItem = {
  quantity: 2,
  unitPrice: 150_000,
  pricingType: 'FIXED',
  selectedPricingOptionId: 11,
  product: dailyDefaultProduct,
};

const dailyLine: OrderLinePricingItem = {
  quantity: 2,
  unitPrice: 100_000,
  pricingType: 'DAILY',
  selectedPricingOptionId: 12,
  product: dailyDefaultProduct,
};

describe('order form line pricing (#444)', () => {
  it('shows a FIXED line on a DAILY-default product per rental, total = unit × qty', () => {
    const line = getOrderLineDisplay(fixedLine, 'RENT', PICKUP, RETURN);
    expect(line.isDaily).toBe(false);
    expect(line.days).toBe(1);
    expect(line.total).toBe(300_000);
    expect(computeOrderLineTotal(fixedLine, 'RENT', DAYS)).toBe(300_000);
  });

  it('totals a DAILY line as unit × qty × days', () => {
    const line = getOrderLineDisplay(dailyLine, 'RENT', PICKUP, RETURN);
    expect(line.isDaily).toBe(true);
    expect(line.days).toBe(DAYS);
    expect(line.total).toBe(600_000);
    expect(computeOrderLineTotal(dailyLine, 'RENT', DAYS)).toBe(600_000);
  });

  it('ignores days on a SALE order', () => {
    const line = getOrderLineDisplay(dailyLine, 'SALE', PICKUP, RETURN);
    expect(line.isDaily).toBe(false);
    expect(line.total).toBe(200_000);
    expect(computeOrderLineTotal(dailyLine, 'SALE', DAYS)).toBe(200_000);
  });

  it('uses the line type when a line is switched to DAILY without a DAILY option', () => {
    const line: OrderLinePricingItem = {
      quantity: 1,
      unitPrice: 50_000,
      pricingType: 'DAILY',
      selectedPricingOptionId: null,
      product: { pricingType: 'FIXED', rentPrice: 50_000, pricingOptions: [{ id: 21, type: 'FIXED', price: 50_000 }] },
    };
    expect(resolveOrderLinePricingType(line)).toBe('DAILY');
    expect(getOrderLineDisplay(line, 'RENT', PICKUP, RETURN).total).toBe(150_000);
    expect(computeOrderLineTotal(line, 'RENT', DAYS)).toBe(150_000);
  });

  it('falls back to the product type, then FIXED, when the line has no type', () => {
    expect(resolveOrderLinePricingType({ product: { pricingType: 'DAILY' } })).toBe('DAILY');
    expect(resolveOrderLinePricingType({})).toBe('FIXED');
  });

  it.each([
    ['FIXED line, RENT', fixedLine, 'RENT'],
    ['DAILY line, RENT', dailyLine, 'RENT'],
    ['DAILY line, SALE', dailyLine, 'SALE'],
    ['FIXED line, no options', { quantity: 3, unitPrice: 10_000, pricingType: 'FIXED', product: { pricingType: 'DAILY' } }, 'RENT'],
    ['no type, DAILY product', { quantity: 1, unitPrice: 10_000, product: { pricingType: 'DAILY' } }, 'RENT'],
  ] as const)('display total equals the saved total: %s', (_name, item, orderType) => {
    const shown = getOrderLineDisplay(item as OrderLinePricingItem, orderType, PICKUP, RETURN).total;
    expect(shown).toBe(computeOrderLineTotal(item as OrderLinePricingItem, orderType, DAYS));
  });

  it('reprices to the selected option when switching back to RENT', () => {
    expect(repriceOrderLineForOrderType(fixedLine, 'RENT', DAYS)).toEqual({ unitPrice: 150_000, totalPrice: 300_000 });
    expect(repriceOrderLineForOrderType(dailyLine, 'RENT', DAYS)).toEqual({ unitPrice: 100_000, totalPrice: 600_000 });
  });

  it('reprices to the sale price, unit × qty, when switching to SALE', () => {
    expect(repriceOrderLineForOrderType(dailyLine, 'SALE', DAYS)).toEqual({ unitPrice: 900_000, totalPrice: 1_800_000 });
  });
});

// ----------------------------------------------------------------------------
// #1621 hour blocks ("Theo khối giờ"): the owner's money examples on the web cart
// ----------------------------------------------------------------------------

const hourly = (id: number, hours: number, price: number) => ({ id, type: 'HOURLY', price, unit: 'HOUR', blockSize: hours, isDefault: false, isActive: true });
// Váy cưới trắng: Theo lần 500.000 · 2 giờ 150.000 · 4 giờ 250.000 · 8 giờ 400.000
const vay: ProductLike = {
  id: 1,
  name: 'Váy cưới trắng',
  rentPrice: 500_000,
  deposit: 500_000,
  pricingType: 'FIXED',
  pricingOptions: [{ id: 101, type: 'FIXED', price: 500_000, isDefault: true }, hourly(104, 8, 400_000), hourly(102, 2, 150_000), hourly(103, 4, 250_000)],
};
// Vest nam đen: Theo lần 250.000 · 2 giờ 80.000 · 8 giờ 200.000
const vest: ProductLike = {
  id: 2,
  name: 'Vest nam đen',
  rentPrice: 250_000,
  pricingType: 'FIXED',
  pricingOptions: [{ id: 201, type: 'FIXED', price: 250_000, isDefault: true }, hourly(202, 2, 80_000), hourly(203, 8, 200_000)],
};

const DAY = '2026-11-14';
const add = (lines: CartLine[], p: ProductLike) => addProduct(lines, p, 'RENT');
const last = (lines: CartLine[]) => lines[lines.length - 1];
const subtotal = (lines: CartLine[], days: number) =>
  computeTotals({ lines, orderType: 'RENT', days, discountType: 'amount', discountValue: 0, depositAmount: null, securityDeposit: 0 }).subtotal;
const payload = (lines: CartLine[], ret = DAY) =>
  buildPayload({ mode: 'create', orderType: 'RENT', customerId: 5, outletId: 3, pickup: DAY, ret, lines, discountType: 'amount', discountValue: 0, depositAmount: null, securityDeposit: 0, notes: '' });
/** A cart with one line of `p` put on the block of `hours` */
const onBlock = (lines: CartLine[], p: ProductLike, hours: number) => {
  const next = add(lines, p);
  const line = last(next);
  const choice = lineHourChoices(line).find((c) => c.hours === hours)!;
  return selectMode(next, line.key, choice.key);
};

describe('hour blocks on the web cart (#1621)', () => {
  it('a new line starts on the default price; each block is its own choice keyed by option id, shortest first', () => {
    const line = add([], vay)[0];
    expect(line.pricingType).toBe('FIXED');
    expect(line.unitPrice).toBe(500_000);
    expect(lineModes(line)).toEqual(['FIXED', 'DAILY']);
    expect(lineHourChoices(line)).toEqual([
      { key: 'HOURLY:102', id: 102, hours: 2, price: 150_000 },
      { key: 'HOURLY:103', id: 103, hours: 4, price: 250_000 },
      { key: 'HOURLY:104', id: 104, hours: 8, price: 400_000 },
    ]);
  });

  it('choosing "Khối 4 giờ" puts the line on that option (not the first HOURLY one)', () => {
    const line = onBlock([], vay, 4)[0];
    expect(line).toMatchObject({ pricingType: 'HOURLY', selectedPricingOptionId: 103, unitPrice: 250_000 });
    expect(lineHourBlock(line)).toMatchObject({ id: 103, blockSize: 4 });
    expect(lineChoiceKey(line)).toBe('HOURLY:103');
    expect(needsPrice(line, 'RENT')).toBe(false);
  });

  it.each([
    ['Váy · Khối 2 giờ', 1, 150_000, () => onBlock([], vay, 2)],
    ['Váy · Khối 4 giờ', 1, 250_000, () => onBlock([], vay, 4)],
    ['Vest · Khối 2 giờ, 2 bộ', 1, 160_000, () => { const l = onBlock([], vest, 2); return setQuantity(l, l[0].key, 2); }],
    ['Váy · Khối 4 giờ + Vest · Khối 2 giờ', 1, 330_000, () => onBlock(onBlock([], vay, 4), vest, 2)],
    ['Váy · Theo lần', 1, 500_000, () => add([], vay)],
    ['Váy · Khối 4 giờ, 14/11 → 16/11 (once, not × 3 days)', 3, 250_000, () => onBlock([], vay, 4)],
  ] as const)('%s, %i day(s) = %i', (_name, days, total, cart) => {
    expect(subtotal(cart(), days)).toBe(total);
  });

  it('the payload sends HOURLY with the block id, total = unit × qty, rentDays 1, even on a 3-day order', () => {
    const lines = onBlock(onBlock([], vay, 4), vest, 2);
    const body = payload(setQuantity(lines, lines[1].key, 2), '2026-11-16');
    expect(body.subtotal).toBe(250_000 + 160_000);
    expect(body.orderItems).toEqual([
      expect.objectContaining({ productId: 1, pricingType: 'HOURLY', pricingOptionId: 103, unitPrice: 250_000, totalPrice: 250_000, quantity: 1, rentDays: 1 }),
      expect.objectContaining({ productId: 2, pricingType: 'HOURLY', pricingOptionId: 202, unitPrice: 80_000, totalPrice: 160_000, quantity: 2, rentDays: 1 }),
    ]);
    expect(body.orderItems[0]).not.toHaveProperty('pricingSnapshot');
  });

  it('"Giá cho đơn này" belongs to the block it was typed on; Theo lần keeps its own price', () => {
    let lines = onBlock([], vay, 4);
    const key = lines[0].key;
    lines = setLinePrice(lines, key, 230_000);
    expect(lines[0].unitPrice).toBe(230_000);
    lines = selectMode(lines, key, 'HOURLY:102');
    expect(lines[0]).toMatchObject({ selectedPricingOptionId: 102, unitPrice: 150_000 });
    lines = selectMode(lines, key, 'FIXED');
    expect(lines[0]).toMatchObject({ pricingType: 'FIXED', selectedPricingOptionId: 101, unitPrice: 500_000 });
    lines = selectMode(lines, key, 'HOURLY:103');
    expect(lines[0]).toMatchObject({ pricingType: 'HOURLY', selectedPricingOptionId: 103, unitPrice: 230_000 });
    expect(payload(lines).orderItems[0]).toMatchObject({ pricingOptionId: 103, unitPrice: 230_000, totalPrice: 230_000 });
    // emptying the box goes back to the block's price
    expect(setLinePrice(lines, key, null)[0].unitPrice).toBe(250_000);
  });

  it('Thuê → Bán → Thuê keeps the block', () => {
    const lines = onBlock([], vay, 8);
    const back = repriceLines(repriceLines(lines, 'SALE'), 'RENT');
    expect(back[0]).toMatchObject({ pricingType: 'HOURLY', selectedPricingOptionId: 104, unitPrice: 400_000 });
    expect(lineTotal(back[0], 'RENT', 3)).toBe(400_000);
  });

  it('the product card never shows a block as a per-hour price', () => {
    expect(cardPrices(vay, 'RENT')).toEqual([{ type: 'FIXED', price: 500_000 }]);
  });

  it('the shared total prices an HOURLY line flat (never × days)', () => {
    expect(computeOrderLineTotal({ quantity: 2, unitPrice: 80_000, pricingType: 'HOURLY' }, 'RENT', 3)).toBe(160_000);
  });
});

describe('editing an order with an hour-block line (#1621)', () => {
  const item = (extra: object = {}) => ({
    productId: 1,
    product: { id: 1, name: 'Váy cưới trắng' },
    quantity: 1,
    unitPrice: 250_000,
    pricingType: 'HOURLY',
    pricingOptionId: 103,
    pricingSnapshot: { type: 'HOURLY', hours: 4, price: 250_000 },
    ...extra,
  });

  it('shows the block it was priced on; loading the product adds the other choices without a second "Khối 4 giờ"', () => {
    const line = lineFromOrderItem(item());
    expect(lineHourBlock(line)).toMatchObject({ id: 103, blockSize: 4 });
    const [hydrated] = hydrateLines([line], [vay]);
    expect(lineChoiceKey(hydrated)).toBe('HOURLY:103');
    expect(lineHourChoices(hydrated).map((c) => c.key)).toEqual(['HOURLY:102', 'HOURLY:103', 'HOURLY:104']);
    expect(lineModes(hydrated)).toEqual(['FIXED', 'DAILY']);
    const body = buildPayload({ mode: 'edit', orderType: 'RENT', customerId: 5, outletId: 3, pickup: DAY, ret: DAY, lines: [hydrated], discountType: 'amount', discountValue: 0, depositAmount: null, securityDeposit: 0, notes: '' });
    expect(body.orderItems[0]).toMatchObject({ pricingType: 'HOURLY', pricingOptionId: 103, unitPrice: 250_000, totalPrice: 250_000, rentDays: 1 });
  });

  it('a block whose option row is gone (product saved since) stays selected at its order price and is sent without an id', () => {
    const resaved: ProductLike = { ...vay, pricingOptions: [{ id: 111, type: 'FIXED', price: 500_000, isDefault: true }, hourly(112, 2, 150_000), hourly(113, 4, 260_000), hourly(114, 8, 400_000)] };
    const line = lineFromOrderItem(item({ pricingOptionId: null }));
    const [hydrated] = hydrateLines([line], [resaved]);
    expect(lineHourBlock(hydrated)).toMatchObject({ blockSize: 4, price: 250_000, fromOrder: true });
    expect(lineHourChoices(hydrated).map((c) => [c.hours, c.price])).toEqual([[2, 150_000], [4, 250_000], [8, 400_000]]);
    expect(hydrated.unitPrice).toBe(250_000);
    const body = buildPayload({ mode: 'edit', orderType: 'RENT', customerId: 5, outletId: 3, pickup: DAY, ret: DAY, lines: [hydrated], discountType: 'amount', discountValue: 0, depositAmount: null, securityDeposit: 0, notes: '' });
    expect(body.orderItems[0]).toMatchObject({ pricingType: 'HOURLY', unitPrice: 250_000, totalPrice: 250_000 });
    expect(body.orderItems[0]).not.toHaveProperty('pricingOptionId');
    // moving to a current block sends its id
    const moved = selectMode([hydrated], hydrated.key, 'HOURLY:112');
    expect(moved[0]).toMatchObject({ selectedPricingOptionId: 112, unitPrice: 150_000 });
  });

  it('an old per-hour line (no snapshot) stays as today: not a block, its HOURLY mode, its price', () => {
    const line = lineFromOrderItem({ productId: 9, product: { id: 9, name: 'Máy', pricingOptions: [{ id: 9, type: 'HOURLY', price: 20_000 }] }, quantity: 1, unitPrice: 20_000, pricingType: 'HOURLY' });
    expect(lineHourBlock(line)).toBeNull();
    expect(lineChoiceKey(line)).toBe('HOURLY');
    expect(lineModes(line)).toEqual(['FIXED', 'DAILY', 'HOURLY']);
    expect(lineHourChoices(line)).toEqual([]);
    expect(line.selectedPricingOptionId).toBe(9);
  });
});
