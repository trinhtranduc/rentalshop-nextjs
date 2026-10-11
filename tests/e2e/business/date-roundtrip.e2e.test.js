/**
 * BF-RT: the rental days chosen at create come back unchanged on every read (#573).
 * Owner: "lúc tạo đơn chọn ngày này nọ thì lúc load về, check calendar có chuẩn không".
 *
 * Each case creates a RENT order with the pickup / return instants one client really sends, then reads it back:
 * order detail + by-number, orders list (planned-date filters), calendar day lists and month counts,
 * batch availability (new and old app windows), Overview "Việc hôm nay" (outlet-operations) and an edit.
 * Every read is checked against Vietnam civil day keys (`YYYY-MM-DD`). scripts/e2e/business-e2e.sh runs the
 * file with the API and Jest under TZ=UTC and TZ=Asia/Ho_Chi_Minh: the results must be the same.
 */
const { Session, describeE2E, vnDateKey, addDays, civilDays, knownBug } = require('../helpers/api');

const VN = 'Asia/Ho_Chi_Minh';
const HOUR = 3600 * 1000;

/** UTC instant of hh:mm:ss.mmm Vietnam time on a VN day key (Vietnam is UTC+7, no DST). */
const vnInstant = (key, time = '00:00:00.000') => new Date(`${key}T${time}+07:00`).toISOString();

// ---------------------------------------------------------------- what each client sends

/**
 * Pickup / return instants per client for VN days P..R.
 * - web: Tạo đơn `buildPayload` → `dayStartIso(key)` for both days (apps/client/app/orders/create/create-model.ts).
 * - ios: `Date.startOfDay()` / `endOfDay()` in the device zone (Asia/Ho_Chi_Minh), `dateServerISOString()`
 *   = UTC ISO with milliseconds (RCExtentions.swift, Cart.swift toCreateOrderRequest).
 * - android: `OrderPlanDays.pickupInstant/returnInstant` with the device zone Asia/Ho_Chi_Minh
 *   (`uuuu-MM-dd'T'HH:mm:ss.SSS'Z'` in UTC): same instants as iOS.
 * - oldAndroid: the cart before #413, still installed: `${P}T00:00:00Z` and `${R}T23:59:00Z`.
 */
const CLIENTS = {
  web: { transport: 'json', rentDays: true, pickup: (P) => vnInstant(P), ret: (R) => vnInstant(R) },
  // iOS also sends rentalDuration (calculateRentalDays)
  ios: { transport: 'multipart', rentDays: true, rentalDuration: true, pickup: (P) => vnInstant(P), ret: (R) => vnInstant(R, '23:59:59.000') },
  android: {
    transport: 'json',
    rentDays: true,
    pickup: (P) => new Date(Date.parse(`${P}T00:00:00Z`) - 7 * HOUR).toISOString(),
    ret: (R) => new Date(Date.parse(`${addDays(R, 1)}T00:00:00Z`) - 7 * HOUR - 1000).toISOString()
  },
  oldAndroid: { transport: 'json', pickup: (P) => `${P}T00:00:00Z`, ret: (R) => `${R}T23:59:00Z` }
};

// ---------------------------------------------------------------- the day windows

const today = vnDateKey();

/** VN day windows of the matrix (fixed days are in the future so they never become "late"). */
function windows() {
  return {
    'RT-01': { title: 'same day pickup and return (1 day)', P: addDays(today, 41), R: addDays(today, 41) },
    'RT-02': { title: 'one night', P: addDays(today, 45), R: addDays(today, 46) },
    'RT-03': { title: 'cross-month 30/09 → 02/10', P: '2027-09-30', R: '2027-10-02' },
    'RT-04': { title: 'cross-year 31/12 → 01/01', P: '2026-12-31', R: '2027-01-01' },
    'RT-05': { title: '30-day rental', P: addDays(today, 70), R: addDays(today, 99) },
    'RT-06': { title: 'days in the past', P: addDays(today, -10), R: addDays(today, -8) },
    'RT-07': { title: 'pickup today, return tomorrow', P: today, R: addDays(today, 1) },
    'RT-08': { title: 'pickup and return today', P: today, R: today }
  };
}

/**
 * Known bugs: `<client>:<case>:<check>` (or `<client>:*:<check>`, `*:<case>:<check>`) → issue.
 * A matching test runs as `test.failing` (green while the bug is there).
 */
const CHECK = {
  detail: 'detail: GET /api/orders/{id} and by-number keep the VN days',
  list: 'list: planned-date filters find it on P and R only',
  held: 'availability: the unit is held on every day P..R, free the day before and after',
  oldIos: 'availability: old iOS UTC-day windows read the same VN days',
  oldAndroid: 'availability: old Android UTC-day windows read the same VN days',
  edit: 'edit: PUT with the same days keeps them',
  handOver: 'after hand-over: return lists and month counts use R'
};
const KNOWN = {
  // #575 and #576 (old iOS / old Android UTC-day windows) are fixed by #590: those checks are normal tests now.
  // #577 (the pre-#413 Android return `R T23:59:00Z` was stored as R+1 in Vietnam) is fixed on write by
  // normalizeLegacyPlanDays: the oldAndroid checks are normal tests now.
};

function knownIssue(client, caseId, check) {
  for (const key of [`${client}:${caseId}:${check}`, `${client}:*:${check}`, `*:${caseId}:${check}`, `*:*:${check}`]) {
    if (KNOWN[key]) return KNOWN[key];
  }
  return null;
}

// ---------------------------------------------------------------- read helpers

const ids = (rows) => (rows || []).map((o) => o.id);
const vnKeyOf = (iso) => (iso ? vnDateKey(new Date(iso)) : null);

async function ok(promise, label) {
  const r = await promise;
  if (!r.ok) throw new Error(`${label}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body.data;
}

async function byDate(s, date, extra = '') {
  const data = await ok(s.get(`/api/calendar/orders/by-date?date=${date}&limit=500${extra}`), `by-date ${date}`);
  return ids(data.orders);
}

async function monthCount(s, key, tz) {
  const [y, m] = key.split('-').map(Number);
  const q = `month=${m}&year=${y}${tz ? `&timeZone=${encodeURIComponent(tz)}` : ''}`;
  return ok(s.get(`/api/calendar/orders/count?${q}`), `calendar count ${q}`);
}

/** Months (first day keys) touched by days a..b. */
function monthsOf(a, b) {
  const out = [];
  let k = `${a.slice(0, 7)}-01`;
  while (k <= b) {
    out.push(k);
    const [y, m] = k.split('-').map(Number);
    k = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  }
  return out;
}

/** { dayKey: { count, pickups, returns } } for every day of the months that hold P-1 .. R+1. */
async function calendarSnapshot(s, P, R, tz) {
  const snap = {};
  for (const first of monthsOf(addDays(P, -1), addDays(R, 1))) {
    const data = await monthCount(s, first, tz);
    for (const [k, count] of Object.entries(data.countByDate || {})) {
      snap[k] = { count, pickups: data.byDate?.[k]?.pickups ?? 0, returns: data.byDate?.[k]?.returns ?? 0 };
    }
  }
  return snap;
}

/** Days whose numbers moved between two snapshots: { dayKey: { count: +1, ... } }. */
function snapshotDelta(after, before) {
  const out = {};
  for (const k of Object.keys(after)) {
    const a = after[k];
    const b = before[k] || { count: 0, pickups: 0, returns: 0 };
    const d = { count: a.count - b.count, pickups: a.pickups - b.pickups, returns: a.returns - b.returns };
    if (d.count || d.pickups || d.returns) out[k] = d;
  }
  return out;
}

/** Batch availability (the cart check) of one stock-1 product for one VN day, in a client's window shape. */
async function heldOn(s, productId, key, shape = 'web') {
  let startDate;
  let endDate;
  if (shape === 'web') {
    // dayRangeIso of the web Tạo đơn: 00:00 VN .. the last ms of the day
    startDate = vnInstant(key);
    endDate = new Date(Date.parse(vnInstant(addDays(key, 1))) - 1).toISOString();
  } else if (shape === 'oldIos') {
    // App Store iOS Order Check: the UTC day of the key
    startDate = `${key}T00:00:00.000Z`;
    endDate = `${key}T23:59:59.999Z`;
  } else if (shape === 'oldAndroid') {
    // Android before #413
    startDate = `${key}T00:00:00Z`;
    endDate = `${key}T23:59:59Z`;
  }
  const data = await ok(
    s.post('/api/products/batch-availability', { products: [{ productId, quantity: 1 }], startDate, endDate }),
    `batch availability ${key} ${shape}`
  );
  return data.results[0].isAvailable === false;
}

// ---------------------------------------------------------------- the matrix

describeE2E('BF-RT chosen rental days round trip', () => {
  let s;
  const created = [];

  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  afterAll(async () => {
    // Free the days for the next run on the same database (the business DB is reseeded anyway)
    for (const id of created) await s.setStatus(id, 'CANCELLED').catch(() => {});
  });

  const W = windows();
  for (const [client, shape] of Object.entries(CLIENTS)) {
    for (const [caseId, w] of Object.entries(W)) {
      const { P, R } = w;
      const days = civilDays(P, R);
      const fullId = `BF-${caseId}-${client}`;

      describe(`${fullId} ${w.title} (${P} → ${R}) sent like ${client}`, () => {
        const ctx = {};
        const check = (name, fn) => {
          const issue = knownIssue(client, caseId, name);
          const title = `${fullId} ${name}`;
          return issue ? knownBug(issue, title, fn) : test(title, fn);
        };

        beforeAll(async () => {
          // DAILY, so the stored rentalDuration / rentalDays show how the API counts the days of the instants
          ctx.product = await s.createProduct({ kind: 'DAILY', price: 100000, stock: 1 });
          ctx.customer = await s.createCustomer();
          ctx.body = {
            orderType: 'RENT',
            customerId: ctx.customer.id,
            outletId: ctx.product.outletId,
            pickupPlanAt: shape.pickup(P),
            returnPlanAt: shape.ret(R),
            orderItems: [
              {
                productId: ctx.product.id,
                quantity: 1,
                unitPrice: 100000,
                totalPrice: 100000 * days,
                deposit: 0,
                pricingType: 'DAILY',
                ...(shape.rentDays ? { rentDays: days } : {})
              }
            ],
            ...(shape.rentalDuration ? { rentalDuration: days, rentalDurationUnit: 'day' } : {}),
            subtotal: 100000 * days,
            totalAmount: 100000 * days,
            depositAmount: 0,
            securityDeposit: 0,
            discountAmount: 0
          };
          ctx.calBefore = await calendarSnapshot(s, P, R);
          ctx.calBeforeTz = await calendarSnapshot(s, P, R, VN);
          ctx.opsBefore = P === today || R === today ? await ok(s.get(`/api/analytics/outlet-operations?outletIds=${ctx.product.outletId}`), 'ops') : null;
          const r = shape.transport === 'multipart' ? await s.createOrderRaw(ctx.body) : await s.post('/api/orders', ctx.body);
          if (!r.ok) throw new Error(`create: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
          ctx.order = r.body.data;
          created.push(ctx.order.id);
        });

        check(CHECK.detail, async () => {
          const d = await ok(s.get(`/api/orders/${ctx.order.id}`), 'detail');
          const o = d.order || d;
          expect([vnKeyOf(o.pickupPlanAt), vnKeyOf(o.returnPlanAt)]).toEqual([P, R]);
          // rental days, both ends counted (#351): sent by iOS, computed from the instants for the others
          expect([o.rentalDuration, (o.orderItems || [])[0]?.rentalDays]).toEqual([days, days]);
          const n = await ok(s.get(`/api/orders/by-number/${ctx.order.orderNumber}`), 'by-number');
          const on = n.order || n;
          expect([vnKeyOf(on.pickupPlanAt), vnKeyOf(on.returnPlanAt)]).toEqual([P, R]);
          // the create response already says the same
          expect([vnKeyOf(ctx.order.pickupPlanAt), vnKeyOf(ctx.order.returnPlanAt)]).toEqual([P, R]);
        });

        check(CHECK.list, async () => {
          const list = async (field, from, to) => {
            const q = new URLSearchParams({ customerId: String(ctx.customer.id), dateField: field, startDate: from, endDate: to, limit: '50' });
            const data = await ok(s.get(`/api/orders?${q}`), `orders ${field} ${from}`);
            return ids(data.orders || data.items || data);
          };
          expect(await list('pickupPlanAt', P, P)).toContain(ctx.order.id);
          expect(await list('pickupPlanAt', addDays(P, -1), addDays(P, -1))).not.toContain(ctx.order.id);
          expect(await list('pickupPlanAt', addDays(P, 1), addDays(P, 1))).not.toContain(ctx.order.id);
          expect(await list('returnPlanAt', R, R)).toContain(ctx.order.id);
          expect(await list('returnPlanAt', addDays(R, -1), addDays(R, -1))).not.toContain(ctx.order.id);
          expect(await list('returnPlanAt', addDays(R, 1), addDays(R, 1))).not.toContain(ctx.order.id);
          // status RESERVED with a created-on range of today (the shop web list) still has it
          const q = new URLSearchParams({ customerId: String(ctx.customer.id), status: 'RESERVED', startDate: today, endDate: today });
          const rows = (await ok(s.get(`/api/orders?${q}`), 'orders created today')).orders;
          const row = rows.find((x) => x.id === ctx.order.id);
          expect([vnKeyOf(row.pickupPlanAt), vnKeyOf(row.returnPlanAt)]).toEqual([P, R]);
        });

        check('calendar day: by-date lists it on P only', async () => {
          expect(await byDate(s, P)).toContain(ctx.order.id);
          expect(await byDate(s, P, '&status=RESERVED')).toContain(ctx.order.id);
          expect(await byDate(s, P, `&timeZone=${encodeURIComponent(VN)}`)).toContain(ctx.order.id);
          expect(await byDate(s, addDays(P, -1))).not.toContain(ctx.order.id);
          expect(await byDate(s, addDays(P, 1))).not.toContain(ctx.order.id);
        });

        check('calendar month: counts it on P only', async () => {
          const want = { [P]: { count: 1, pickups: 1, returns: 0 } };
          expect(snapshotDelta(await calendarSnapshot(s, P, R), ctx.calBefore)).toEqual(want);
          expect(snapshotDelta(await calendarSnapshot(s, P, R, VN), ctx.calBeforeTz)).toEqual(want);
        });

        check(CHECK.held, async () => {
          const want = {};
          const got = {};
          const probe = [addDays(P, -1), ...Array.from({ length: Math.min(days, 3) }, (_, i) => addDays(P, i)), R, addDays(R, 1)];
          for (const k of [...new Set(probe)]) {
            want[k] = k >= P && k <= R;
            got[k] = await heldOn(s, ctx.product.id, k, 'web');
          }
          expect(got).toEqual(want);
        });

        check(CHECK.oldIos, async () => {
          const want = {};
          const got = {};
          for (const k of [...new Set([addDays(P, -1), P, R, addDays(R, 1)])]) {
            want[k] = k >= P && k <= R;
            got[k] = await heldOn(s, ctx.product.id, k, 'oldIos');
          }
          expect(got).toEqual(want);
        });

        check(CHECK.oldAndroid, async () => {
          const want = {};
          const got = {};
          for (const k of [...new Set([addDays(P, -1), P, R, addDays(R, 1)])]) {
            want[k] = k >= P && k <= R;
            got[k] = await heldOn(s, ctx.product.id, k, 'oldAndroid');
          }
          expect(got).toEqual(want);
        });

        if (P === today || R === today) {
          check('today work: outlet-operations lists it as a hand-over today', async () => {
            for (const tz of [null, VN]) {
              const q = `outletIds=${ctx.product.outletId}${tz ? `&timeZone=${encodeURIComponent(tz)}` : ''}`;
              const ops = await ok(s.get(`/api/analytics/outlet-operations?${q}`), 'ops');
              expect(ops.date).toBe(today);
              expect(ops.pickupsToday.count - ctx.opsBefore.pickupsToday.count).toBe(1);
              if (ops.pickupsToday.count <= 50) expect(ids(ops.pickupsToday.orders)).toContain(ctx.order.id);
            }
          });
        }

        check(CHECK.edit, async () => {
          const r = await s.updateOrder(ctx.order.id, {
            pickupPlanAt: ctx.body.pickupPlanAt,
            returnPlanAt: ctx.body.returnPlanAt,
            notes: `rt ${fullId}`
          });
          expect(r.status).toBe(200);
          const o = await s.getOrder(ctx.order.id);
          expect([vnKeyOf(o.pickupPlanAt), vnKeyOf(o.returnPlanAt), o.notes]).toEqual([P, R, `rt ${fullId}`]);
          expect(await byDate(s, P)).toContain(ctx.order.id);
        });

        check(CHECK.handOver, async () => {
          const before = await calendarSnapshot(s, P, R);
          const r = await s.setStatus(ctx.order.id, 'PICKUPED');
          expect(r.status).toBe(200);
          expect(await byDate(s, R, '&kind=return')).toContain(ctx.order.id);
          expect(await byDate(s, addDays(R, -1), '&kind=return')).not.toContain(ctx.order.id);
          expect(await byDate(s, addDays(R, 1), '&kind=return')).not.toContain(ctx.order.id);
          const delta = snapshotDelta(await calendarSnapshot(s, P, R), before);
          const want = P === R ? { [P]: { count: 0, pickups: -1, returns: 1 } } : { [P]: { count: 0, pickups: -1, returns: 0 }, [R]: { count: 0, pickups: 0, returns: 1 } };
          expect(delta).toEqual(want);
          if (R === today) {
            const ops = await ok(s.get(`/api/analytics/outlet-operations?outletIds=${ctx.product.outletId}`), 'ops');
            if (ops.returnsToday.count <= 50) expect(ids(ops.returnsToday.orders)).toContain(ctx.order.id);
          }
        });
      });
    }
  }

  // ---------------------------------------------------------------- instants inside the VN day

  describe('BF-RT-09 instants away from midnight', () => {
    const P = addDays(today, 51);
    const R = addDays(today, 52);
    const make = async (pickupPlanAt, returnPlanAt) => {
      const product = await s.createProduct({ kind: 'FIXED', price: 100000, stock: 1 });
      const customer = await s.createCustomer();
      const r = await s.post('/api/orders', {
        orderType: 'RENT',
        customerId: customer.id,
        outletId: product.outletId,
        pickupPlanAt,
        returnPlanAt,
        orderItems: [{ productId: product.id, quantity: 1, unitPrice: 100000, totalPrice: 100000, pricingType: 'FIXED', rentDays: 1 }],
        totalAmount: 100000,
        depositAmount: 0
      });
      if (!r.ok) throw new Error(`create: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
      created.push(r.body.data.id);
      return { order: r.body.data, product };
    };

    test('BF-RT-09a pickup 00:30 VN and return 06:59 VN (both on the UTC day before) stay on the VN days', async () => {
      const pickup = vnInstant(P, '00:30:00.000');
      const ret = vnInstant(R, '06:59:00.000');
      expect(pickup.slice(0, 10)).toBe(addDays(P, -1)); // the UTC date is the day before
      const { order, product } = await make(pickup, ret);
      const o = await s.getOrder(order.id);
      expect([vnKeyOf(o.pickupPlanAt), vnKeyOf(o.returnPlanAt)]).toEqual([P, R]);
      expect(await byDate(s, P)).toContain(order.id);
      expect(await byDate(s, addDays(P, -1))).not.toContain(order.id);
      const held = {};
      for (const k of [addDays(P, -1), P, R, addDays(R, 1)]) held[k] = await heldOn(s, product.id, k);
      expect(held).toEqual({ [addDays(P, -1)]: false, [P]: true, [R]: true, [addDays(R, 1)]: false });
    });

    test('BF-RT-09b the 17:00Z boundary: 17:00:00.000Z is the next VN day, 16:59:59.999Z is not', async () => {
      // pickup at exactly 00:00 VN (17:00Z the day before), return at the last ms of R (16:59:59.999Z)
      const a = await make(`${addDays(P, -1)}T17:00:00.000Z`, `${R}T16:59:59.999Z`);
      // one ms earlier on both ends: P-1 and R-1 in Vietnam
      const b = await make(`${addDays(P, -1)}T16:59:59.999Z`, `${addDays(R, -1)}T16:59:59.999Z`);
      const oa = await s.getOrder(a.order.id);
      const ob = await s.getOrder(b.order.id);
      expect([vnKeyOf(oa.pickupPlanAt), vnKeyOf(oa.returnPlanAt)]).toEqual([P, R]);
      expect([vnKeyOf(ob.pickupPlanAt), vnKeyOf(ob.returnPlanAt)]).toEqual([addDays(P, -1), addDays(R, -1)]);
      expect(await byDate(s, P)).toContain(a.order.id);
      expect(await byDate(s, P)).not.toContain(b.order.id);
      expect(await byDate(s, addDays(P, -1))).toContain(b.order.id);
      // a holds P..R, b holds P-1..R-1 (= P-1..P)
      const heldA = {};
      const heldB = {};
      for (const k of [addDays(P, -1), P, R, addDays(R, 1)]) {
        heldA[k] = await heldOn(s, a.product.id, k);
        heldB[k] = await heldOn(s, b.product.id, k);
      }
      expect(heldA).toEqual({ [addDays(P, -1)]: false, [P]: true, [R]: true, [addDays(R, 1)]: false });
      expect(heldB).toEqual({ [addDays(P, -1)]: true, [P]: true, [R]: false, [addDays(R, 1)]: false });
    });
  });
});

