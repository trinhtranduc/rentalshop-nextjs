/**
 * Shared read/act helpers for work-stock-calendar.e2e.test.js and roles-flows.e2e.test.js (#727).
 * They only call the endpoints the iOS/Android apps call; every number a test asserts comes from a response.
 */
const { must, vnDateKey, addDays, rentBody, saleBody, SHOP_TZ } = require('./api');

const listOf = (data, ...keys) => {
  if (Array.isArray(data)) return data;
  for (const k of [...keys, 'items', 'data']) if (Array.isArray(data?.[k])) return data[k];
  return [];
};

/** Row of `GET /api/products` (the "Còn N hôm nay" number) for one product at an outlet. */
async function productRow(session, product, outletId) {
  const q = new URLSearchParams({ search: product.name, limit: '20' });
  if (outletId) q.set('outletId', String(outletId));
  const data = await must(session.get(`/api/products?${q}`), 'list products');
  return listOf(data, 'products').find((p) => p.id === product.id) || null;
}

/**
 * Every place the apps read a product's units, for one outlet:
 * list = Home/product list row ("Còn N hôm nay"), detail = OutletStock row of GET /api/products/{id}.
 */
async function stockView(session, product, outletId) {
  const row = await productRow(session, product, outletId);
  const detail = await session.outletStock(product.id, outletId);
  const listStock = (row?.outletStock || []).find((os) => (os.outlet?.id ?? os.outletId) === outletId);
  return {
    list: row && {
      today: row.effectiveAvailableToday,
      available: row.available,
      stock: row.stock,
      renting: row.renting,
      rowAvailable: listStock?.available
    },
    detail
  };
}

/** `{ 'YYYY-MM-DD': available }` from GET /api/products/{id}/availability-calendar (the "free days" grid). */
async function freeDays(session, product, from, to, outletId) {
  const q = new URLSearchParams({ from, to });
  if (outletId) q.set('outletId', String(outletId));
  const data = await must(session.get(`/api/products/${product.id}/availability-calendar?${q}`), 'availability-calendar');
  return Object.fromEntries(data.days.map((d) => [d.date, d.available]));
}

/** Days a..b (inclusive keys) in order. */
function dayKeys(a, b) {
  const out = [];
  for (let k = a; k <= b; k = addDays(k, 1)) out.push(k);
  return out;
}

/** `effectivelyAvailable` of the single-product check for one VN day (what the cart's first check reads). */
async function freeOn(session, product, day, { quantity = 1, outletId, to } = {}) {
  const av = await session.availability(product.id, { from: day, to: to || day, quantity, outletId });
  return { free: av.availabilityByOutlet[0].effectivelyAvailable, ok: av.isAvailable, av };
}

async function oneDayFree(session, product, days, outletId) {
  const out = {};
  for (const d of days) out[d] = (await freeOn(session, product, d, { outletId })).free;
  return out;
}

/** Create a RENT order. `at` overrides the pickup / return instants. Returns the created order (data). */
async function bookRent(session, { product, quantity = 1, from, to, outletId, customer, depositAmount = 0, securityDeposit, at, lines, extra = {} }) {
  const c = customer || (await session.createCustomer());
  const { body } = rentBody({ customer: c, lines: lines || [{ product, quantity }], from, to, depositAmount, securityDeposit });
  if (at?.pickup) body.pickupPlanAt = at.pickup.toISOString();
  if (at?.return) body.returnPlanAt = at.return.toISOString();
  if (outletId) body.outletId = outletId;
  return session.createOrder({ ...body, ...extra });
}

async function bookRentRaw(session, args) {
  const c = args.customer || (await session.createCustomer());
  const { body } = rentBody({ customer: c, lines: args.lines || [{ product: args.product, quantity: args.quantity || 1 }], from: args.from, to: args.to });
  if (args.outletId) body.outletId = args.outletId;
  return session.createOrderRaw(body);
}

async function sell(session, { product, quantity = 1, outletId, customer }) {
  const c = customer || (await session.createCustomer());
  const { body } = saleBody({ customer: c, lines: [{ product, quantity }] });
  if (outletId) body.outletId = outletId;
  return session.createOrder(body);
}

// ---------------------------------------------------------------- calendar

/** `{ countByDate[key], pickups, returns }` of one day from GET /api/calendar/orders/count (month of the key). */
async function calendarDay(session, key, { status, outletId, timeZone } = {}) {
  const [y, m] = key.split('-').map(Number);
  const q = new URLSearchParams({ month: String(m), year: String(y) });
  if (status) q.set('status', status);
  if (outletId) q.set('outletId', String(outletId));
  if (timeZone) q.set('timeZone', timeZone);
  const data = await must(session.get(`/api/calendar/orders/count?${q}`), 'calendar count');
  return {
    count: data.countByDate[key] ?? 0,
    pickups: data.byDate[key]?.pickups ?? 0,
    returns: data.byDate[key]?.returns ?? 0,
    lateReturns: data.lateReturns,
    raw: data
  };
}

/** Rows of GET /api/calendar/orders/by-date. */
async function calendarList(session, date, { status, kind, outletId, timeZone } = {}) {
  const q = new URLSearchParams({ date, limit: '500' });
  if (status) q.set('status', status);
  if (kind) q.set('kind', kind);
  if (outletId) q.set('outletId', String(outletId));
  if (timeZone) q.set('timeZone', timeZone);
  const data = await must(session.get(`/api/calendar/orders/by-date?${q}`), 'calendar by-date');
  return data.orders;
}

// ---------------------------------------------------------------- việc cần làm (Hôm nay card)

async function operations(session, { outletIds, timeZone = SHOP_TZ } = {}) {
  const q = new URLSearchParams();
  if (timeZone) q.set('timeZone', timeZone);
  if (outletIds) q.set('outletIds', String(outletIds));
  return must(session.get(`/api/analytics/outlet-operations?${q}`), 'outlet operations');
}

/** The counters of the card as flat numbers (cash ones only when the caller may see cash). */
function opsCounters(ops) {
  const c = ops.cash;
  return {
    pickups: ops.pickupsToday.count,
    returns: ops.returnsToday.count,
    late: ops.overdueReturns.count,
    noShows: ops.noShows.count,
    soon: ops.returnsSoon.count,
    tomorrowPickups: ops.tomorrow.pickups,
    tomorrowReturns: ops.tomorrow.returns,
    donePickups: ops.doneToday.pickups,
    doneReturns: ops.doneToday.returns,
    newToday: ops.newOrdersByDay[ops.newOrdersByDay.length - 1]?.count ?? 0,
    ...(c
      ? {
          toCollectOrders: c.collateralToCollect.orders,
          toCollect: c.collateralToCollect.securityDeposit,
          toReturnOrders: c.collateralToReturn.orders,
          toReturn: c.collateralToReturn.securityDeposit,
          heldOrders: c.depositsHeld.orders,
          heldDeposit: c.depositsHeld.depositAmount,
          heldCollateral: c.depositsHeld.securityDeposit,
          dueTodayOrders: c.depositsDueToday.orders,
          dueTodayDeposit: c.depositsDueToday.depositAmount,
          dueTodayCollateral: c.depositsDueToday.securityDeposit,
          feesOrders: c.feesToday.orders,
          lateFees: c.feesToday.lateFee,
          damageFees: c.feesToday.damageFee
        }
      : {})
  };
}

/** Watcher: `await w.delta()` = nonzero change of every counter since the last call (zeros dropped). */
async function watchOperations(session, opts = {}) {
  let last = opsCounters(await operations(session, opts));
  return {
    async delta() {
      const ops = await operations(session, opts);
      const now = opsCounters(ops);
      const d = {};
      for (const k of Object.keys(now)) if (now[k] !== last[k]) d[k] = now[k] - last[k];
      last = now;
      return { d, ops };
    }
  };
}

const ids = (rows) => (rows || []).map((o) => o.id).sort((a, b) => a - b);

/** Cancel whatever is still open, so the "việc cần làm" lists of a later run stay short. */
async function cancelOpen(session, orderIds) {
  for (const id of orderIds) {
    try {
      const o = await session.getOrder(id);
      if (o.status === 'RESERVED' || o.status === 'PICKUPED') await session.setStatus(id, 'CANCELLED');
    } catch {
      /* already gone */
    }
  }
}

module.exports = {
  listOf,
  productRow,
  stockView,
  freeDays,
  dayKeys,
  freeOn,
  oneDayFree,
  bookRent,
  bookRentRaw,
  sell,
  calendarDay,
  calendarList,
  operations,
  opsCounters,
  watchOperations,
  ids,
  cancelOpen,
  vnDateKey,
  addDays
};
