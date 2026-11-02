/**
 * Scenarios for the auth + GET /api/orders compatibility test (#1450, for the release that carries #1409 and #1392).
 *
 * The real route, the real `withPermissions`, `authenticateRequest` and `validateMerchantAccess` are loaded from a
 * source tree. Only I/O is replaced: `db` and `prisma` answer from the tables below. `db.orders.findManyLightweight`
 * is a stub that records its filters, so default limit, sort and scope are part of the golden file; the query itself
 * did not change in this release.
 *
 * A scenario is one HTTP answer: `{ status, body }`, plus `filters` for the order list.
 */
import jsonwebtoken from 'jsonwebtoken';
import { loadRoute, quietly, request, type StoreHolder, THIS_ROOT } from './load-route';

/** 8 Oct 2026, 12:00 in Vietnam */
export const NOW = new Date('2026-10-08T05:00:00.000Z');

const SHOP = { merchantId: 1, outletId: 2 };
const MERCHANT = { id: 1, name: 'Tiệm Áo Dài' };
const OUTLET = { id: 2, name: 'Chi nhánh 1', merchant: { id: 1 }, isActive: true };
const PERIOD_END = new Date('2026-11-08T05:00:00.000Z');
const ACTIVE = { status: 'ACTIVE', currentPeriodEnd: PERIOD_END, currentPeriodStart: new Date('2026-10-08T05:00:00.000Z') };

type Role = 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';

const ROWS = [
  {
    id: 501, orderNumber: '730005', orderType: 'RENT', status: 'RESERVED', outletId: 2, customerId: 101,
    totalAmount: 450000, depositAmount: 100000, securityDeposit: 500000, damageFee: 0, lateFee: 0, discountAmount: 0,
    pickupPlanAt: new Date('2026-10-10T02:00:00.000Z'), returnPlanAt: new Date('2026-10-12T02:00:00.000Z'),
    pickedUpAt: null, returnedAt: null, createdAt: new Date('2026-10-07T02:00:00.000Z'), updatedAt: new Date('2026-10-07T02:00:00.000Z'), deletedAt: null,
    customerName: 'Nguyễn Lan', customerPhone: '0901234567', outletName: 'Chi nhánh 1', createdByName: 'Minh',
    orderItems: [{ id: 1, productId: 11, productName: 'Áo dài đỏ', quantity: 1, unitPrice: 450000, totalPrice: 450000, deposit: 0 }],
  },
  {
    id: 502, orderNumber: '730006', orderType: 'RENT', status: 'PICKUPED', outletId: 2, customerId: 102,
    totalAmount: 300000, depositAmount: 0, securityDeposit: 200000, damageFee: 0, lateFee: 0, discountAmount: 0,
    pickupPlanAt: new Date('2026-10-06T02:00:00.000Z'), returnPlanAt: new Date('2026-10-09T02:00:00.000Z'),
    pickedUpAt: new Date('2026-10-06T03:00:00.000Z'), returnedAt: null, createdAt: new Date('2026-10-05T02:00:00.000Z'), updatedAt: new Date('2026-10-06T03:00:00.000Z'), deletedAt: null,
    customerName: 'Trần Mai', customerPhone: null, outletName: 'Chi nhánh 1', createdByName: 'Minh',
    orderItems: [{ id: 2, productId: 12, productName: 'Váy cưới', quantity: 2, unitPrice: 150000, totalPrice: 300000, deposit: 0 }],
  },
  {
    id: 503, orderNumber: '730007', orderType: 'SALE', status: 'COMPLETED', outletId: 2, customerId: null,
    totalAmount: 120000, depositAmount: 0, securityDeposit: 0, damageFee: 0, lateFee: 0, discountAmount: 0,
    pickupPlanAt: null, returnPlanAt: null, pickedUpAt: null, returnedAt: null,
    createdAt: new Date('2026-10-04T02:00:00.000Z'), updatedAt: new Date('2026-10-04T02:00:00.000Z'), deletedAt: null,
    customerName: null, customerPhone: null, outletName: 'Chi nhánh 1', createdByName: 'Minh',
    orderItems: [{ id: 3, productId: 13, productName: 'Khăn voan', quantity: 1, unitPrice: 120000, totalPrice: 120000, deposit: 0 }],
  },
];

const BANK_ACCOUNT = {
  id: 7, outletId: 2, accountHolderName: 'NGUYEN VAN A', accountNumber: '0123456789', bankName: 'Vietcombank', bankCode: 'VCB',
  branch: null, isDefault: true, isActive: true, qrCode: 'qr', notes: null,
  createdAt: new Date('2026-10-01T02:00:00.000Z'), updatedAt: new Date('2026-10-01T02:00:00.000Z'),
};
const BANK_BODY = { accountHolderName: 'NGUYEN VAN A', accountNumber: '0123456789', bankName: 'Vietcombank', isDefault: true };

export function prismaError(code: string | undefined, text: string, name = 'PrismaClientKnownRequestError') {
  const error = new Error(text) as Error & { code?: string };
  error.name = name;
  if (code) error.code = code;
  return error;
}

/** What Prisma put in `error.message` in the incident of #1408: the bundled source holds the word "subscription" */
export const RAW_WITH_SUBSCRIPTION =
  '\nInvalid `t.attendanceScan.findFirst()` invocation in\n/app/apps/api/.next/server/chunks/238.js:54:55586\n\n  51 SELECT u."merchantId" AS id FROM "User" u\n  subscription:d\nTimed out fetching a new connection from the connection pool.';
export const RAW_PLAIN = "\nInvalid `prisma.user.findUnique()` invocation:\n\n\nCan't reach database server at `db:5432`";

interface World {
  user?: any;
  userError?: Error;
  sessionStatus?: 'active' | 'replaced' | 'expired';
  sessionError?: Error;
  merchant?: any;
  merchantError?: Error;
  ordersError?: Error;
}

function makeHolder(world: World, role: Role, filters: unknown[]): StoreHolder {
  const user = 'user' in world ? world.user : { id: 7, role, isActive: true, outlet: { isActive: true }, passwordChangedAt: null, permissionsChangedAt: null };
  const merchant = 'merchant' in world ? world.merchant : { ...MERCHANT, subscription: ACTIVE };
  const prisma: any = {
    payment: { groupBy: async () => [{ orderId: 502, notes: null, _sum: { amount: 100000 } }] },
    merchantRole: { findUnique: async () => null, findFirst: async () => null },
    bankAccount: {
      findMany: async () => [BANK_ACCOUNT],
      findFirst: async () => BANK_ACCOUNT,
      create: async ({ data }: any) => ({ ...BANK_ACCOUNT, id: 8, ...data }),
      update: async ({ data }: any) => ({ ...BANK_ACCOUNT, ...data }),
      updateMany: async () => ({ count: 1 }),
    },
  };
  const db: any = {
    prisma,
    users: {
      findById: async () => {
        if (world.userError) throw world.userError;
        return user;
      },
    },
    sessions: {
      getSessionStatus: async () => {
        if (world.sessionError) throw world.sessionError;
        return world.sessionStatus ?? 'active';
      },
    },
    merchants: {
      findById: async () => {
        if (world.merchantError) throw world.merchantError;
        return merchant;
      },
    },
    outlets: { findById: async () => OUTLET },
    orders: {
      findManyLightweight: async (args: any) => {
        filters.push(JSON.parse(JSON.stringify(args)));
        if (world.ordersError) throw world.ordersError;
        const limit = args.limit ?? 50;
        return { data: ROWS, total: ROWS.length, page: args.page ?? 1, limit, hasMore: false };
      },
    },
  };
  return { db, prisma };
}

function bearer(role: Role, overrides: Record<string, unknown> = {}, options: jsonwebtoken.SignOptions = { expiresIn: '1h' }) {
  const payload = {
    userId: 7, email: 'staff@test', role, ...SHOP, sessionId: 's1', passwordChangedAt: null, permissionsChangedAt: null,
    ...(role === 'MERCHANT' ? { outletId: null } : {}),
    ...overrides,
  };
  return `Bearer ${jsonwebtoken.sign(payload, process.env.JWT_SECRET as string, options)}`;
}

type Answer = { status: number; body: any; filters?: unknown[] };

async function ordersGet(root: string, world: World, role: Role, query: string, authorization: string | null): Promise<Answer> {
  const filters: unknown[] = [];
  const holder = makeHolder(world, role, filters);
  const { GET } = loadRoute('orders', holder, root, { realAuth: true });
  const answer = await GET(request(`/api/orders${query}`, { headers: authorization ? { authorization } : {} }));
  return { status: answer.status, body: answer.body, ...(filters.length ? { filters } : {}) };
}

type BankCall = 'list' | 'create' | 'update' | 'setDefault' | 'remove';

async function bankCall(root: string, role: Role, call: BankCall): Promise<Answer> {
  const holder = makeHolder({}, role, []);
  const list = 'merchants/[id]/outlets/[outletId]/bank-accounts';
  const collection = { params: { id: '1', outletId: '2' } };
  const item = { params: { id: '1', outletId: '2', accountId: '7' } };
  const authorization = bearer(role);
  const req = (body?: unknown) => request('/api/merchants/1/outlets/2/bank-accounts', { headers: { authorization }, body });
  const run = async (): Promise<any> => {
    if (call === 'list') return loadRoute(list, holder, root, { realAuth: true }).GET(req(), collection);
    if (call === 'create') return loadRoute(list, holder, root, { realAuth: true }).POST(req(BANK_BODY), collection);
    const route = loadRoute(`${list}/[accountId]`, holder, root, { realAuth: true });
    if (call === 'update') return route.PUT(req({ accountHolderName: 'TRAN THI B' }), item);
    if (call === 'setDefault') return route.PUT(req({ isDefault: true }), item);
    return route.DELETE(req(), item);
  };
  const answer = await run();
  return { status: answer.status, body: answer.body };
}

export async function runAuthOrdersScenarios(root = THIS_ROOT): Promise<Record<string, Answer>> {
  const staff = bearer('OUTLET_STAFF');
  const scenarios: Record<string, () => Promise<Answer>> = {
    // ---- GET /api/orders, the calls installed apps make
    listAsMerchant: () => ordersGet(root, {}, 'MERCHANT', '', bearer('MERCHANT')),
    listAsOutletStaff: () => ordersGet(root, {}, 'OUTLET_STAFF', '', staff),
    listIosSearch: () => ordersGet(root, {}, 'OUTLET_STAFF', '?q=lan&page=2&limit=1&status=RESERVED&orderType=RENT&sortBy=createdAt&sortOrder=desc&startDate=2000-01-01', staff),
    listAndroidPickupDay: () => ordersGet(root, {}, 'OUTLET_STAFF', '?dateField=pickupPlanAt&startDate=2026-10-08&endDate=2026-10-08', staff),
    listBadLimit: () => ordersGet(root, {}, 'OUTLET_STAFF', '?limit=abc', staff),
    listBadTimeZone: () => ordersGet(root, {}, 'OUTLET_STAFF', '?timeZone=Mars/Base', staff),
    listHandlerDbFailure: () => ordersGet(root, { ordersError: prismaError('P2024', RAW_PLAIN) }, 'OUTLET_STAFF', '', staff),

    // ---- Auth failures installed apps already handle: same status, code, message
    noToken: () => ordersGet(root, {}, 'OUTLET_STAFF', '', null),
    garbageToken: () => ordersGet(root, {}, 'OUTLET_STAFF', '', 'Bearer not-a-token'),
    expiredToken: () => ordersGet(root, {}, 'OUTLET_STAFF', '', bearer('OUTLET_STAFF', {}, { expiresIn: -10 })),
    accountDeactivated: () => ordersGet(root, { user: { id: 7, role: 'OUTLET_STAFF', isActive: false, outlet: { isActive: true } } }, 'OUTLET_STAFF', '', staff),
    accountGone: () => ordersGet(root, { user: null }, 'OUTLET_STAFF', '', staff),
    outletDeactivated: () => ordersGet(root, { user: { id: 7, role: 'OUTLET_STAFF', isActive: true, outlet: { isActive: false }, passwordChangedAt: null, permissionsChangedAt: null } }, 'OUTLET_STAFF', '', staff),
    passwordChanged: () => ordersGet(root, { user: { id: 7, role: 'OUTLET_STAFF', isActive: true, outlet: { isActive: true }, passwordChangedAt: NOW, permissionsChangedAt: null } }, 'OUTLET_STAFF', '', staff),
    permissionsChanged: () => ordersGet(root, { user: { id: 7, role: 'OUTLET_STAFF', isActive: true, outlet: { isActive: true }, passwordChangedAt: null, permissionsChangedAt: NOW } }, 'OUTLET_STAFF', '', staff),
    sessionReplaced: () => ordersGet(root, { sessionStatus: 'replaced' }, 'OUTLET_STAFF', '', staff),
    sessionExpired: () => ordersGet(root, { sessionStatus: 'expired' }, 'OUTLET_STAFF', '', staff),
    merchantGone: () => ordersGet(root, { merchant: null }, 'OUTLET_STAFF', '', staff),
    noSubscription: () => ordersGet(root, { merchant: { ...MERCHANT, subscription: null } }, 'OUTLET_STAFF', '', staff),
    subscriptionPaused: () => ordersGet(root, { merchant: { ...MERCHANT, subscription: { ...ACTIVE, status: 'PAUSED' } } }, 'OUTLET_STAFF', '', staff),
    subscriptionCancelledEnded: () => ordersGet(root, { merchant: { ...MERCHANT, subscription: { status: 'CANCELLED', currentPeriodEnd: new Date('2026-10-01T00:00:00.000Z') } } }, 'OUTLET_STAFF', '', staff),
    subscriptionCheckDbFailure: () => ordersGet(root, { merchantError: prismaError('P2024', RAW_PLAIN) }, 'OUTLET_STAFF', '', staff),
    authOtherError: () => ordersGet(root, { userError: new Error('boom') }, 'OUTLET_STAFF', '', staff),

    // ---- #1409, changed on purpose (see the test)
    authPrismaFailureWithSubscriptionWord: () => ordersGet(root, { userError: prismaError('P2024', RAW_WITH_SUBSCRIPTION) }, 'OUTLET_STAFF', '', staff),
    authPrismaFailurePlain: () => ordersGet(root, { userError: prismaError('P1001', RAW_PLAIN) }, 'OUTLET_STAFF', '', staff),
    authPrismaFailureNoCode: () => ordersGet(root, { userError: prismaError(undefined, RAW_PLAIN, 'PrismaClientUnknownRequestError') }, 'OUTLET_STAFF', '', staff),
    sessionReadPrismaFailure: () => ordersGet(root, { sessionError: prismaError('P2024', RAW_PLAIN) }, 'OUTLET_STAFF', '', staff),
    authOtherErrorWithSubscriptionWord: () => ordersGet(root, { userError: new Error('the subscription row failed at /app/x.js') }, 'OUTLET_STAFF', '', staff),

    // ---- Bank accounts: the owner as before; #1392 turns the manager's writes into 403
    bankListMerchant: () => bankCall(root, 'MERCHANT', 'list'),
    bankListManager: () => bankCall(root, 'OUTLET_ADMIN', 'list'),
    bankListStaff: () => bankCall(root, 'OUTLET_STAFF', 'list'),
    bankCreateMerchant: () => bankCall(root, 'MERCHANT', 'create'),
    bankUpdateMerchant: () => bankCall(root, 'MERCHANT', 'update'),
    bankSetDefaultMerchant: () => bankCall(root, 'MERCHANT', 'setDefault'),
    bankDeleteMerchant: () => bankCall(root, 'MERCHANT', 'remove'),
    bankCreateStaff: () => bankCall(root, 'OUTLET_STAFF', 'create'),
    bankUpdateStaff: () => bankCall(root, 'OUTLET_STAFF', 'update'),
    bankDeleteStaff: () => bankCall(root, 'OUTLET_STAFF', 'remove'),
    bankCreateManager: () => bankCall(root, 'OUTLET_ADMIN', 'create'),
    bankUpdateManager: () => bankCall(root, 'OUTLET_ADMIN', 'update'),
    bankSetDefaultManager: () => bankCall(root, 'OUTLET_ADMIN', 'setDefault'),
    bankDeleteManager: () => bankCall(root, 'OUTLET_ADMIN', 'remove'),
  };

  const results: Record<string, Answer> = {};
  for (const [name, run] of Object.entries(scenarios)) {
    results[name] = await quietly(run);
  }
  return JSON.parse(JSON.stringify(results));
}
