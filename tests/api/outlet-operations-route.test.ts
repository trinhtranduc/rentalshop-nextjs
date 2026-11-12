/**
 * #350 — scope and money visibility of GET /api/analytics/outlet-operations.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

let ctx: any;
const mockHasPermission = jest.fn();
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
  hasPermission: (...args: any[]) => mockHasPermission(...args),
}));

const mockDb = { outletOperations: { get: jest.fn(), merchantOutletIds: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ db: mockDb }));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    success: (code: string, data: any) => ({ success: true, code, data }),
    error: (code: string) => ({ success: false, code }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { GET } from '../../apps/api/app/api/analytics/outlet-operations/route';

function req(query = ''): any {
  return { url: `http://localhost/api/analytics/outlet-operations${query}` };
}

const emptyOps = { pickupsToday: { count: 0, orders: [] }, returnsToday: { count: 0, orders: [] }, overdueReturns: { count: 0, orders: [] }, noShows: { count: 0, orders: [] }, returnsSoon: { count: 0, orders: [] }, cash: null };

describe('GET /api/analytics/outlet-operations (#350)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.outletOperations.get.mockResolvedValue(emptyOps);
    mockDb.outletOperations.merchantOutletIds.mockResolvedValue([1, 3]);
  });

  it('outlet staff: own outlet only, no money, ignores outletIds in the query', async () => {
    ctx = { user: { id: 9, role: 'OUTLET_STAFF', outletId: 1, merchantId: 2 }, userScope: { merchantId: 2, outletId: 1 } };
    mockHasPermission.mockResolvedValue(false);
    const res: any = await GET(req('?outletIds=3'));
    expect(res.status).toBe(200);
    expect(mockDb.outletOperations.get).toHaveBeenCalledWith(expect.objectContaining({ outletIds: [1], includeCash: false }));
  });

  it('outlet admin: own outlet, with money', async () => {
    ctx = { user: { id: 8, role: 'OUTLET_ADMIN', outletId: 3, merchantId: 2 }, userScope: { merchantId: 2, outletId: 3 } };
    mockHasPermission.mockResolvedValue(true);
    await GET(req());
    expect(mockDb.outletOperations.get).toHaveBeenCalledWith(expect.objectContaining({ outletIds: [3], includeCash: true }));
  });

  it('merchant: all its outlets by default', async () => {
    ctx = { user: { id: 2, role: 'MERCHANT', merchantId: 2 }, userScope: { merchantId: 2 } };
    mockHasPermission.mockResolvedValue(true);
    await GET(req());
    expect(mockDb.outletOperations.merchantOutletIds).toHaveBeenCalledWith(2);
    expect(mockDb.outletOperations.get).toHaveBeenCalledWith(expect.objectContaining({ outletIds: [1, 3] }));
  });

  it('each row carries its outletId (#852, additive)', async () => {
    ctx = { user: { id: 2, role: 'MERCHANT', merchantId: 2 }, userScope: { merchantId: 2 } };
    mockHasPermission.mockResolvedValue(true);
    const order = {
      id: 5, orderNumber: '123456', outletId: 3, status: 'RESERVED', orderType: 'RENT',
      pickupPlanAt: null, returnPlanAt: null, totalAmount: 100, depositAmount: 0, securityDeposit: 0,
      isReadyToDeliver: true, payments: [], customer: null, orderItems: [],
    };
    mockDb.outletOperations.get.mockResolvedValue({ ...emptyOps, pickupsToday: { count: 1, orders: [order] } });
    const res: any = await GET(req());
    expect(res.body.data.pickupsToday.orders[0]).toEqual(expect.objectContaining({ id: 5, outletId: 3 }));
  });

  it('merchant: narrowed to selected outlets', async () => {
    ctx = { user: { id: 2, role: 'MERCHANT', merchantId: 2 }, userScope: { merchantId: 2 } };
    mockHasPermission.mockResolvedValue(true);
    await GET(req('?outletIds=3'));
    expect(mockDb.outletOperations.get).toHaveBeenCalledWith(expect.objectContaining({ outletIds: [3] }));
  });

  it("merchant: another merchant's outlet is rejected", async () => {
    ctx = { user: { id: 2, role: 'MERCHANT', merchantId: 2 }, userScope: { merchantId: 2 } };
    mockHasPermission.mockResolvedValue(true);
    const res: any = await GET(req('?outletIds=3,99'));
    expect(res.status).toBe(403);
    expect(mockDb.outletOperations.get).not.toHaveBeenCalled();
  });

  it('asks for returns in the 3 civil days after today', async () => {
    ctx = { user: { id: 8, role: 'OUTLET_ADMIN', outletId: 3, merchantId: 2 }, userScope: { merchantId: 2, outletId: 3 } };
    mockHasPermission.mockResolvedValue(true);
    await GET(req());
    const { end, soonEnd } = mockDb.outletOperations.get.mock.calls[0][0];
    expect(soonEnd.getTime() - end.getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it('returns the Vietnam civil day it used', async () => {
    ctx = { user: { id: 8, role: 'OUTLET_ADMIN', outletId: 3, merchantId: 2 }, userScope: { merchantId: 2, outletId: 3 } };
    mockHasPermission.mockResolvedValue(true);
    const res: any = await GET(req());
    expect(res.body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('#938: collateralHeld=1 asks for the held list and returns it as rows; without it the field is absent', async () => {
    ctx = { user: { id: 2, role: 'MERCHANT', merchantId: 2 }, userScope: { merchantId: 2 } };
    mockHasPermission.mockResolvedValue(true);
    const order = {
      id: 6, orderNumber: '654321', outletId: 1, status: 'PICKUPED', orderType: 'RENT',
      pickupPlanAt: null, returnPlanAt: null, totalAmount: 100, depositAmount: 0, securityDeposit: 2000,
      isReadyToDeliver: true, payments: [], customer: { firstName: 'Lan', lastName: '', phone: '' }, orderItems: [],
    };
    mockDb.outletOperations.get.mockResolvedValue({ ...emptyOps, collateralHeld: { count: 1, orders: [order] } });
    const res: any = await GET(req('?collateralHeld=1'));
    expect(mockDb.outletOperations.get).toHaveBeenCalledWith(expect.objectContaining({ withCollateralHeld: true }));
    expect(res.body.data.collateralHeld).toEqual({ count: 1, orders: [expect.objectContaining({ id: 6, orderNumber: '654321', securityDeposit: 2000, customerName: 'Lan' })] });

    mockDb.outletOperations.get.mockResolvedValue(emptyOps);
    const plain: any = await GET(req());
    expect(mockDb.outletOperations.get).toHaveBeenLastCalledWith(expect.objectContaining({ withCollateralHeld: false }));
    expect('collateralHeld' in plain.body.data).toBe(false);
  });
});

// #1527: the shop web shows the notes in "Đơn cần làm hôm nay"; additive, old apps ignore the keys
describe('GET /api/analytics/outlet-operations notes (#1527)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.outletOperations.merchantOutletIds.mockResolvedValue([1, 3]);
    ctx = { user: { id: 9, role: 'OUTLET_STAFF', outletId: 1, merchantId: 2 }, userScope: { merchantId: 2, outletId: 1 } };
    mockHasPermission.mockResolvedValue(false);
  });

  const row = (extra: Record<string, unknown>) => ({
    id: 5, orderNumber: '482913', outletId: 1, status: 'RESERVED', orderType: 'RENT',
    pickupPlanAt: null, returnPlanAt: null, totalAmount: 1_200_000, depositAmount: 0, securityDeposit: 0,
    isReadyToDeliver: true, payments: [], customer: { firstName: 'Thu', lastName: 'Hà', phone: '0901' },
    orderItems: [], ...extra,
  });

  it('each row has its note and each item its note, trimmed; blank is null', async () => {
    const order = row({
      notes: '  Khách lấy lúc 17h, gọi trước 30 phút. ',
      orderItems: [
        { quantity: 1, productName: 'Áo cưới đuôi cá', product: { name: 'Áo cưới' }, notes: 'ủi lại phần đuôi' },
        { quantity: 2, productName: 'Vest đen', product: null, notes: '   ' },
        { quantity: 1, productName: null, product: { name: 'Khăn voan' }, notes: null },
      ],
    });
    mockDb.outletOperations.get.mockResolvedValue({ ...emptyOps, pickupsToday: { count: 1, orders: [order] } });
    const res: any = await GET(req());
    const out = res.body.data.pickupsToday.orders[0];
    expect(out.notes).toBe('Khách lấy lúc 17h, gọi trước 30 phút.');
    expect(out.items).toEqual([
      { name: 'Áo cưới đuôi cá', quantity: 1, notes: 'ủi lại phần đuôi' },
      { name: 'Vest đen', quantity: 2, notes: null },
      { name: 'Khăn voan', quantity: 1, notes: null },
    ]);
    // the fields old apps read keep their values
    expect(out).toEqual(expect.objectContaining({ id: 5, orderNumber: '482913', customerName: 'Thu Hà', itemCount: 4, productNames: 'Áo cưới, Khăn voan' }));
  });

  it('an order without a note has notes null, in every list', async () => {
    const plain = row({ notes: null, orderItems: [{ quantity: 1, productName: 'Áo dài', product: null }] });
    mockDb.outletOperations.get.mockResolvedValue({
      ...emptyOps,
      returnsToday: { count: 1, orders: [{ ...plain, status: 'PICKUPED' }] },
      tomorrowPickups: { count: 1, orders: [{ ...plain, notes: '' }] },
    });
    const res: any = await GET(req());
    expect(res.body.data.returnsToday.orders[0].notes).toBeNull();
    expect(res.body.data.returnsToday.orders[0].items).toEqual([{ name: 'Áo dài', quantity: 1, notes: null }]);
    expect(res.body.data.tomorrowPickups.orders[0].notes).toBeNull();
  });
});
