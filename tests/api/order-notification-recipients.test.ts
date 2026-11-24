/**
 * #1639 (owner, 2026-11-24): a shop owner sees the order notifications of every branch; an outlet admin or staff sees
 * only their own outlet's. Example: merchant A has branches a1 and a2.
 *
 * Shop M: branches A, B, C. Owner O (MERCHANT, outletId = A, the branch made at sign-up). Staff SA (A), SB (B),
 * outlet admin AB (OUTLET_ADMIN, B). C has nobody. Other shop M2: branch X, owner O2, staff SX.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh (the rule has no dates, the answers must not change).
 */
type User = { id: number; role: string; merchantId: number; outletId: number | null; isActive: boolean; deletedAt: Date | null };
type Outlet = { id: number; name: string; merchantId: number; isActive: boolean };

const users: User[] = [];
const outlets: Outlet[] = [];

const mockPrisma: any = {
  outlet: {
    findUnique: jest.fn(async ({ where }: any) => outlets.find((o) => o.id === where.id) ?? null),
    count: jest.fn(async ({ where }: any) => outlets.filter((o) => o.merchantId === where.merchantId && o.isActive === where.isActive).length),
  },
  user: {
    findMany: jest.fn(async ({ where }: any) =>
      users
        .filter((u) => (where.outletId === undefined || u.outletId === where.outletId))
        .filter((u) => (where.merchantId === undefined || u.merchantId === where.merchantId))
        .filter((u) => (where.role === undefined || u.role === where.role))
        .filter((u) => u.isActive === where.isActive && u.deletedAt === where.deletedAt)
        .map((u) => ({ id: u.id }))
    ),
  },
};
jest.mock('../../packages/database/src/client', () => ({ prisma: mockPrisma }));

import { findOrderNotificationRecipients } from '../../packages/database/src/notifications';

const ids = async (outletId: number) => (await findOrderNotificationRecipients(outletId)).userIds.sort((a, b) => a - b);

// user ids: O=1 SA=2 SB=3 AB=4 O2=5 SX=6
const A = 10, B = 11, C = 12, X = 20;

beforeEach(() => {
  users.length = 0;
  outlets.length = 0;
  outlets.push(
    { id: A, name: 'Chi nhánh A', merchantId: 1, isActive: true },
    { id: B, name: 'Chi nhánh B', merchantId: 1, isActive: true },
    { id: C, name: 'Chi nhánh C', merchantId: 1, isActive: true },
    { id: X, name: 'Chi nhánh X', merchantId: 2, isActive: true }
  );
  const u = (id: number, role: string, merchantId: number, outletId: number | null): User => ({ id, role, merchantId, outletId, isActive: true, deletedAt: null });
  users.push(u(1, 'MERCHANT', 1, A), u(2, 'OUTLET_STAFF', 1, A), u(3, 'OUTLET_STAFF', 1, B), u(4, 'OUTLET_ADMIN', 1, B), u(5, 'MERCHANT', 2, X), u(6, 'OUTLET_STAFF', 2, X));
});

describe('order notification recipients (#1639)', () => {
  it('1. order in A: its staff and the owner, the owner once', async () => {
    expect(await ids(A)).toEqual([1, 2]);
  });

  it('2. order in B: its staff and admin, and the owner (whose own outlet is A)', async () => {
    expect(await ids(B)).toEqual([1, 3, 4]);
  });

  it('3. order in C, a branch nobody works in: the owner only (nobody before)', async () => {
    expect(await ids(C)).toEqual([1]);
  });

  it('4. the owner acting in B is still a recipient, like staff are for their own actions', async () => {
    expect(await ids(B)).toContain(1);
  });

  it('5. a one-branch shop: each person once, and the text names no branch', async () => {
    outlets.splice(0, outlets.length, { id: X, name: 'Chi nhánh X', merchantId: 2, isActive: true });
    const r = await findOrderNotificationRecipients(X);
    expect(r.userIds.sort()).toEqual([5, 6]);
    expect(r.shopHasManyOutlets).toBe(false);
  });

  it('6. an owner who is blocked or deleted gets nothing', async () => {
    users[0].isActive = false;
    expect(await ids(B)).toEqual([3, 4]);
    users[0].isActive = true;
    users[0].deletedAt = new Date('2026-11-01T00:00:00Z');
    expect(await ids(C)).toEqual([]);
  });

  it('7. another shop never mixes in: its owner is not told about shop M, nor M\'s owner about it', async () => {
    expect(await ids(X)).toEqual([5, 6]);
    expect(await ids(B)).not.toContain(5);
  });

  it('two owners in one shop both get it', async () => {
    users.push({ id: 7, role: 'MERCHANT', merchantId: 1, outletId: null, isActive: true, deletedAt: null });
    expect(await ids(C)).toEqual([1, 7]);
  });

  it('names the branch only when the shop has two or more active branches', async () => {
    const many = await findOrderNotificationRecipients(B);
    expect(many).toMatchObject({ outletName: 'Chi nhánh B', shopHasManyOutlets: true });
    outlets[1].isActive = false;
    outlets[2].isActive = false;
    expect((await findOrderNotificationRecipients(A)).shopHasManyOutlets).toBe(false);
  });

  it('an unknown outlet returns the outlet\'s users only and no owners', async () => {
    expect(await findOrderNotificationRecipients(999)).toMatchObject({ userIds: [], outletName: null, shopHasManyOutlets: false });
  });
});

describe('sendOrderPushToOutlet (#1639)', () => {
  // The push file pulls in firebase-admin and the shared packages; load it with those faked. No Firebase app, so only the
  // inbox path runs: it must write one row per recipient with the branch named for a multi-branch shop.
  const mockCreate = jest.fn(async (userIds: number[]) => userIds.length);
  const mockRecipients = jest.fn();
  jest.mock('@rentalshop/database', () => ({
    createNotificationsForUsers: (...a: any[]) => (mockCreate as any)(...a),
    findOrderNotificationRecipients: (...a: any[]) => mockRecipients(...a),
    findActivePushTokensForUsers: jest.fn(async () => []),
    findActiveUserIdsForOutlet: jest.fn(async () => []),
    deactivateTokensByPushToken: jest.fn(),
    db: {},
  }), { virtual: true });
  jest.mock('@rentalshop/utils', () => ({ formatFullName: () => '' }), { virtual: true });
  jest.mock('@rentalshop/constants', () => ({ ORDER_STATUS_LABELS: {}, ORDER_TYPE_LABELS: {} }), { virtual: true });
  jest.mock('firebase-admin/app', () => ({ cert: jest.fn(), getApps: () => [], initializeApp: jest.fn() }), { virtual: true });
  jest.mock('firebase-admin/messaging', () => ({ getMessaging: jest.fn() }), { virtual: true });

  const payload = { type: 'ORDER_CREATED' as const, orderId: '5', orderNumber: '123456', status: 'RESERVED', outletId: '11', actorName: 'Lan' };
  const send = () => require('../../apps/api/lib/push-notifications').sendOrderPushToOutlet(11, payload);

  beforeEach(() => {
    mockCreate.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('writes one inbox row for each recipient, owner included, and names the branch', async () => {
    mockRecipients.mockResolvedValue({ userIds: [1, 3, 4], outletName: 'Chi nhánh B', shopHasManyOutlets: true });
    const result = await send();
    expect(result.inbox).toBe(3);
    const [userIds, row] = mockCreate.mock.calls[0] as any[];
    expect(userIds).toEqual([1, 3, 4]);
    expect(row.type).toBe('ORDER_CREATED');
    expect(row.body.endsWith(' · Chi nhánh B')).toBe(true);
    expect(row.data).toMatchObject({ orderId: '5', outletId: '11', type: 'ORDER_CREATED' });
  });

  it('keeps the text as before for a one-branch shop', async () => {
    mockRecipients.mockResolvedValue({ userIds: [5, 6], outletName: 'Chi nhánh X', shopHasManyOutlets: false });
    await send();
    expect((mockCreate.mock.calls[0] as any[])[1].body).not.toContain('Chi nhánh X');
  });

  it('a failure choosing recipients does not throw', async () => {
    mockRecipients.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(send()).resolves.toMatchObject({ sent: 0, failed: 0 });
  });
});

describe('withOutletName (#1639)', () => {
  it('adds the branch for a multi-branch shop only', () => {
    const { withOutletName } = require('../../apps/api/lib/push-notifications');
    expect(withOutletName('Lan vừa tạo đơn #123', 'Chi nhánh B', true)).toBe('Lan vừa tạo đơn #123 · Chi nhánh B');
    expect(withOutletName('Lan vừa tạo đơn #123', 'Chi nhánh B', false)).toBe('Lan vừa tạo đơn #123');
    expect(withOutletName('Lan vừa tạo đơn #123', null, true)).toBe('Lan vừa tạo đơn #123');
  });
});
