/**
 * #1124 Đặt đơn online — who may see and decide booking requests. Owner default (2026-10-20): the shop owner,
 * outlet admins and outlet staff; NOT Nhân viên kho (OUTLET_INVENTORY), who only manages products. Dedicated
 * permissions `bookings.view` / `bookings.manage` instead of reusing orders.* (inventory has orders.create).
 */
import { ROLE_PERMISSIONS } from '../../packages/auth/src/permissions';

const declared: Record<string, string[]> = {};
let current = '';
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: (perms: string[]) => {
    declared[current] = perms;
    return (handler: any) => handler;
  },
}));
jest.mock('@rentalshop/database', () => ({ db: { prisma: {} } }));
jest.mock('@rentalshop/utils', () => require('../helpers/booking-fake-db').utilsMock());
jest.mock('next/server', () => require('../helpers/booking-fake-db').nextResponseMock());

describe('booking permissions by role', () => {
  it.each(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])('%s may view and decide requests', (role) => {
    expect(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]).toEqual(expect.arrayContaining(['bookings.view', 'bookings.manage']));
  });
  it.each(['OUTLET_INVENTORY', 'OPS', 'ARTICLE'])('%s may not', (role) => {
    const perms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] as string[];
    expect(perms).not.toContain('bookings.view');
    expect(perms).not.toContain('bookings.manage');
  });
});

describe('shop booking routes require the booking permissions', () => {
  it('list and detail need bookings.view; prepare and reject need bookings.manage', async () => {
    current = 'list';
    await import('../../apps/api/app/api/booking-requests/route');
    current = 'detail';
    const d = await import('../../apps/api/app/api/booking-requests/[id]/route');
    current = 'prepare';
    const p = await import('../../apps/api/app/api/booking-requests/[id]/prepare/route');
    current = 'reject';
    const r = await import('../../apps/api/app/api/booking-requests/[id]/reject/route');
    // [id] routes build their wrapper per call (params): invoke once so withPermissions runs
    for (const [name, mod] of [['detail', d], ['prepare', p], ['reject', r]] as const) {
      current = name;
      const handler: any = (mod as any).GET ?? (mod as any).POST;
      await Promise.resolve(handler({ url: 'http://x', headers: { get: () => null }, json: async () => ({}) }, { params: { id: '1' } })).catch(() => undefined);
    }
    expect(declared).toEqual({
      list: ['bookings.view'],
      detail: ['bookings.view'],
      prepare: ['bookings.manage'],
      reject: ['bookings.manage'],
    });
  });
});
