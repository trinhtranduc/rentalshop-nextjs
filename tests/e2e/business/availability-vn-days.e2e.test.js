/**
 * BF-AV: availability answers in Vietnam civil days for every request shape installed apps send (#590, #578 §A).
 *
 * One stock-1 product, one order P → R. For each probed VN day k (P-1, P, R, R+1) every route and every client
 * window must say "busy" iff P ≤ k ≤ R. Request shapes are copied from the clients:
 * - web Tạo đơn / availability page: `dayRangeIso` (00:00 VN … last ms of the day) — apps/client/app/orders/create/create-model.ts
 * - App Store iOS (main-real): Order Check UTC day `kT00:00:00.000Z … kT23:59:59.999Z`; cart `startOfDay/endOfDay` in the
 *   VN phone zone; legacy `GET /api/products/availability?date=k` / `pickupDate&returnDate` (OrderService.swift)
 * - current iOS / Android: 00:00 VN … 23:59:59.000 VN (OrderPlanDays, dateServerISOString)
 * - Android on main-real (pre-#413): `${P}T00:00:00Z … ${R}T23:59:59Z` (DefaultAvailabilityRepository.kt)
 * - admin create order in a UTC browser: `new Date(k + 'T00:00:00') … new Date(k + 'T23:59:59')` (CreateOrderForm.tsx)
 * scripts/e2e/business-e2e.sh runs it with the API and Jest under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
const { Session, describeE2E, addDays, futureWindow } = require('../helpers/api');

const vnInstant = (key, time = '00:00:00.000') => new Date(`${key}T${time}+07:00`).toISOString();
const vnLastMs = (key) => new Date(Date.parse(vnInstant(addDays(key, 1))) - 1).toISOString();

/** Batch / [id] windows for VN days a..b, per client. */
const SHAPES = {
  web: (a, b) => ({ startDate: vnInstant(a), endDate: vnLastMs(b) }),
  appStoreIosOrderCheck: (a, b) => ({ startDate: `${a}T00:00:00.000Z`, endDate: `${b}T23:59:59.999Z` }),
  appStoreIosCart: (a, b) => ({ startDate: vnInstant(a), endDate: vnInstant(b, '23:59:59.999') }),
  currentApps: (a, b) => ({ startDate: vnInstant(a), endDate: vnInstant(b, '23:59:59.000') }),
  oldAndroid: (a, b) => ({ startDate: `${a}T00:00:00Z`, endDate: `${b}T23:59:59Z` }),
  adminUtcBrowser: (a, b) => ({ startDate: `${a}T00:00:00.000Z`, endDate: `${b}T23:59:59.000Z` })
};

async function ok(promise, label) {
  const r = await promise;
  if (!r.ok) throw new Error(`${label}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body.data;
}

describeE2E('BF-AV availability in Vietnam days for every client', () => {
  let s;

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  /** Order P → R created like `client` (web: return 00:00 VN of R; apps: 23:59:59 VN of R). */
  async function booked(client, lengthDays) {
    const { from: P, to: R } = futureWindow(lengthDays);
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
    const customer = await s.createCustomer();
    const order = await ok(
      s.post('/api/orders', {
        orderType: 'RENT',
        customerId: customer.id,
        outletId: product.outletId,
        pickupPlanAt: vnInstant(P),
        returnPlanAt: client === 'web' ? vnInstant(R) : vnInstant(R, '23:59:59.000'),
        orderItems: [{ productId: product.id, quantity: 1, unitPrice: 100000, totalPrice: 100000, pricingType: 'FIXED', rentDays: 1 }],
        totalAmount: 100000,
        depositAmount: 0
      }),
      'create order'
    );
    const probes = [...new Set([addDays(P, -1), P, R, addDays(R, 1)])];
    const want = Object.fromEntries(probes.map((k) => [k, k >= P && k <= R]));
    return { P, R, product, order, probes, want };
  }

  const batchBusy = async (productId, window) => {
    const data = await ok(s.post('/api/products/batch-availability', { products: [{ productId, quantity: 1 }], ...window }), 'batch');
    return data.results[0].isAvailable === false;
  };
  const idBusy = async (productId, query) => {
    const data = await ok(s.get(`/api/products/${productId}/availability?${new URLSearchParams({ quantity: '1', ...query })}`), '[id]');
    return data.isAvailable === false;
  };
  const legacyBusy = async (productId, query) => {
    const data = await ok(s.get(`/api/products/availability?${new URLSearchParams({ productId: String(productId), ...query })}`), 'legacy');
    return data.summary.isAvailable === false;
  };

  for (const client of ['web', 'app']) {
    describe(`order 2 days created like ${client}`, () => {
      let ctx;
      beforeAll(async () => {
        ctx = await booked(client, 2);
      });

      test(`BF-AV-01-${client} GET /api/products/availability?date=k (App Store iOS) reads VN day k (API-1)`, async () => {
        const got = {};
        for (const k of ctx.probes) got[k] = await legacyBusy(ctx.product.id, { date: k });
        expect(got).toEqual(ctx.want);
      });

      test(`BF-AV-02-${client} GET /api/products/availability?pickupDate&returnDate reads VN days (API-1)`, async () => {
        const got = {};
        for (const k of ctx.probes) got[k] = await legacyBusy(ctx.product.id, { pickupDate: k, returnDate: k });
        expect(got).toEqual(ctx.want);
        const { P, R } = ctx;
        expect({
          before: await legacyBusy(ctx.product.id, { pickupDate: addDays(P, -3), returnDate: addDays(P, -1) }),
          into: await legacyBusy(ctx.product.id, { pickupDate: addDays(P, -2), returnDate: P }),
          after: await legacyBusy(ctx.product.id, { pickupDate: addDays(R, 1), returnDate: addDays(R, 3) })
        }).toEqual({ before: false, into: true, after: false });
      });

      for (const [shape, window] of Object.entries(SHAPES)) {
        test(`BF-AV-03-${client}-${shape} batch-availability one-day windows read VN day k (API-2, #575, #576)`, async () => {
          const got = {};
          for (const k of ctx.probes) got[k] = await batchBusy(ctx.product.id, window(k, k));
          expect(got).toEqual(ctx.want);
        });

        test(`BF-AV-04-${client}-${shape} multi-day windows next to the order are free, touching it is busy`, async () => {
          const { P, R } = ctx;
          const got = {
            before: await batchBusy(ctx.product.id, window(addDays(P, -3), addDays(P, -1))),
            intoPickup: await batchBusy(ctx.product.id, window(addDays(P, -2), P)),
            fromReturn: await batchBusy(ctx.product.id, window(R, addDays(R, 2))),
            after: await batchBusy(ctx.product.id, window(addDays(R, 1), addDays(R, 3))),
            idBefore: await idBusy(ctx.product.id, window(addDays(P, -3), addDays(P, -1))),
            idAfter: await idBusy(ctx.product.id, window(addDays(R, 1), addDays(R, 3))),
            idOn: await idBusy(ctx.product.id, window(P, R))
          };
          expect(got).toEqual({ before: false, intoPickup: true, fromReturn: true, after: false, idBefore: false, idAfter: false, idOn: true });
        });
      }

      test(`BF-AV-05-${client} batch date=k reads VN day k`, async () => {
        const got = {};
        for (const k of ctx.probes) {
          const data = await ok(s.post('/api/products/batch-availability', { products: [{ productId: ctx.product.id, quantity: 1 }], date: k }), 'batch date');
          got[k] = data.results[0].isAvailable === false;
        }
        expect(got).toEqual(ctx.want);
      });
    });
  }

  test('BF-AV-06 the 17:00Z boundary: a pickup at 17:00:00.000Z is the next VN day, 16:59:59.999Z is not', async () => {
    const { from: D } = futureWindow(1);
    const make = async (pickupPlanAt, returnPlanAt) => {
      const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
      const customer = await s.createCustomer();
      await ok(
        s.post('/api/orders', {
          orderType: 'RENT',
          customerId: customer.id,
          outletId: product.outletId,
          pickupPlanAt,
          returnPlanAt,
          orderItems: [{ productId: product.id, quantity: 1, unitPrice: 100000, totalPrice: 100000, pricingType: 'FIXED', rentDays: 1 }],
          totalAmount: 100000,
          depositAmount: 0
        }),
        'create order'
      );
      return product;
    };
    // a: picked up and returned at 00:00 VN of D+1 (= D T17:00:00.000Z); b: one ms earlier, the last ms of D
    const a = await make(`${D}T17:00:00.000Z`, `${D}T17:00:00.000Z`);
    const b = await make(`${D}T16:59:59.999Z`, `${D}T16:59:59.999Z`);
    const probe = async (product) => ({
      legacyD: await legacyBusy(product.id, { date: D }),
      legacyNext: await legacyBusy(product.id, { date: addDays(D, 1) }),
      batchUtcDayD: await batchBusy(product.id, SHAPES.appStoreIosOrderCheck(D, D)),
      batchUtcDayNext: await batchBusy(product.id, SHAPES.appStoreIosOrderCheck(addDays(D, 1), addDays(D, 1))),
      batchDateD: await batchBusy(product.id, { date: D }),
      batchWebD: await batchBusy(product.id, SHAPES.web(D, D))
    });
    expect(await probe(a)).toEqual({ legacyD: false, legacyNext: true, batchUtcDayD: false, batchUtcDayNext: true, batchDateD: false, batchWebD: false });
    expect(await probe(b)).toEqual({ legacyD: true, legacyNext: false, batchUtcDayD: true, batchUtcDayNext: false, batchDateD: true, batchWebD: true });
  });

  test('BF-AV-07 response shapes are unchanged (fields old apps decode)', async () => {
    const { from: D } = futureWindow(1);
    const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2 });
    const legacy = await ok(s.get(`/api/products/availability?productId=${product.id}&date=${D}`), 'legacy');
    expect(Object.keys(legacy).sort()).toEqual(['date', 'meta', 'orders', 'product', 'summary']);
    expect(Object.keys(legacy.summary).sort()).toEqual(['isAvailable', 'totalAvailable', 'totalRented', 'totalReserved', 'totalStock']);
    expect(legacy.date).toBe(D);
    const batch = await ok(s.post('/api/products/batch-availability', { products: [{ productId: product.id, quantity: 1 }], ...SHAPES.oldAndroid(D, D) }), 'batch');
    expect(Object.keys(batch).sort()).toEqual(['rentalPeriod', 'results', 'summary']);
    expect(batch.results[0]).toEqual(
      expect.objectContaining({ productId: product.id, isAvailable: true, totalAvailableStock: 2, rentalPeriod: expect.any(Object), availabilityByOutlet: expect.any(Array) })
    );
  });
});
