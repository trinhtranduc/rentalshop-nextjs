/**
 * In-memory stand-in for the Prisma client used by the #1199 installment route tests: one order table, one payment
 * table, the partial unique index (orderId, installmentKey) WHERE status = COMPLETED, and a transaction that just runs.
 * Only what the installment routes call is implemented.
 */
export interface FakeState {
  orders: Map<number, any>;
  payments: any[];
  nextPaymentId: number;
  audit: any[];
}

export function createFakeState(order: Record<string, any>, payments: any[] = []): FakeState {
  return {
    orders: new Map([[order.id, { deletedAt: null, depositAmount: 0, ...order }]]),
    payments: payments.map((payment, index) => ({ id: index + 1, orderId: order.id, ...payment })),
    nextPaymentId: payments.length + 1,
    audit: [],
  };
}

const matches = (row: any, where: any): boolean => {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR') {
      if (!(value as any[]).some((clause) => matches(row, clause))) return false;
    } else if (value && typeof value === 'object' && 'in' in (value as any)) {
      if (!(value as any).in.includes(row[key])) return false;
    } else if (row[key] !== value) {
      return false;
    }
  }
  return true;
};

/** `serialize`: transactions queue up one after the other, like `SELECT ... FOR UPDATE` on the one order row of a test */
export function createFakePrisma(state: FakeState, shop: Record<string, any> = {}, options: { serialize?: boolean } = {}) {
  let queue: Promise<unknown> = Promise.resolve();
  const withPayments = (order: any) => (order ? { ...order, payments: state.payments.filter((p) => p.orderId === order.id).map((p) => ({ ...p })) } : null);
  const tx: any = {
    $queryRaw: jest.fn(async () => []),
    order: {
      findUnique: jest.fn(async ({ where }: any) => withPayments(state.orders.get(where.id))),
      update: jest.fn(async ({ where, data }: any) => {
        const next = { ...state.orders.get(where.id), ...data };
        state.orders.set(where.id, next);
        return withPayments(next);
      }),
    },
    payment: {
      findFirst: jest.fn(async ({ where }: any) => state.payments.find((p) => matches(p, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => state.payments.filter((p) => matches(p, where)).map((p) => ({ ...p }))),
      create: jest.fn(async ({ data }: any) => {
        // yield so a concurrent request can pass its own checks first (race simulation)
        await Promise.resolve();
        if (
          data.installmentKey &&
          data.status === 'COMPLETED' &&
          state.payments.some((p) => p.orderId === data.orderId && p.installmentKey === data.installmentKey && p.status === 'COMPLETED')
        ) {
          throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
        }
        const row = { id: state.nextPaymentId++, createdAt: new Date(), ...data };
        state.payments.push(row);
        return { ...row };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = state.payments.find((p) => p.id === where.id);
        Object.assign(row, data);
        return { ...row };
      }),
    },
  };
  const prisma: any = {
    ...tx,
    merchant: {
      findUnique: jest.fn(async () => ({ currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', settings: null, ...shop })),
    },
    $transaction: jest.fn(async (fn: any) => {
      if (!options.serialize) return fn(tx);
      const run = queue.then(() => fn(tx));
      queue = run.catch(() => undefined);
      return run;
    }),
  };
  return { prisma, tx };
}

export const at = (iso: string) => new Date(iso);

export const planOrder = (extra: Record<string, any> = {}) => ({
  id: 10,
  orderNumber: '123456',
  outletId: 1,
  orderType: 'RENT',
  status: 'RESERVED',
  totalAmount: 12_000_000,
  depositAmount: 0,
  securityDeposit: 0,
  createdAt: new Date('2026-10-25T03:00:00Z'),
  pickupPlanAt: new Date('2026-11-14T03:00:00Z'),
  returnPlanAt: new Date('2026-11-17T03:00:00Z'),
  pickedUpAt: null,
  depositPlan: {
    v: 1,
    items: [
      { key: 'i1', label: 'Cọc giữ chỗ', type: 'PERCENT', value: 30, dueRule: { kind: 'ON_CREATE' } },
      { key: 'i2', label: 'Cọc lần 2', type: 'PERCENT', value: 40, dueRule: { kind: 'BEFORE_PICKUP', days: 1 } },
    ],
  },
  ...extra,
});

export const stagePayment = (key: string, amount: number, extra: Record<string, any> = {}) => ({
  amount,
  status: 'COMPLETED',
  notes: 'INSTALLMENT',
  installmentKey: key,
  method: 'CASH',
  processedAt: new Date('2026-10-25T03:00:00Z'),
  ...extra,
});
