/**
 * Scenarios for the POST /api/orders compatibility test (release dev → main-real), mainly #341:
 * one Save / Confirm = one order. Installed apps send no `Idempotency-Key`; today an identical order by
 * the same staff within 60 s returns the first order instead of a second one.
 *
 * The real route and the real `db.orders` (`packages/database/src/order.ts`, with the #341 create guard on
 * dev) are loaded from a source tree; only Prisma is an in-memory table (orders, order lines, keys).
 * Every scenario starts on an empty table at NOW; `wait` moves the clock between requests.
 */
import path from 'path';
import { matchesWhere } from '../helpers/fake-order-store';
import { loadRoute, quietly, request, type StoreHolder, THIS_ROOT } from './load-route';

/** "Now" for the first request of every scenario: 8 Oct 2026, 12:00 in Vietnam */
export const NOW = new Date('2026-10-08T05:00:00.000Z');

const OUTLET = { id: 1, name: 'Cửa hàng 1', merchantId: 1 };
const CUSTOMER = { id: 101, firstName: 'Lan', lastName: 'Nguyễn', phone: '0901234567', email: 'lan@test', merchantId: 1 };
const STAFF = { id: 7, email: 'staff@test', role: 'OUTLET_STAFF', firstName: 'Minh', lastName: 'Trần' };
const PRODUCTS: Record<number, any> = {
  11: { id: 11, name: 'Áo dài đỏ', barcode: '8930000000011', images: '["https://img.test/11.jpg"]', pricingType: 'FIXED', pricingOptions: [] },
  12: { id: 12, name: 'Váy cưới', barcode: '8930000000012', images: null, pricingType: 'DAILY', pricingOptions: [] },
};

const AUTH = { user: STAFF, userScope: { merchantId: 1, outletId: 1 } };

/** What iOS / Android on main-real send for a rental (no outletId: filled from the staff's outlet) */
export const RENT_BODY = {
  orderType: 'RENT',
  customerId: CUSTOMER.id,
  pickupPlanAt: '2026-10-10T02:00:00.000Z',
  returnPlanAt: '2026-10-12T02:00:00.000Z',
  totalAmount: 450000,
  depositAmount: 100000,
  securityDeposit: 500000,
  collateralType: 'CCCD',
  notes: 'Giao trước 9h',
  orderItems: [
    { productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000, deposit: 0 },
    { productId: 12, quantity: 2, unitPrice: 50000, totalPrice: 300000, deposit: 0, rentDays: 3 },
  ],
};

const plain = (value: unknown) => JSON.parse(JSON.stringify(value));

/** In-memory Prisma for the create path: order table, order lines and OrderCreateKey (#341) */
export function createOrderTable() {
  const orders: any[] = [];
  const keys: { userId: number; key: string; orderId: number }[] = [];
  let nextId = 1;
  let nextItemId = 1;
  const clone = (row: any) => (row ? structuredClone(row) : null);

  const prisma: any = {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(prisma),
    $executeRaw: async () => 0,
    order: {
      findUnique: async ({ where }: any) => clone(orders.find((o) => matchesWhere(o, where))),
      findFirst: async ({ where }: any) => clone(orders.find((o) => matchesWhere(o, where))),
      findMany: async ({ where, orderBy, take }: any) => {
        let rows = orders.filter((o) => matchesWhere(o, where));
        if (orderBy?.createdAt === 'desc') rows = [...rows].sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
        return rows.slice(0, take ?? rows.length).map(clone);
      },
      create: async ({ data }: any) => {
        const now = new Date();
        const customerId = data.customer?.connect?.id ?? null;
        const row = {
          id: nextId++,
          orderNumber: data.orderNumber,
          outletId: data.outlet.connect.id,
          outlet: { id: OUTLET.id, name: OUTLET.name },
          customerId,
          customer: customerId ? { id: CUSTOMER.id, firstName: CUSTOMER.firstName, lastName: CUSTOMER.lastName, phone: CUSTOMER.phone, email: CUSTOMER.email } : null,
          createdById: data.createdBy.connect.id,
          createdBy: { id: STAFF.id, firstName: STAFF.firstName, lastName: STAFF.lastName },
          orderType: data.orderType,
          status: data.status,
          totalAmount: data.totalAmount,
          depositAmount: data.depositAmount ?? 0,
          securityDeposit: data.securityDeposit ?? 0,
          damageFee: data.damageFee ?? 0,
          lateFee: data.lateFee ?? 0,
          discountType: data.discountType ?? null,
          discountValue: data.discountValue ?? 0,
          discountAmount: data.discountAmount ?? 0,
          loyaltyPointsRedeemed: 0,
          loyaltyDiscount: 0,
          loyaltyPointsEarned: 0,
          pickupPlanAt: data.pickupPlanAt ?? null,
          returnPlanAt: data.returnPlanAt ?? null,
          pickedUpAt: null,
          returnedAt: null,
          rentalDuration: data.rentalDuration ?? null,
          rentalDurationUnit: data.rentalDurationUnit ?? null,
          isReadyToDeliver: data.isReadyToDeliver ?? false,
          collateralType: data.collateralType ?? null,
          collateralDetails: data.collateralDetails ?? null,
          notes: data.notes ?? null,
          pickupNotes: data.pickupNotes ?? null,
          returnNotes: data.returnNotes ?? null,
          damageNotes: data.damageNotes ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          orderItems: (data.orderItems?.create ?? []).map((item: any) => ({
            id: nextItemId++,
            ...item,
            product: { id: item.productId, name: PRODUCTS[item.productId].name, barcode: PRODUCTS[item.productId].barcode, images: PRODUCTS[item.productId].images },
          })),
          payments: [],
        };
        orders.push(row);
        return clone(row);
      },
      delete: async ({ where }: any) => {
        const i = orders.findIndex((o) => o.id === where.id);
        return orders.splice(i, 1)[0];
      },
    },
    orderCreateKey: {
      findUnique: async ({ where }: any) => {
        const { userId, key } = where.userId_key;
        return keys.find((k) => k.userId === userId && k.key === key) ?? null;
      },
      upsert: async ({ where, create, update }: any) => {
        const { userId, key } = where.userId_key;
        const row = keys.find((k) => k.userId === userId && k.key === key);
        if (row) Object.assign(row, update);
        else keys.push({ ...create });
        return row ?? create;
      },
    },
  };

  return { prisma, count: () => orders.length };
}

/** db facade: the source tree's real `db.orders`, lookups for outlet / merchant / customer / product */
function createDb(root: string, prisma: any) {
  const database = path.join(root, 'packages/database/src');
  jest.doMock(path.join(database, 'client'), () => ({ prisma }));
  const { simplifiedOrders } = require(path.join(database, 'order'));
  return {
    prisma,
    orders: simplifiedOrders,
    outlets: {
      findById: async (id: number) => (id === OUTLET.id ? { ...OUTLET } : null),
      findDefaultForMerchant: async () => ({ ...OUTLET }),
    },
    merchants: { findById: async (id: number) => (id === 1 ? { id: 1, name: 'Shop', outlets: [{ id: 1 }] } : null) },
    customers: { findById: async (id: number) => (id === CUSTOMER.id ? { ...CUSTOMER } : null) },
    products: { findById: async (id: number) => (PRODUCTS[id] ? structuredClone(PRODUCTS[id]) : null) },
  };
}

type Step = { body: any; key?: string; wait?: number };

/** name → requests in order; `wait` = ms after the previous request */
export const SCENARIOS: Record<string, Step[]> = {
  // #341: installed apps (no key), double tap / retry → one order
  sameOrderTwiceNoKey: [{ body: RENT_BODY }, { body: RENT_BODY, wait: 20_000 }],
  // #341: walk-in rental (no customer), same
  walkInTwiceNoKey: [
    { body: { ...RENT_BODY, customerId: undefined } },
    { body: { ...RENT_BODY, customerId: undefined }, wait: 5_000 },
  ],
  // #341: new apps send a key; two different keys are two orders, even identical and seconds apart
  sameOrderDifferentKeys: [
    { body: RENT_BODY, key: 'create-key-0001' },
    { body: RENT_BODY, key: 'create-key-0002', wait: 1_000 },
  ],
  // #341: the same key again (a retry after a lost response) → the first order, even after the 60 s window
  sameKeyTwice: [
    { body: RENT_BODY, key: 'create-key-0003' },
    { body: RENT_BODY, key: 'create-key-0003', wait: 120_000 },
  ],
  // Unchanged: the same order again after 61 s is a new order
  sameOrderAfterWindow: [{ body: RENT_BODY }, { body: RENT_BODY, wait: 61_000 }],
  // Unchanged: a different quantity within 60 s is a new order
  differentItemsNoKey: [
    { body: RENT_BODY },
    { body: { ...RENT_BODY, orderItems: [RENT_BODY.orderItems[0], { ...RENT_BODY.orderItems[1], quantity: 1, totalPrice: 50000 }] }, wait: 10_000 },
  ],
  // Unchanged: a sale
  sale: [{ body: { orderType: 'SALE', customerId: CUSTOMER.id, totalAmount: 150000, orderItems: [{ productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000 }] } }],
  // #361: a sale sent with a deposit and collateral stores none
  saleWithDeposit: [{
    body: {
      orderType: 'SALE', customerId: CUSTOMER.id, totalAmount: 150000, depositAmount: 50000, securityDeposit: 100000,
      orderItems: [{ productId: 11, quantity: 1, unitPrice: 150000, totalPrice: 150000 }],
    },
  }],
  // Unchanged: validation error
  noItems: [{ body: { ...RENT_BODY, orderItems: [] } }],
  // Unchanged: unknown customer
  unknownCustomer: [{ body: { ...RENT_BODY, customerId: 999 } }],
};

/** Deterministic Math.random (order numbers), restarted for every scenario */
function seededRandom() {
  let seed = 341;
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

export async function runOrderCreateScenarios(root = THIS_ROOT): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  const holder: StoreHolder = { db: null, prisma: null };
  await quietly(async () => {
    for (const [name, steps] of Object.entries(SCENARIOS)) {
      const table = createOrderTable();
      const { POST } = loadRoute('orders', holder, root);
      holder.prisma = table.prisma;
      holder.db = createDb(root, table.prisma);
      jest.setSystemTime(NOW);
      const random = jest.spyOn(Math, 'random').mockImplementation(seededRandom());
      const responses = [];
      for (const step of steps) {
        if (step.wait) jest.setSystemTime(Date.now() + step.wait);
        const headers: Record<string, string> = step.key ? { 'Idempotency-Key': step.key } : {};
        responses.push(await POST(request('/api/orders', { body: step.body, headers }), AUTH));
      }
      random.mockRestore();
      out[name] = { responses, ordersInTable: table.count() };
    }
  });
  return plain(out);
}
