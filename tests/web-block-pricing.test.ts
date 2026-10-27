/**
 * #1189 web: the product detail card model (block-model), the cart (create-model: a BLOCK line costs what the table
 * says for the order's days, same golden numbers as the API), the receipt text and the list label.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/order-line-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/rental-days') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-line-text') as object),
}));
import golden from './fixtures/block-pricing-golden.json';
import {
  addDay,
  draftFromProduct,
  previewFor,
  removeLastDay,
  savedBlock,
  setTier,
} from '../apps/client/app/products/block-model';
import {
  buildPayload,
  computeTotals,
  lineFromOrderItem,
  lineFromProduct,
  refreshBlockOptions,
  selectMode,
  setLinePrice,
  syncBlockPrices,
  lineModes,
  blockLineSnapshot,
} from '../apps/client/app/orders/create/create-model';
import { buildReceipt, itemCalcText } from '../apps/client/app/orders/receipt/receipt-model';
import { productPrices } from '../apps/client/app/products/list/list-model';
import { buildPayload as buildFormPayload, formFromProduct } from '../apps/client/app/products/form/form-model';
import { blockLineText } from '../packages/utils/src/core/block-line-text';
import { blockOldAppsFlag } from '../apps/client/app/settings/settings-model';
import { CLIENT_CAPABILITIES } from '../packages/utils/src/core/client-capabilities';

const T80 = golden.tables.vnd80;
const blockOption = (extra: object = {}) => ({
  id: 7,
  type: 'BLOCK',
  price: 80000,
  isDefault: true,
  blockTiers: T80.tiers,
  blockStartDay: null,
  blockExtraMode: 'EXTRA_PER_DAY',
  blockExtraPrice: 20000,
  ...extra,
});
const product = { id: 1, name: 'Áo dài', rentPrice: 80000, salePrice: 1500000, deposit: 500000, pricingType: 'FIXED', pricingOptions: [blockOption()] };

describe('the web declares block-pricing', () => {
  it('so GET /api/products returns the table and POST/PUT /api/orders check the price', () => {
    expect(CLIENT_CAPABILITIES).toContain('block-pricing');
  });
});

describe('block-model: the detail card', () => {
  it('reads a saved table and BLOCK as the default mode', () => {
    const d = draftFromProduct(product);
    expect(d.mode).toBe('BLOCK');
    expect(d.block).toEqual({ tiers: [80000, 100000, 120000], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: 20000 });
    expect(savedBlock({ pricingOptions: [{ type: 'BLOCK', blockTiers: [-1] }] })).toBeNull();
  });

  it('a plain product starts the table at its day price', () => {
    const d = draftFromProduct({ rentPrice: 90000, pricingType: 'DAILY', pricingOptions: [{ type: 'DAILY', price: 90000, isDefault: true }] });
    expect(d.mode).toBe('DAILY');
    expect(d.block.tiers).toEqual([90000]);
  });

  it('preview matches the golden numbers: 1, 3, 5 days', () => {
    const b = draftFromProduct(product).block;
    expect(previewFor(b, 1)!.total).toBe(80000);
    expect(previewFor(b, 3)!.total).toBe(120000);
    const five = previewFor(b, 5)!;
    expect(five).toMatchObject({ total: 160000, basePrice: 120000, extraDays: 2, blockDays: 3, extraPrice: 20000 });
    expect(previewFor({ ...b, extraMode: 'HOLD_LAST' }, 5)!.total).toBe(120000);
  });

  it('days stay numbered 1..N: add copies the last price, ✕ removes only the last, the first stays', () => {
    let b = draftFromProduct(product).block;
    b = addDay(b);
    expect(b.tiers).toEqual([80000, 100000, 120000, 120000]);
    b = removeLastDay(removeLastDay(removeLastDay(b)));
    expect(b.tiers).toEqual([80000]);
    expect(removeLastDay(b).tiers).toEqual([80000]);
    let full = { ...b, tiers: Array(31).fill(1) };
    expect(addDay(full).tiers).toHaveLength(31);
  });
});

describe('product form: a block product keeps its table (#1249)', () => {
  it('saving the form sends the table again; choosing Thuê theo ngày sends schema 2 so the API drops it', () => {
    const form = formFromProduct({ ...product, name: 'Áo dài', outletStock: [] } as never, [{ id: 3, name: 'A' }], [{ id: 1 }]);
    expect(form.dayKind).toBe('BLOCK');
    const payload = buildFormPayload({ ...form, totalStock: 2 }, { canEditPricing: true, productId: 1 });
    expect(payload).toHaveProperty('salePrice', 1500000);
    expect(payload).toHaveProperty('pricingSchemaVersion', 2);
    expect((payload.pricingOptions as Array<{ type: string }>).map((o) => o.type)).toContain('BLOCK');
    const once = buildFormPayload({ ...form, dayKind: 'DAY', perRental: 5000, totalStock: 2 }, { canEditPricing: true, productId: 1 });
    expect(once).toHaveProperty('pricingSchemaVersion', 2);
    expect((once.pricingOptions as Array<{ type: string }>).map((o) => o.type)).not.toContain('BLOCK');
  });
});

describe('list: price label', () => {
  it('a BLOCK option is the day-1 price, not a per-day price', () => {
    expect(productPrices(product)).toMatchObject({ block: 80000, day: null, once: null });
  });
});

describe('cart: a BLOCK line follows the order days (golden)', () => {
  const rent = (days: number) => {
    const line = lineFromProduct(product, 'RENT');
    return { line, synced: syncBlockPrices([line], 'RENT', days)[0] };
  };

  it('a new line starts on the BLOCK option', () => {
    const { line } = rent(1);
    expect(line.pricingType).toBe('BLOCK');
    expect(line.selectedPricingOptionId).toBe(7);
    expect(lineModes(line)).toContain('BLOCK');
  });

  it.each([[1, 80000], [2, 100000], [3, 120000], [5, 160000], [10, 260000]])('%i day(s) = %i', (days, total) => {
    const { synced } = rent(days);
    expect(synced.unitPrice).toBe(total);
    const t = computeTotals({ lines: [synced], orderType: 'RENT', days, discountType: 'amount', discountValue: 0, depositAmount: null, securityDeposit: 0 });
    expect(t.subtotal).toBe(total);
  });

  it('quantity multiplies; discount applies after the lines', () => {
    const { synced } = rent(5);
    const t = computeTotals({ lines: [{ ...synced, quantity: 2 }], orderType: 'RENT', days: 5, discountType: 'percentage', discountValue: 10, depositAmount: null, securityDeposit: 0 });
    expect(t.subtotal).toBe(320000);
    expect(t.totalAmount).toBe(288000);
  });

  it('payload: BLOCK type, option id, rentDays, total = unit × qty, no priceOverridden', () => {
    const { synced } = rent(5);
    const body = buildPayload({
      mode: 'create', orderType: 'RENT', customerId: 1, outletId: 3, pickup: '2026-11-14', ret: '2026-11-18',
      lines: [{ ...synced, quantity: 2 }], discountType: 'amount', discountValue: 0, depositAmount: null, securityDeposit: 0, notes: '',
    });
    expect(body.orderItems[0]).toMatchObject({ pricingType: 'BLOCK', pricingOptionId: 7, rentDays: 5, unitPrice: 160000, totalPrice: 320000 });
    expect(body.orderItems[0]).not.toHaveProperty('priceOverridden');
    expect(body.totalAmount).toBe(320000);
  });

  it('a hand-typed price is kept, sent with priceOverridden, and survives a change of days', () => {
    const { line } = rent(5);
    const typed = setLinePrice([line], line.key, 150000)[0];
    const kept = syncBlockPrices([typed], 'RENT', 8)[0];
    expect(kept.unitPrice).toBe(150000);
    const body = buildPayload({
      mode: 'create', orderType: 'RENT', customerId: 1, outletId: 3, pickup: '2026-11-14', ret: '2026-11-21',
      lines: [kept], discountType: 'amount', discountValue: 0, depositAmount: null, securityDeposit: 0, notes: '',
    });
    expect(body.orderItems[0]).toMatchObject({ pricingType: 'BLOCK', unitPrice: 150000, totalPrice: 150000, priceOverridden: true });
    // emptying the box goes back to the table
    const back = syncBlockPrices(setLinePrice([typed], typed.key, null), 'RENT', 5)[0];
    expect(back.unitPrice).toBe(160000);
  });

  it('switching the price type: menu offers BLOCK, other kinds keep working and non-BLOCK payloads carry no override', () => {
    const withDaily = { ...product, pricingOptions: [{ id: 5, type: 'DAILY', price: 90000, isDefault: false }, blockOption()] };
    const line = lineFromProduct(withDaily, 'RENT');
    const daily = selectMode([line], line.key, 'DAILY')[0];
    expect(daily.pricingType).toBe('DAILY');
    expect(daily.unitPrice).toBe(90000);
    const body = buildPayload({
      mode: 'create', orderType: 'RENT', customerId: 1, outletId: 3, pickup: '2026-11-14', ret: '2026-11-16',
      lines: [daily], discountType: 'amount', discountValue: 0, depositAmount: null, securityDeposit: 0, notes: '',
    });
    expect(body.orderItems[0]).toMatchObject({ pricingType: 'DAILY', totalPrice: 270000 });
    expect(body.orderItems[0]).not.toHaveProperty('priceOverridden');
    const again = selectMode([daily], daily.key, 'BLOCK')[0];
    expect(syncBlockPrices([again], 'RENT', 3)[0].unitPrice).toBe(120000);
  });

  it('a sale order never uses the table', () => {
    const line = lineFromProduct(product, 'SALE');
    expect(syncBlockPrices([line], 'SALE', 0)[0]).toBe(line);
    expect(line.unitPrice).toBe(1500000);
  });

  it('USD shops round once to the cent', () => {
    const usd = golden.tables.usd;
    const p = { ...product, pricingOptions: [blockOption({ blockTiers: usd.tiers, blockExtraPrice: usd.extraPrice })] };
    const l = syncBlockPrices([lineFromProduct(p, 'RENT')], 'RENT', 3, 0.01)[0];
    const expected = (golden.cases as Array<{ table: string; days: number; total: number }>).find((c) => c.table === 'usd' && c.days === 3);
    if (expected) expect(l.unitPrice).toBe(expected.total);
    else expect(l.unitPrice).toBe(15.5);
  });

  it('after BLOCK_PRICE_MISMATCH the lines take the reloaded table', () => {
    const { synced } = rent(5);
    const fresh = { ...product, pricingOptions: [blockOption({ blockTiers: [90000, 110000, 130000] })] };
    const next = syncBlockPrices(refreshBlockOptions([synced], [fresh]), 'RENT', 5);
    expect(next[0].unitPrice).toBe(170000);
  });

  it('editing an order keeps the table it was priced with (snapshot), not the product\'s new one', () => {
    const changed = { ...product, pricingOptions: [blockOption({ blockTiers: [1, 2, 3] })] };
    const line = lineFromOrderItem({
      product: changed, productId: 1, quantity: 1, unitPrice: 160000, pricingType: 'BLOCK', pricingOptionId: 7,
      pricingSnapshot: { type: 'BLOCK', tiers: [80000, 100000, 120000], startDay: 1, extraMode: 'EXTRA_PER_DAY', extraPrice: 20000 },
    });
    expect(line.customPrices).toEqual({});
    expect(syncBlockPrices([line], 'RENT', 5)[0].unitPrice).toBe(160000);
    const typed = lineFromOrderItem({ product, productId: 1, quantity: 1, unitPrice: 150000, pricingType: 'BLOCK', pricingSnapshot: { type: 'BLOCK', tiers: [80000], overridden: true } });
    expect(typed.customPrices).toEqual({ BLOCK: 150000 });
  });

  it('formula of the cart line: "Khối 3 ngày + 2 ngày thêm"', () => {
    const { synced } = rent(5);
    const snap = blockLineSnapshot(synced, 'RENT', 5)!;
    const text = blockLineText(snap, { block: 'Khối {n} ngày', blockExtra: 'Khối {n} ngày + {m} ngày thêm', days: '{n} ngày' }, (n) => `${n}`);
    expect(text.label).toBe('Khối 3 ngày + 2 ngày thêm');
    expect(text.formula).toBe('120000 (3 ngày) + 2 × 20000 = 160000');
  });
});

describe('receipt and order detail text from pricingSnapshot', () => {
  const words = { perDay: '/ngày', days: '{n} ngày', perHour: '/giờ', hours: '{n} giờ', block: 'Khối {n} ngày', blockExtra: 'Khối {n} ngày + {m} ngày thêm' };
  const snapshot = { type: 'BLOCK', days: 5, quantity: 1, unitPrice: 160000, totalPrice: 160000, basePrice: 120000, extraDays: 2, extraAmount: 40000, extraPrice: 20000 };

  it('prints the label and the formula', () => {
    expect(itemCalcText({ quantity: 1, unitPrice: 160000, totalPrice: 160000, pricingType: 'BLOCK', pricingSnapshot: snapshot }, true, words)).toBe(
      'Khối 3 ngày + 2 ngày thêm\n120.000đ (3 ngày) + 2 × 20.000đ = 160.000đ'
    );
  });

  it('inside the table: no extra part; quantity 2 shows 2 × (...)', () => {
    const inside = { type: 'BLOCK', days: 2, quantity: 2, unitPrice: 100000, totalPrice: 200000, basePrice: 100000, extraDays: 0, extraAmount: 0 };
    expect(itemCalcText({ quantity: 2, unitPrice: 100000, totalPrice: 200000, pricingType: 'BLOCK', pricingSnapshot: inside }, true, words)).toBe(
      'Khối 2 ngày\n2 × (100.000đ (2 ngày)) = 200.000đ'
    );
  });

  it('a line without a snapshot (or words) prints as before', () => {
    expect(itemCalcText({ quantity: 1, unitPrice: 160000, totalPrice: 160000, pricingType: 'BLOCK' }, true, words)).toBe('1 × 160.000đ = 160.000đ');
    expect(itemCalcText({ quantity: 1, unitPrice: 160000, totalPrice: 160000, pricingType: 'BLOCK', pricingSnapshot: snapshot }, true, { perDay: '/ngày', days: '{n} ngày', perHour: '/giờ', hours: '{n} giờ' })).toBe('1 × 160.000đ = 160.000đ');
  });

  it('buildReceipt gives the line the block text', () => {
    const r = buildReceipt({ orderType: 'RENT', orderNumber: '1', totalAmount: 160000, orderItems: [{ quantity: 1, unitPrice: 160000, totalPrice: 160000, pricingType: 'BLOCK', productName: 'Áo', pricingSnapshot: snapshot }] }, {}, words);
    expect(r.items[0].calc).toContain('Khối 3 ngày + 2 ngày thêm');
  });
});

describe('settings flag', () => {
  it('unknown until the profile is loaded, then recompute unless block', () => {
    expect(blockOldAppsFlag({})).toBeNull();
    expect(blockOldAppsFlag(null)).toBeNull();
    expect(blockOldAppsFlag({ blockPricing: { oldApps: 'recompute' } })).toBe('recompute');
    expect(blockOldAppsFlag({ blockPricing: { oldApps: 'block' } })).toBe('block');
    expect(blockOldAppsFlag({ blockPricing: { oldApps: 'x' } })).toBe('recompute');
  });
});
