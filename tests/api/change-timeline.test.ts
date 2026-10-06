/**
 * #519 — readable change history: snapshot builders, diff, kind classification, old-row fallback.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh; results must be identical (instants stay UTC ISO).
 */
import {
  buildChangeEntry,
  buildChangeTimeline,
  buildOrderAuditSnapshot,
  buildProductAuditSnapshot,
  classifyOrderUpdate,
  diffOrderSnapshots,
  diffProductSnapshots,
  safeAudit,
  type ChangeLogRow,
} from '../../apps/api/lib/change-timeline';

const staff = { firstName: 'Lan', lastName: 'Nguyễn', role: 'OUTLET_STAFF' };

function order(overrides: Record<string, any> = {}) {
  return {
    id: 5,
    orderNumber: 'ORD-001-000005',
    orderType: 'RENT',
    status: 'RESERVED',
    totalAmount: 1000000,
    depositAmount: 0,
    securityDeposit: 0,
    discountType: null,
    discountValue: 0,
    discountAmount: 0,
    damageFee: 0,
    lateFee: 0,
    pickupPlanAt: new Date('2026-10-02T17:00:00.000Z'),
    returnPlanAt: new Date('2026-10-04T17:00:00.000Z'),
    pickedUpAt: null,
    returnedAt: null,
    notes: null,
    notesImages: [],
    isReadyToDeliver: false,
    customerId: 77,
    customer: { id: 77, firstName: 'An', email: 'an@example.com', phone: '0900000000' },
    outletId: 1,
    orderItems: [
      { id: 1, productId: 10, quantity: 1, unitPrice: 300000, pricingType: 'FIXED', product: { id: 10, name: 'Áo dài lụa đỏ' } },
      { id: 2, productId: 11, quantity: 1, unitPrice: 700000, pricingType: 'FIXED', product: { id: 11, name: 'Vest đen slim' } },
    ],
    ...overrides,
  };
}

function updateRow(oldValues: any, newValues: any, extra: Partial<ChangeLogRow> = {}): ChangeLogRow {
  return {
    id: 1,
    action: 'UPDATE',
    createdAt: new Date('2026-10-06T08:10:00.000Z'),
    user: staff,
    details: JSON.stringify({ oldValues, newValues }),
    ...extra,
  };
}

function orderEntry(before: any, after: any) {
  return buildChangeEntry(
    updateRow(buildOrderAuditSnapshot(before), buildOrderAuditSnapshot(after)),
    'Order'
  );
}

describe('buildOrderAuditSnapshot (#519)', () => {
  it('keeps dates as UTC ISO, totals, deposits, note image count and items; drops customer data', () => {
    const snap = buildOrderAuditSnapshot(order({ notes: 'giao sớm', notesImages: ['a.jpg', 'b.jpg'] }));
    expect(snap.pickupPlanAt).toBe('2026-10-02T17:00:00.000Z');
    expect(snap.returnPlanAt).toBe('2026-10-04T17:00:00.000Z');
    expect(snap.totalAmount).toBe(1000000);
    expect(snap.depositAmount).toBe(0);
    expect(snap.noteImageCount).toBe(2);
    expect(snap.items).toEqual([
      { productId: 10, name: 'Áo dài lụa đỏ', quantity: 1, unitPrice: 300000, pricingType: 'FIXED' },
      { productId: 11, name: 'Vest đen slim', quantity: 1, unitPrice: 700000, pricingType: 'FIXED' },
    ]);
    expect(JSON.stringify(snap)).not.toMatch(/an@example\.com|0900000000|customerId/);
  });

  it('is idempotent (a stored snapshot normalises to itself) and JSON-safe', () => {
    const snap = buildOrderAuditSnapshot(order());
    const stored = JSON.parse(JSON.stringify(snap));
    expect(buildOrderAuditSnapshot(stored)).toEqual(snap);
  });

  it('reads a transformed order whose empty fields are `undefined` as null', () => {
    const snap = buildOrderAuditSnapshot({ notes: undefined, pickupPlanAt: undefined, status: 'RESERVED' });
    expect(snap.notes).toBeNull();
    expect(snap.pickupPlanAt).toBeNull();
  });

  it('returns {} for junk input', () => {
    expect(buildOrderAuditSnapshot(null)).toEqual({});
    expect(buildOrderAuditSnapshot('x')).toEqual({});
    expect(buildProductAuditSnapshot(undefined)).toEqual({});
  });
});

describe('order kinds (#519)', () => {
  it('ORDER_EDITED: return date 05/10 → 07/10 (VN civil days) and total', () => {
    const e = orderEntry(order(), order({ returnPlanAt: new Date('2026-10-06T17:00:00.000Z'), totalAmount: 1300000 }));
    expect(e.kind).toBe('ORDER_EDITED');
    expect(e.changes).toEqual([
      { field: 'returnPlanAt', from: '2026-10-04T17:00:00.000Z', to: '2026-10-06T17:00:00.000Z' },
      { field: 'totalAmount', from: 1000000, to: 1300000 },
    ]);
    expect(e.items).toEqual([]);
  });

  it('ORDER_ITEMS: Vest đen slim × 1 → × 2, total follows', () => {
    const after = order({ totalAmount: 1700000 });
    after.orderItems[1] = { ...after.orderItems[1], quantity: 2 };
    const e = orderEntry(order(), after);
    expect(e.kind).toBe('ORDER_ITEMS');
    expect(e.items).toEqual([{ productId: 11, name: 'Vest đen slim', field: 'quantity', from: 1, to: 2 }]);
    expect(e.changes).toEqual([{ field: 'totalAmount', from: 1000000, to: 1700000 }]);
  });

  it('ORDER_ITEMS: added and removed lines', () => {
    const after = order();
    after.orderItems = [after.orderItems[0], { id: 3, productId: 12, quantity: 2, unitPrice: 50000, pricingType: 'DAILY', product: { id: 12, name: 'Giày' } }];
    const e = orderEntry(order(), after);
    expect(e.kind).toBe('ORDER_ITEMS');
    expect(e.items).toEqual([
      { productId: 12, name: 'Giày', field: 'added', from: null, to: 2, unit: 'DAILY' },
      { productId: 11, name: 'Vest đen slim', field: 'removed', from: 1, to: null, unit: 'FIXED' },
    ]);
  });

  it('ORDER_ITEM_PRICE: Áo dài lụa đỏ 300.000đ/lần → 250.000đ/lần', () => {
    const after = order({ totalAmount: 950000 });
    after.orderItems[0] = { ...after.orderItems[0], unitPrice: 250000 };
    const e = orderEntry(order(), after);
    expect(e.kind).toBe('ORDER_ITEM_PRICE');
    expect(e.items).toEqual([{ productId: 10, name: 'Áo dài lụa đỏ', field: 'price', from: 300000, to: 250000, unit: 'FIXED' }]);
  });

  it('ORDER_DEPOSIT: Cọc trả trước 0đ → 300.000đ', () => {
    const e = orderEntry(order(), order({ depositAmount: 300000 }));
    expect(e.kind).toBe('ORDER_DEPOSIT');
    expect(e.changes).toEqual([{ field: 'depositAmount', from: 0, to: 300000 }]);
  });

  it('ORDER_NOTE: added 2 images and text', () => {
    const e = orderEntry(order(), order({ notes: 'khách lấy sớm', notesImages: ['a', 'b'] }));
    expect(e.kind).toBe('ORDER_NOTE');
    expect(e.note).toEqual({ text: 'khách lấy sớm', imagesAdded: 2, imagesRemoved: 0 });
    expect(e.changes).toEqual([]);
  });

  it.each([
    ['PICKUPED', 'ORDER_PICKED_UP'],
    ['RETURNED', 'ORDER_RETURNED'],
    ['CANCELLED', 'ORDER_CANCELLED'],
    ['COMPLETED', 'ORDER_COMPLETED'],
  ])('status → %s is %s, auto timestamps are not listed', (to, kind) => {
    const e = orderEntry(order(), order({ status: to, pickedUpAt: new Date('2026-10-06T08:10:00.000Z') }));
    expect(e.kind).toBe(kind);
    expect(e.changes).toEqual([{ field: 'status', from: 'RESERVED', to }]);
  });

  it('un-cancel (CANCELLED → RESERVED) is ORDER_RESTORED', () => {
    const e = orderEntry(order({ status: 'CANCELLED' }), order());
    expect(e.kind).toBe('ORDER_RESTORED');
  });

  it('several kinds at once fall back to ORDER_EDITED', () => {
    const after = order({ depositAmount: 100000, notes: 'x' });
    expect(orderEntry(order(), after).kind).toBe('ORDER_EDITED');
  });

  it('a field edited by hand (pickedUpAt without status) is listed', () => {
    const e = orderEntry(order({ status: 'PICKUPED', pickedUpAt: '2026-10-03T01:00:00Z' }), order({ status: 'PICKUPED', pickedUpAt: '2026-10-03T02:00:00Z' }));
    expect(e.changes).toEqual([{ field: 'pickedUpAt', from: '2026-10-03T01:00:00.000Z', to: '2026-10-03T02:00:00.000Z' }]);
  });

  it('CREATE / DELETE / RESTORE rows map to their kinds', () => {
    const base = { id: 2, createdAt: '2026-10-06T00:00:00Z', details: '{}', user: null };
    expect(buildChangeEntry({ ...base, action: 'CREATE' }, 'Order').kind).toBe('ORDER_CREATED');
    expect(buildChangeEntry({ ...base, action: 'DELETE' }, 'Order').kind).toBe('ORDER_DELETED');
    expect(buildChangeEntry({ ...base, action: 'RESTORE' }, 'Order').kind).toBe('ORDER_RESTORED');
    expect(buildChangeEntry({ ...base, action: 'LOGIN' }, 'Order').kind).toBe('OTHER');
  });

  it('ORDER_PAYMENT from a payment row', () => {
    const row = { id: 3, action: 'CUSTOM', createdAt: new Date(), user: staff, details: JSON.stringify({ newValues: { payment: { kind: 'COLLECT', amount: 300000, method: 'CASH' } } }) };
    const e = buildChangeEntry(row, 'Order');
    expect(e.kind).toBe('ORDER_PAYMENT');
    expect(e.changes).toEqual([
      { field: 'paymentCollected', from: null, to: 300000 },
      { field: 'paymentMethod', from: null, to: 'CASH' },
    ]);
    const refund = buildChangeEntry({ ...row, details: { newValues: { payment: { kind: 'REFUND', amount: 1 } } } }, 'Order');
    expect(refund.changes[0].field).toBe('paymentRefunded');
  });

  it('classifyOrderUpdate: nothing changed is ORDER_EDITED', () => {
    expect(classifyOrderUpdate({ changes: [], items: [] })).toBe('ORDER_EDITED');
  });
});

describe('old rows and noise (#519)', () => {
  it('Date vs ISO string of the same instant is not a change; arrays with equal content are not a change', () => {
    const before = order();
    const after = JSON.parse(JSON.stringify(order())); // Dates became strings, arrays are new objects
    const diff = diffOrderSnapshots(before, after);
    expect(diff).toEqual({ changes: [], items: [] });
  });

  it('old raw order rows with [REDACTED] totals and customerId never leak them and still diff other fields', () => {
    const raw = (o: any) => ({ ...JSON.parse(JSON.stringify(o)), totalAmount: '[REDACTED]', customerId: '[REDACTED]' });
    const before = raw(order());
    const after = raw(order({ depositAmount: 200000 }));
    const e = buildChangeEntry(updateRow(before, after), 'Order');
    expect(e.kind).toBe('ORDER_DEPOSIT');
    expect(e.changes).toEqual([{ field: 'depositAmount', from: 0, to: 200000 }]);
    expect(JSON.stringify(e)).not.toContain('REDACTED');
    expect(JSON.stringify(e)).not.toContain('an@example.com');
  });

  it('a row that kept only `changes` still gives field changes', () => {
    const row = { id: 9, action: 'UPDATE', createdAt: '2026-10-06T00:00:00Z', user: null, details: { changes: { status: { old: 'RESERVED', new: 'PICKUPED' }, totalAmount: { old: '[REDACTED]', new: '[REDACTED]' } } } };
    const e = buildChangeEntry(row, 'Order');
    expect(e.kind).toBe('ORDER_PICKED_UP');
    expect(e.changes).toEqual([{ field: 'status', from: 'RESERVED', to: 'PICKUPED' }]);
  });

  it('broken details never throw: generic entry', () => {
    const e = buildChangeEntry({ id: 4, action: 'UPDATE', createdAt: 'not a date', details: '{oops', user: null }, 'Order');
    expect(e).toEqual({ id: 4, at: '1970-01-01T00:00:00.000Z', kind: 'ORDER_EDITED', actor: null, changes: [], items: [] });
    expect(() => buildChangeTimeline([{ id: 5, action: 'UPDATE', createdAt: new Date(), details: null } as any], 'Product')).not.toThrow();
  });

  it('old product rows with only name / isActive / category object degrade to PRODUCT_EDITED', () => {
    const e = buildChangeEntry(
      updateRow({ name: 'Áo dài', isActive: true, category: { id: 1, name: 'Áo' } }, { name: 'Áo dài đỏ', isActive: true, category: { id: 1, name: 'Áo' } }),
      'Product'
    );
    expect(e.kind).toBe('PRODUCT_EDITED');
    expect(e.changes).toEqual([{ field: 'name', from: 'Áo dài', to: 'Áo dài đỏ' }]);
  });

  it('actor has name and role only', () => {
    const e = orderEntry(order(), order({ depositAmount: 1 }));
    expect(e.actor).toEqual({ name: 'Lan Nguyễn', role: 'OUTLET_STAFF' });
    expect(e.at).toBe('2026-10-06T08:10:00.000Z');
  });
});

function product(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    name: 'Áo dài lụa đỏ',
    barcode: 'AD001',
    rentPrice: 350000,
    salePrice: 0,
    costPrice: 120000,
    deposit: 500000,
    pricingType: 'FIXED',
    isActive: true,
    images: ['https://s3/a.jpg', 'https://s3/b.jpg'],
    category: { id: 1, name: 'Áo dài' },
    pricingOptions: [
      { id: 1, type: 'FIXED', price: 350000, isActive: true, isDefault: true },
      { id: 2, type: 'DAILY', price: 150000, isActive: true },
      { id: 3, type: 'HOURLY', price: 1, isActive: false },
    ],
    outletStock: [{ id: 1, outletId: 1, stock: 3, available: 3, renting: 0, outlet: { id: 1, name: 'Chi nhánh chính' } }],
    ...overrides,
  };
}

function productEntry(before: any, after: any) {
  return buildChangeEntry(updateRow(buildProductAuditSnapshot(before), buildProductAuditSnapshot(after)), 'Product');
}

describe('product snapshots and kinds (#519)', () => {
  it('snapshot has prices, active options, per-outlet stock, images, category name; never costPrice', () => {
    const snap = buildProductAuditSnapshot(product());
    expect(snap).toEqual({
      name: 'Áo dài lụa đỏ',
      barcode: 'AD001',
      category: 'Áo dài',
      isActive: true,
      rentPrice: 350000,
      salePrice: 0,
      deposit: 500000,
      pricingType: 'FIXED',
      pricingOptions: [{ type: 'DAILY', price: 150000 }, { type: 'FIXED', price: 350000 }],
      outletStock: [{ outletId: 1, outletName: 'Chi nhánh chính', stock: 3 }],
      images: ['https://s3/a.jpg', 'https://s3/b.jpg'],
    });
    expect(JSON.stringify(snap)).not.toContain('120000');
  });

  it('PRODUCT_PRICE: Thuê theo ngày 150.000đ → 130.000đ, Thuê theo lần 350.000đ → 300.000đ', () => {
    const after = product({
      rentPrice: 300000,
      pricingOptions: [
        { type: 'FIXED', price: 300000, isActive: true },
        { type: 'DAILY', price: 130000, isActive: true },
      ],
    });
    const e = productEntry(product(), after);
    expect(e.kind).toBe('PRODUCT_PRICE');
    expect(e.changes).toEqual([
      { field: 'pricing.DAILY', from: 150000, to: 130000 },
      { field: 'pricing.FIXED', from: 350000, to: 300000 },
    ]);
  });

  it('PRODUCT_PRICE without options: rentPrice and salePrice', () => {
    const e = productEntry(product({ pricingOptions: [] }), product({ pricingOptions: [], rentPrice: 300000, salePrice: 900000 }));
    expect(e.kind).toBe('PRODUCT_PRICE');
    expect(e.changes).toEqual([
      { field: 'rentPrice', from: 350000, to: 300000 },
      { field: 'salePrice', from: 0, to: 900000 },
    ]);
  });

  it('PRODUCT_STOCK: Chi nhánh chính 3 → 4, a new outlet null → 2', () => {
    const after = product({
      outletStock: [
        { outletId: 1, stock: 4, outlet: { id: 1, name: 'Chi nhánh chính' } },
        { outletId: 2, stock: 2, outlet: { id: 2, name: 'Quận 3' } },
      ],
    });
    const e = productEntry(product(), after);
    expect(e.kind).toBe('PRODUCT_STOCK');
    expect(e.changes).toEqual([
      { field: 'stock.Chi nhánh chính', from: 3, to: 4 },
      { field: 'stock.Quận 3', from: null, to: 2 },
    ]);
  });

  it('PRODUCT_IMAGES: added 1, removed 1', () => {
    const e = productEntry(product(), product({ images: ['https://s3/a.jpg', 'https://s3/c.jpg'] }));
    expect(e.kind).toBe('PRODUCT_IMAGES');
    expect(e.changes).toEqual([
      { field: 'images', from: 2, to: 2 },
      { field: 'imagesAdded', from: null, to: 1 },
      { field: 'imagesRemoved', from: null, to: 1 },
    ]);
  });

  it('images stored as a JSON string or comma list are read the same', () => {
    expect(buildProductAuditSnapshot({ images: '["x","y"]' }).images).toEqual(['x', 'y']);
    expect(buildProductAuditSnapshot({ images: 'x, y' }).images).toEqual(['x', 'y']);
    expect(buildProductAuditSnapshot({ images: null }).images).toEqual([]);
  });

  it('PRODUCT_EDITED: name and deposit (Tên, Tiền cọc)', () => {
    const e = productEntry(product(), product({ name: 'Áo dài lụa đỏ mới', deposit: 600000 }));
    expect(e.kind).toBe('PRODUCT_EDITED');
    expect(e.changes).toEqual([
      { field: 'name', from: 'Áo dài lụa đỏ', to: 'Áo dài lụa đỏ mới' },
      { field: 'deposit', from: 500000, to: 600000 },
    ]);
  });

  it('PRODUCT_EDITED when price and stock change together; costPrice change alone is invisible', () => {
    const e = productEntry(product(), product({ salePrice: 1, outletStock: [{ outletId: 1, stock: 9, outlet: { name: 'Chi nhánh chính' } }] }));
    expect(e.kind).toBe('PRODUCT_EDITED');
    expect(diffProductSnapshots(product(), product({ costPrice: 1 }))).toEqual([]);
  });

  it('CREATE / DELETE / RESTORE product rows', () => {
    const base = { id: 2, createdAt: '2026-10-06T00:00:00Z', details: '{}', user: null };
    expect(buildChangeEntry({ ...base, action: 'CREATE' }, 'Product').kind).toBe('PRODUCT_CREATED');
    expect(buildChangeEntry({ ...base, action: 'DELETE' }, 'Product').kind).toBe('PRODUCT_DELETED');
    expect(buildChangeEntry({ ...base, action: 'RESTORE' }, 'Product').kind).toBe('PRODUCT_RESTORED');
  });
});

describe('safeAudit (#519)', () => {
  it('swallows sync throws and rejections', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(safeAudit('x', () => { throw new Error('boom'); })).resolves.toBeUndefined();
    await expect(safeAudit('x', () => Promise.reject(new Error('boom')))).resolves.toBeUndefined();
    err.mockRestore();
  });
});
