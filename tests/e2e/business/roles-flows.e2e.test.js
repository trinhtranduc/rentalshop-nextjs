/**
 * #727 BF-ROLE: OUTLET_STAFF and OUTLET_INVENTORY (Nhân viên kho) on every stock / calendar / order / "việc cần làm" flow.
 * Each role must see the SAME numbers as the merchant for its own outlet, must not see or touch another outlet,
 * gets 403 on money reports, and the permission matrix (ROLE_PERMISSIONS in packages/auth/src/permissions.ts) holds
 * both ways: allowed calls are 2xx, denied calls are 403 and leave the data unchanged.
 * Merchant-side numbers of the same flows: work-stock-calendar.e2e.test.js. Existing matrices: BF-STAFF, BF-INV.
 */
const {
  Session,
  describeE2E,
  must,
  request,
  vnDateKey,
  addDays,
  futureWindow,
  rentBody,
  uniqueName,
  knownBug
} = require('../helpers/api');
const F = require('../helpers/flows');

const today = vnDateKey();
const del = (session, path) => request(session.token, 'DELETE', path);
const ROLES = [
  ['staff', 'staff', 'OUTLET_STAFF'],
  ['kho', 'inventory', 'OUTLET_INVENTORY']
];
const CORE = ['pickups', 'returns', 'late', 'noShows', 'soon', 'tomorrowPickups', 'tomorrowReturns', 'donePickups', 'doneReturns', 'newToday'];
const pickCore = (c) => Object.fromEntries(CORE.map((k) => [k, c[k]]));
const ORDER_KEYS = ['id', 'orderNumber', 'orderType', 'status', 'totalAmount', 'depositAmount', 'securityDeposit', 'lateFee', 'damageFee', 'pickupPlanAt', 'returnPlanAt', 'pickedUpAt', 'returnedAt', 'rentalDuration', 'outletId'];
const pickKeys = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
const lines = (o) => o.orderItems.map((i) => [i.productId, i.quantity, i.unitPrice, i.totalPrice]).sort();

describeE2E('BF-ROLE staff and kho: same numbers as the merchant for their outlet', () => {
  let s;
  let M;
  let O;
  let merchantId;
  const created = [];
  const sessions = {};

  beforeAll(async () => {
    s = await Session.login('merchant');
    for (const [tag, account, role] of ROLES) {
      sessions[tag] = await Session.login(account);
      expect(sessions[tag].user.role).toBe(role);
    }
    M = sessions.staff.user.outletId;
    expect(sessions.kho.user.outletId).toBe(M);
    const outlets = F.listOf(await must(s.get('/api/outlets?limit=50'), 'outlets'), 'outlets');
    O = outlets.find((o) => o.id !== M).id;
    merchantId = (await must(s.get('/api/users/profile'), 'profile')).merchant.id;
  });
  afterAll(() => F.cancelOpen(s, created));

  const track = (o) => {
    created.push(o.id);
    return o;
  };

  for (const [tag, account] of ROLES) {
    describe(`as ${tag}`, () => {
      let r;
      beforeAll(() => {
        r = sessions[tag];
      });
      const product = (stock, outletId = M, extra = {}) => s.createProduct({ kind: 'FIXED', price: 100000, stock, outletId, ...extra });

      /** Everything the apps read about one product and window, as this session sees it. */
      const reads = async (sess, p, w, orderId) => {
        const single = (await sess.availability(p.id, { ...w, quantity: 2, outletId: M })).availabilityByOutlet[0];
        const cart = (await sess.batchAvailability([{ productId: p.id, quantity: 2 }], { ...w, outletId: M })).results[0];
        const view = await F.stockView(sess, p, M);
        const order = await sess.getOrder(orderId);
        const row = await sess.orderRow(orderId, order.orderNumber);
        return {
          grid: await F.freeDays(sess, p, addDays(w.from, -1), addDays(w.to, 1), M),
          single: pickKeys(single, ['stock', 'conflictingQuantity', 'effectivelyAvailable', 'canFulfillRequest']),
          cart: pickKeys(cart.availabilityByOutlet[0], ['stock', 'conflictingQuantity', 'effectivelyAvailable']),
          list: view.list,
          detail: view.detail,
          order: { ...pickKeys(order, ORDER_KEYS), lines: lines(order) },
          row: { ...pickKeys(row, ['totalAmount', 'amountDue', 'refundDue', 'status']), lines: lines(row) }
        };
      };

      test(`BF-ROLE-01-${tag} sells at its outlet: the sale and the units left read the same as for the merchant`, async () => {
        const p = await s.createProduct({ kind: 'SALE', price: 90000, stock: 5, outletId: M });
        const sale = track(await F.sell(r, { product: p, quantity: 2, outletId: M }));
        expect(sale).toMatchObject({ status: 'COMPLETED', orderType: 'SALE', totalAmount: 180000 });
        const mine = await F.stockView(r, p, M);
        const owner = await F.stockView(s, p, M);
        expect(mine).toEqual(owner);
        expect(mine.detail).toEqual({ stock: 3, available: 3, renting: 0 });
        expect(mine.list).toMatchObject({ today: 3, available: 3 });
        const row = (await F.calendarList(r, today, { status: 'COMPLETED' })).find((o) => o.id === sale.id);
        expect(row).toMatchObject({ totalAmount: 180000, productCount: 2 });
        // the merchant sees the order the role made (created by the role, at the role's outlet)
        expect((await s.getOrder(sale.id)).outletId).toBe(M);
      });

      test(`BF-ROLE-02-${tag} rents at its outlet: free days, cart check, list, detail, order and list row equal the merchant's, money included`, async () => {
        const p = await product(5, M, { deposit: 0 });
        const w = futureWindow(3);
        const customer = await r.createCustomer();
        const order = track(
          await r.createOrder({ ...rentBody({ customer, lines: [{ product: p, quantity: 3 }], ...w, depositAmount: 50000, securityDeposit: 100000 }).body, outletId: M })
        );
        expect(order).toMatchObject({ status: 'RESERVED', totalAmount: 300000, outletId: M });
        const mine = await reads(r, p, w, order.id);
        const owner = await reads(s, p, w, order.id);
        expect(mine).toEqual(owner);
        // and the numbers are the right ones
        expect(mine.grid).toEqual({ [addDays(w.from, -1)]: 5, [w.from]: 2, [addDays(w.from, 1)]: 2, [w.to]: 2, [addDays(w.to, 1)]: 5 });
        expect(mine.single).toMatchObject({ conflictingQuantity: 3, effectivelyAvailable: 2, canFulfillRequest: true });
        expect(mine.order).toMatchObject({ depositAmount: 50000, securityDeposit: 100000 });
        expect(mine.row).toMatchObject({ amountDue: 300000 - 50000 + 100000, refundDue: 0 });
      });

      test(`BF-ROLE-03-${tag} hands over and takes back: units move renting then free, the merchant and the role read the same`, async () => {
        const p = await product(4);
        const w = { from: today, to: addDays(today, 1) };
        const order = track(await F.bookRent(r, { product: p, quantity: 2, outletId: M, ...w }));
        expect((await r.setStatus(order.id, 'PICKUPED')).status).toBe(200);
        expect(await s.outletStock(p.id, M)).toEqual({ stock: 4, available: 2, renting: 2 });
        expect(await F.stockView(r, p, M)).toEqual(await F.stockView(s, p, M));
        expect((await F.stockView(r, p, M)).list.today).toBe(2);
        expect((await r.setStatus(order.id, 'RETURNED')).status).toBe(200);
        expect(await s.outletStock(p.id, M)).toEqual({ stock: 4, available: 4, renting: 0 });
        expect(await F.freeDays(r, p, w.from, w.to, M)).toEqual({ [w.from]: 4, [w.to]: 4 });
        // cancel works too, and gives the units back
        const c = track(await F.bookRent(r, { product: p, quantity: 3, outletId: M, ...w }));
        expect((await r.setStatus(c.id, 'CANCELLED')).status).toBe(200);
        expect(await F.freeDays(s, p, w.from, w.to, M)).toEqual({ [w.from]: 4, [w.to]: 4 });
      });

      test(`BF-ROLE-04-${tag} calendar: own outlet counts and day lists equal the merchant's for that outlet; another outlet's orders are not there`, async () => {
        const p = await product(3);
        const pO = await product(3, O);
        const w = futureWindow(2);
        const b = {
          role: await F.calendarDay(r, w.from, { status: 'RESERVED' }),
          owner: await F.calendarDay(s, w.from, { status: 'RESERVED', outletId: M })
        };
        const mine = track(await F.bookRent(r, { product: p, quantity: 1, outletId: M, ...w }));
        const theirs = track(await F.bookRent(s, { product: pO, quantity: 1, outletId: O, ...w }));
        const x = { role: await F.calendarDay(r, w.from, { status: 'RESERVED' }), owner: await F.calendarDay(s, w.from, { status: 'RESERVED', outletId: M }) };
        expect([x.role.pickups - b.role.pickups, x.owner.pickups - b.owner.pickups]).toEqual([1, 1]);
        expect([x.role.count - b.role.count, x.owner.count - b.owner.count]).toEqual([1, 1]);
        const ids = (rows) => rows.map((o) => o.id);
        expect(ids(await F.calendarList(r, w.from, { status: 'RESERVED' }))).toContain(mine.id);
        expect(ids(await F.calendarList(r, w.from, { status: 'RESERVED' }))).not.toContain(theirs.id);
        expect(ids(await F.calendarList(r, w.from))).not.toContain(theirs.id);
        await r.setStatus(mine.id, 'PICKUPED');
        expect(ids(await F.calendarList(r, w.to, { kind: 'return' }))).toContain(mine.id);
        expect(ids(await F.calendarList(r, w.to, { kind: 'return' }))).not.toContain(theirs.id);
        // a role's outletId filter cannot widen the calendar to another outlet
        expect(ids(await F.calendarList(r, w.from, { status: 'RESERVED', outletId: O }))).not.toContain(theirs.id);
      });

      test(`BF-ROLE-05-${tag} việc cần làm: same counters and lists as the merchant for the outlet, moved by its own orders only, no cash section`, async () => {
        const same = async () => {
          const mine = await F.operations(r, {});
          const owner = await F.operations(s, { outletIds: M });
          expect(mine.outletIds).toEqual([M]);
          expect(pickCore(F.opsCounters(mine))).toEqual(pickCore(F.opsCounters(owner)));
          for (const k of ['pickupsToday', 'returnsToday', 'overdueReturns', 'noShows', 'returnsSoon']) {
            expect({ k, ids: F.ids(mine[k].orders) }).toEqual({ k, ids: F.ids(owner[k].orders) });
          }
          return { mine, owner };
        };
        const { owner: first } = await same();
        expect(first.cash).not.toBeNull();
        const wm = await F.watchOperations(r, {});
        const wo = await F.watchOperations(s, { outletIds: M });
        const p = await product(5);
        const pO = await product(5, O);
        const o = track(await F.bookRent(r, { product: p, quantity: 2, outletId: M, from: today, to: addDays(today, 2) }));
        track(await F.bookRent(s, { product: pO, quantity: 1, outletId: O, from: today, to: addDays(today, 2) }));
        const dm = (await wm.delta()).d;
        const dMerchant = (await wo.delta()).d;
        expect(dm).toEqual({ pickups: 1, newToday: 1 });
        expect(dMerchant).toMatchObject(dm); // the merchant's view of the outlet also carries its cash counters
        expect((await same()).mine.cash).toBeNull();
        await r.setStatus(o.id, 'PICKUPED');
        expect((await wm.delta()).d).toEqual({ pickups: -1, donePickups: 1, soon: 1 });
        await same();
        await r.setStatus(o.id, 'RETURNED');
        expect((await wm.delta()).d).toEqual({ soon: -1, doneReturns: 1 });
        // asking for another outlet changes nothing for a role
        const asked = await F.operations(r, { outletIds: O });
        expect(asked.outletIds).toEqual([M]);
        // and the day is the Vietnam day with or without a time zone
        expect((await F.operations(r, { timeZone: null })).date).toBe(today);
      });

      test(`BF-ROLE-06-${tag} another outlet: cannot create there, does not list its orders or products, cannot edit its order, nothing of it changes`, async () => {
        const pO = await product(3, O);
        const w = futureWindow(1);
        const theirs = track(await F.bookRent(s, { product: pO, quantity: 1, outletId: O, ...w }));
        const make = await F.bookRentRaw(r, { product: pO, quantity: 1, outletId: O, ...futureWindow(1) });
        expect([make.status, make.body.code]).toEqual([403, 'CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET']);
        expect((await r.listOrders({ search: theirs.orderNumber })).map((o) => o.id)).not.toContain(theirs.id);
        expect((await r.listOrders({ outletId: String(O) })).map((o) => o.id)).not.toContain(theirs.id);
        expect(await F.productRow(r, pO, O)).toBeNull();
        expect(await F.productRow(r, pO, M)).toBeNull();
        // the order and the stock of that outlet are as the merchant left them
        const after = await s.getOrder(theirs.id);
        expect([after.outletId, after.status]).toEqual([O, 'RESERVED']);
        expect(await s.outletStock(pO.id, O)).toEqual({ stock: 3, available: 3, renting: 0 });
      });

      knownBug('#730', `BF-ROLE-07-${tag} cannot change an order of another outlet: PUT and status answer 403 and the order stays at its outlet`, async () => {
        const pO = await product(3, O);
        const theirs = track(await F.bookRent(s, { product: pO, quantity: 1, outletId: O, ...futureWindow(1) }));
        const edit = await r.updateOrder(theirs.id, { notes: 'role edit' });
        const status = await r.setStatus(theirs.id, 'CANCELLED');
        expect([edit.status, status.status]).toEqual([403, 403]);
        const after = await s.getOrder(theirs.id);
        expect([after.outletId, after.status, after.notes]).toEqual([O, 'RESERVED', null]);
      });

      knownBug('#731', `BF-ROLE-08-${tag} cannot open an order of another outlet: GET by id and by number are refused`, async () => {
        const pO = await product(3, O);
        const theirs = track(await F.bookRent(s, { product: pO, quantity: 1, outletId: O, ...futureWindow(1) }));
        const byId = await r.get(`/api/orders/${theirs.id}`);
        const byNumber = await r.get(`/api/orders/by-number/${theirs.orderNumber}`);
        expect([[403, 404].includes(byId.status), [403, 404].includes(byNumber.status)]).toEqual([true, true]);
      });

      knownBug('#732', `BF-ROLE-09-${tag} cannot read another outlet's stock and bookings: availability, free-days grid and cart check are refused`, async () => {
        const pO = await product(3, O);
        const w = futureWindow(1);
        await F.bookRent(s, { product: pO, quantity: 1, outletId: O, ...w }).then(track);
        const single = await r.get(`/api/products/${pO.id}/availability?startDate=${new Date().toISOString()}&endDate=${new Date(Date.now() + 86400000).toISOString()}&outletId=${O}`);
        const grid = await r.get(`/api/products/${pO.id}/availability-calendar?from=${w.from}&to=${w.to}&outletId=${O}`);
        const cart = await r.post('/api/products/batch-availability', { products: [{ productId: pO.id, quantity: 1 }], startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString(), outletId: O });
        expect([single.status, grid.status, cart.status]).toEqual([403, 403, 403]);
      });

      test(`BF-ROLE-10-${tag} reports: money endpoints are 403, the operational ones work (the merchant gets 200 on all of them)`, async () => {
        const q = `startDate=${today}&endDate=${today}`;
        const money = [
          `/api/analytics/period?${q}&groupBy=day`,
          `/api/analytics/income?${q}`,
          `/api/analytics/top-products?${q}`,
          `/api/analytics/top-customers?${q}`,
          `/api/analytics/growth-metrics?${q}`,
          `/api/analytics/orders?${q}`,
          '/api/analytics/recent-orders'
        ];
        const operational = ['/api/analytics/today-metrics', '/api/analytics/dashboard', '/api/analytics/outlet-operations?timeZone=Asia%2FHo_Chi_Minh', `/api/analytics/income/daily?${q}`];
        const got = {};
        for (const path of money) got[path] = [(await r.get(path)).status, (await s.get(path)).status];
        for (const path of operational) got[path] = [(await r.get(path)).status, (await s.get(path)).status];
        expect(got).toEqual(Object.fromEntries([...money.map((p) => [p, [403, 200]]), ...operational.map((p) => [p, [200, 200]])]));
      });

      test(`BF-ROLE-11-${tag} order money is not stripped from the order (only analytics is hidden): deposit, collateral and amounts due are visible`, async () => {
        const p = await product(2);
        const w = futureWindow(1);
        const order = track(await F.bookRent(s, { product: p, quantity: 1, outletId: M, depositAmount: 30000, securityDeposit: 60000, ...w }));
        const detail = await r.getOrder(order.id);
        expect(detail).toMatchObject({ totalAmount: 100000, depositAmount: 30000, securityDeposit: 60000 });
        expect(await r.orderRow(order.id, order.orderNumber)).toMatchObject({ amountDue: 100000 - 30000 + 60000, refundDue: 0 });
        expect((await F.calendarList(r, w.from, { status: 'RESERVED' })).find((o) => o.id === order.id)).toMatchObject({ amountDue: 130000 });
        const ops = await F.operations(r, {});
        expect(ops.cash).toBeNull(); // the only money block of the day card is the cash section, merchant only
      });
    });
  }

  // ---------------------------------------------------------------------------------------------------
  describe('kho and staff on products', () => {
    const khoS = () => sessions.kho;
    const staffS = () => sessions.staff;

    test('BF-ROLE-12 cost price: kho and the merchant see it in the list and the detail, staff does not', async () => {
      const name = uniqueName('SP cost');
      const made = await s.postForm('/api/products', { name, rentPrice: 100000, salePrice: 300000, costPrice: 120000, totalStock: 2, outletStock: [{ outletId: M, stock: 2 }], pricingOptions: [{ type: 'FIXED', price: 100000, isDefault: true }] });
      expect(made.status).toBe(200);
      const p = { ...made.body.data, outletId: M };
      const seen = async (sess) => ({ list: 'costPrice' in ((await F.productRow(sess, p, M)) || {}), detail: 'costPrice' in (await sess.getProduct(p.id)) });
      expect(await seen(s)).toEqual({ list: true, detail: true });
      expect(await seen(khoS())).toEqual({ list: true, detail: true });
      expect(await seen(staffS())).toEqual({ list: false, detail: false });
      expect((await khoS().getProduct(p.id)).costPrice).toBe(120000);
    });

    test('BF-ROLE-13 kho edits the stock: every number moves at once for kho, staff and the merchant; staff cannot and nothing changes', async () => {
      const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: M });
      const w = futureWindow(2);
      track(await F.bookRent(s, { product: p, quantity: 1, outletId: M, ...w }));
      const read = async () => {
        const out = {};
        for (const [tag, sess] of [['merchant', s], ['kho', khoS()], ['staff', staffS()]]) {
          const view = await F.stockView(sess, p, M);
          out[tag] = { grid: await F.freeDays(sess, p, w.from, w.to, M), detail: view.detail, cart: (await sess.batchAvailability([{ productId: p.id, quantity: 1 }], { ...w, outletId: M })).results[0].availabilityByOutlet[0].effectivelyAvailable };
        }
        return out;
      };
      const all = (v) => ({ merchant: v, kho: v, staff: v });
      expect(await read()).toEqual(all({ grid: { [w.from]: 1, [w.to]: 1 }, detail: { stock: 2, available: 2, renting: 0 }, cart: 1 }));
      const denied = await staffS().updateProduct(p.id, { totalStock: 9, outletStock: [{ outletId: M, stock: 9 }] });
      expect(denied.status).toBe(403);
      expect((await read()).merchant.detail.stock).toBe(2);
      const up = await khoS().updateProduct(p.id, { totalStock: 6, outletStock: [{ outletId: M, stock: 6 }] });
      expect(up.status).toBe(200);
      expect(await read()).toEqual(all({ grid: { [w.from]: 5, [w.to]: 5 }, detail: { stock: 6, available: 6, renting: 0 }, cart: 5 }));
      expect((await F.stockView(khoS(), p, M)).list.today).toBe(6);
      // lowering it again takes units from the free count at once
      expect((await khoS().updateProduct(p.id, { totalStock: 1, outletStock: [{ outletId: M, stock: 1 }] })).status).toBe(200);
      expect((await read()).staff.grid).toEqual({ [w.from]: 0, [w.to]: 0 });
    });

    test('BF-ROLE-14 products made by staff and by kho: both are stocked at the outlet and rent at once; the prices a staff form sends are saved (Q11)', async () => {
      const mk = async (sess, extra) => {
        const r = await sess.postForm('/api/products', { name: uniqueName('SP role'), totalStock: 3, outletStock: [{ outletId: M, stock: 3 }], ...extra });
        expect(r.status).toBe(200);
        return { ...r.body.data, outletId: M };
      };
      // the staff form sends no prices (rentPrice 0 is required by the schema)
      const byStaff = await mk(staffS(), { rentPrice: 0 });
      expect(await s.getProduct(byStaff.id)).toMatchObject({ rentPrice: 0, salePrice: 0 });
      // a staff call that sends prices anyway keeps them: the API only refuses EDITING prices (BF-SCOPE-04); Q11
      const priced = await mk(staffS(), { rentPrice: 500000, salePrice: 900000, costPrice: 100000 });
      expect(await s.getProduct(priced.id)).toMatchObject({ rentPrice: 500000, salePrice: 900000 });
      expect(await staffS().updateProduct(priced.id, { rentPrice: 1 })).toMatchObject({ status: 403 });
      const byKho = await mk(khoS(), { rentPrice: 150000, salePrice: 900000, costPrice: 400000, pricingOptions: [{ type: 'FIXED', price: 150000, isDefault: true }] });
      expect(await s.getProduct(byKho.id)).toMatchObject({ rentPrice: 150000, salePrice: 900000, costPrice: 400000 });
      for (const p of [byStaff, priced, byKho]) expect(await s.outletStock(p.id, M)).toEqual({ stock: 3, available: 3, renting: 0 });
      const w = futureWindow(1);
      const order = track(await F.bookRent(khoS(), { product: byKho, quantity: 2, outletId: M, ...w }));
      expect(order.totalAmount).toBe(300000);
      expect(await F.freeDays(staffS(), byKho, w.from, w.to, M)).toEqual({ [w.from]: 1 });
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('permission matrix, both ways (ROLE_PERMISSIONS: OUTLET_STAFF vs OUTLET_INVENTORY)', () => {
    const profileMerchant = async () => (await must(s.get('/api/users/profile'), 'profile')).merchant;
    /** [name, allowed for staff, allowed for kho, run(r) -> { res, ...ctx }, verify(res, ctx, allowed)] */
    const MATRIX = [
      ['products.create POST /api/products', true, true,
        async (r) => ({ res: await r.postForm('/api/products', { name: uniqueName('SP mx'), rentPrice: 0, totalStock: 1, outletStock: [{ outletId: M, stock: 1 }] }) })],
      ['products.update PUT /api/products/{id}', false, true,
        async (r) => {
          const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: M });
          return { p, res: await r.updateProduct(p.id, { name: `${p.name} mx`, totalStock: 5, outletStock: [{ outletId: M, stock: 5 }] }) };
        },
        async (res, { p }, allowed) => {
          const now = await s.getProduct(p.id);
          expect([now.name === `${p.name} mx`, (await s.outletStock(p.id, M)).stock]).toEqual(allowed ? [true, 5] : [false, 2]);
        }],
      ['products.delete DELETE /api/products/{id}', false, true,
        async (r) => {
          const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: M });
          return { p, res: await del(r, `/api/products/${p.id}`) };
        },
        async (res, { p }, allowed) => expect((await s.get(`/api/products/${p.id}`)).status === 200).toBe(!allowed)],
      ['products.export GET /api/products/export', false, true, async (r) => ({ res: await r.get('/api/products/export?format=csv') })],
      ['products.bulk-import POST /api/products/bulk-import', false, true,
        async (r) => {
          const name = uniqueName('SP imp');
          return { name, res: await r.post('/api/products/bulk-import', { products: [{ name, rentPrice: 1, totalStock: 1 }] }) };
        },
        async (res, { name }, allowed) => {
          const found = F.listOf(await must(s.get(`/api/products?search=${encodeURIComponent(name)}`), 'products'), 'products');
          expect(found.length > 0).toBe(allowed);
        }],
      ['categories.create POST /api/categories', false, true,
        async (r) => {
          const name = uniqueName('DM mx');
          return { name, res: await r.post('/api/categories', { name }) };
        },
        async (res, { name }, allowed) => {
          const found = F.listOf(await must(s.get(`/api/categories?search=${encodeURIComponent(name)}`), 'categories'), 'categories');
          expect(found.some((c) => c.name === name)).toBe(allowed);
        }],
      ['orders.create POST /api/orders (sale at own outlet)', true, true,
        async (r) => {
          const p = await s.createProduct({ kind: 'SALE', price: 1000, stock: 2, outletId: M });
          const customer = await r.createCustomer();
          return { p, res: await r.createOrderRaw({ orderType: 'SALE', customerId: customer.id, orderItems: [{ productId: p.id, quantity: 1, unitPrice: 1000, totalPrice: 1000 }], totalAmount: 1000, depositAmount: 0, outletId: M }) };
        },
        async (res, { p }, allowed) => expect((await s.outletStock(p.id, M)).stock).toBe(allowed ? 1 : 2)],
      ['orders.update PUT /api/orders/{id} notes', true, true,
        async (r) => {
          const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: M });
          const order = track(await F.bookRent(s, { product: p, outletId: M, ...futureWindow(1) }));
          return { order, res: await r.updateOrder(order.id, { notes: `mx ${tagOf(r)}` }) };
        },
        async (res, { order }, allowed) => expect((await s.getOrder(order.id)).notes !== null).toBe(allowed)],
      ['orders.delete DELETE /api/orders/{id}', false, false,
        async (r) => {
          const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: M });
          const order = track(await F.bookRent(s, { product: p, outletId: M, ...futureWindow(1) }));
          return { order, res: await del(r, `/api/orders/${order.id}`) };
        },
        async (res, { order }) => expect((await s.getOrder(order.id)).status).toBe('RESERVED')],
      ['orders.batch-delete POST /api/orders/batch-delete', false, false,
        async (r) => {
          const p = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 2, outletId: M });
          const order = track(await F.bookRent(s, { product: p, outletId: M, ...futureWindow(1) }));
          return { order, res: await r.post('/api/orders/batch-delete', { ids: [order.id] }) };
        },
        async (res, { order }) => expect((await s.getOrder(order.id)).status).toBe('RESERVED')],
      ['orders.export GET /api/orders/export', false, false, async (r) => ({ res: await r.get('/api/orders/export?format=csv') })],
      ['customers.create POST /api/customers', true, true,
        async (r) => ({ res: await r.post('/api/customers', { firstName: uniqueName('Khach mx'), lastName: 'E2E', phone: `07${String(Date.now()).slice(-8)}` }) })],
      ['customers.export GET /api/customers/export', false, false, async (r) => ({ res: await r.get('/api/customers/export?format=csv') })],
      ['users.view GET /api/users', false, false, async (r) => ({ res: await r.get('/api/users') })],
      ['users.manage POST /api/users', false, false,
        async (r) => {
          const email = `mx-${Date.now()}@example.com`;
          return { email, res: await r.post('/api/users', { email, password: 'secret123', firstName: 'M', lastName: 'X', role: 'OUTLET_STAFF', outletId: M }) };
        },
        async (res, { email }) => {
          const found = F.listOf(await must(s.get(`/api/users?search=${encodeURIComponent(email)}`), 'users'), 'users');
          expect(found.map((u) => u.email)).not.toContain(email);
        }],
      ['merchant settings PUT /api/settings/merchant (name)', false, false,
        async (r) => ({ before: (await profileMerchant()).name, res: await r.put('/api/settings/merchant', { name: 'role shop name' }) }),
        async (res, { before }) => expect((await profileMerchant()).name).toBe(before)],
      ['overlap setting PUT /api/settings/merchant (allowOverlappingOrders)', false, false,
        async (r) => {
          const before = (await profileMerchant()).allowOverlappingOrders;
          return { before, res: await r.put('/api/settings/merchant', { allowOverlappingOrders: !before }) };
        },
        async (res, { before }) => expect((await profileMerchant()).allowOverlappingOrders).toBe(before)],
      ['outlet settings PUT /api/settings/outlet', false, false,
        async (r) => ({ res: await r.put('/api/settings/outlet', { name: 'role outlet name', address: 'role address' }) }),
        async () => {
          const outlets = F.listOf(await must(s.get('/api/outlets?limit=50'), 'outlets'), 'outlets');
          expect(outlets.find((o) => o.id === M).name).not.toBe('role outlet name');
        }],
      ['bank accounts POST /api/merchants/{m}/outlets/{o}/bank-accounts', false, false,
        async (r) => {
          const base = `/api/merchants/${merchantId}/outlets/${M}/bank-accounts`;
          const before = (await must(s.get(base), 'bank accounts')).length;
          return { base, before, res: await r.post(base, { accountHolderName: 'ROLE', accountNumber: '1234567890', bankName: 'Vietcombank' }) };
        },
        async (res, { base, before }) => expect((await must(s.get(base), 'bank accounts')).length).toBe(before)],
      ['plan PUT /api/merchants/{m}/plan', false, false,
        async (r) => {
          const planId = (await profileMerchant()).planId;
          return { planId, res: await r.put(`/api/merchants/${merchantId}/plan`, { planId, billingInterval: 'monthly' }) };
        },
        async (res, { planId }) => expect((await profileMerchant()).planId).toBe(planId)],
      ['billing.view GET /api/subscriptions/status', true, true, async (r) => ({ res: await r.get('/api/subscriptions/status') })],
      ['loyalty.view GET /api/loyalty/program', true, true, async (r) => ({ res: await r.get('/api/loyalty/program') })],
      ['analytics.view.dashboard GET /api/analytics/today-metrics', true, true, async (r) => ({ res: await r.get('/api/analytics/today-metrics') })],
      ['analytics.view.revenue.daily GET /api/analytics/income/daily', true, true, async (r) => ({ res: await r.get(`/api/analytics/income/daily?startDate=${today}&endDate=${today}`) })],
      ['analytics.view.revenue GET /api/analytics/period', false, false, async (r) => ({ res: await r.get(`/api/analytics/period?startDate=${today}&endDate=${today}&groupBy=day`) })],
      ['outlet.view GET /api/outlets (own outlet only)', true, true,
        async (r) => ({ res: await r.get('/api/outlets?limit=50') }),
        async (res) => expect(F.listOf(res.body.data, 'outlets').map((o) => o.id)).toEqual([M])],
      ['outlet.manage PUT /api/outlets?id=', false, false,
        async (r) => ({ res: await r.put(`/api/outlets?id=${M}`, { name: 'role outlet name' }) }),
        async () => {
          const outlets = F.listOf(await must(s.get('/api/outlets?limit=50'), 'outlets'), 'outlets');
          expect(outlets.find((o) => o.id === M).name).not.toBe('role outlet name');
        }]
    ];
    const tagOf = (sess) => (sess === sessions.staff ? 'staff' : 'kho');

    for (const [tag] of ROLES) {
      MATRIX.forEach(([name, staffOk, khoOk, run, verify], i) => {
        test(`BF-ROLE-${String(15 + i).padStart(2, '0')}-${tag} ${name}`, async () => {
          const allowed = tag === 'staff' ? staffOk : khoOk;
          const out = await run(sessions[tag]);
          const status = out.res.status;
          expect({ allowed, status: allowed ? (status >= 200 && status < 300 ? 'ok' : status) : status }).toEqual({ allowed, status: allowed ? 'ok' : 403 });
          if (verify) await verify(out.res, out, allowed);
        });
      });
    }
  });
});
