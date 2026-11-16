/**
 * #1612 GET/POST /api/analytics/weekly-summary: AI summary of last week (Monday..Sunday, Vietnam days by default).
 * MERCHANT → whole shop (`m:<merchantId>`), OUTLET_ADMIN → own branch (`o:<outletId>`), other roles 403.
 * GET never calls AI. POST writes once per scope and week; no activity → NO_ORDERS without AI; AI failure → 502,
 * nothing stored; no ANTHROPIC_API_KEY → 503.
 */
jest.mock('next/server', () => {
  const json = (body: any, init?: any) => ({ body, status: init?.status || 200 });
  function NextResponse(this: any, body: any, init?: any) {
    return { body, status: init?.status || 200 };
  }
  (NextResponse as any).json = json;
  return { NextRequest: jest.fn(), NextResponse };
});

let ctx: any;
jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) => handler(request, ctx),
}));

const mockPrisma: any = {
  aiWeeklySummary: { findUnique: jest.fn(), create: jest.fn() },
  outlet: { findUnique: jest.fn(), findMany: jest.fn() },
  merchant: { findUnique: jest.fn() },
};
const mockDb: any = {
  merchants: { findById: jest.fn() },
  outlets: { findById: jest.fn() },
};
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: mockPrisma }));

jest.mock('@rentalshop/utils', () => {
  const dateRange = jest.requireActual('../../packages/utils/src/core/date-range');
  const date = jest.requireActual('../../packages/utils/src/core/date');
  return {
    ...date,
    ...dateRange,
    ResponseBuilder: {
      success: (code: string, data: any) => ({ success: true, code, data }),
      error: (code: string) => ({ success: false, code }),
    },
    handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  };
});

jest.mock('@rentalshop/utils/server', () => {
  const report = jest.requireActual('../../packages/utils/src/analytics/period-report');
  return { resolveAnalyticsOutletFilter: report.resolveAnalyticsOutletFilter, percentChange: report.percentChange };
});

const mockNumbers = jest.fn();
jest.mock('../../apps/api/lib/weekly-summary/numbers', () => {
  const actual = jest.requireActual('../../apps/api/lib/weekly-summary/numbers');
  return { ...actual, computeWeeklyNumbers: (...args: any[]) => mockNumbers(...args) };
});

const mockWriter = jest.fn();
jest.mock('../../apps/api/lib/weekly-summary/claude', () => {
  const actual = jest.requireActual('../../apps/api/lib/weekly-summary/claude');
  return { ...actual, writeSummaryWithClaude: (...args: any[]) => mockWriter(...args) };
});

import { GET, POST } from '../../apps/api/app/api/analytics/weekly-summary/route';
import { AiSummaryError } from '../../apps/api/lib/weekly-summary/claude';

const merchant = { user: { id: 2, role: 'MERCHANT' }, userScope: { merchantId: 2 } };
const outletAdmin = { user: { id: 8, role: 'OUTLET_ADMIN' }, userScope: { merchantId: 2, outletId: 4 } };
const staff = { user: { id: 9, role: 'OUTLET_STAFF' }, userScope: { merchantId: 2, outletId: 4 } };

const req = (lang = 'vi', query = ''): any => ({
  url: `http://localhost/api/analytics/weekly-summary${query}`,
  headers: { get: (name: string) => (name.toLowerCase() === 'accept-language' ? lang : null) },
});

const week = { start: '2026-11-09', end: '2026-11-15' };
const change = (current: number, previous: number) => ({ current, previous, growth: 0 });
const numbers = (newOrders: number) => ({
  week,
  previousWeek: { start: '2026-11-02', end: '2026-11-08' },
  revenue: { orderValue: change(18450000, 16470000), collected: change(15200000, 14000000), outstanding: 3250000, fees: 600000 },
  branches: [],
  orders: { new: change(newOrders, 37), rent: newOrders, sale: 0, cancelled: 0, byDay: [] },
  rentals: { pickedUp: newOrders ? 36 : 0, returned: newOrders ? 31 : 0, late: change(4, 1), notPickedUp: 2 },
  products: { hot: [{ productId: 7, name: 'Áo dài cưới đỏ', rentals: 9, sales: 0, revenue: 3600000 }], notRented: 12 },
  customers: { total: 30, new: 18, returning: 12, returningShare: 55 },
});
const content = {
  summary: 'Tuần đông hơn tuần trước.',
  actions: ['A', 'B', 'C'],
  revenueNote: 'r',
  ordersNote: 'o',
  productsNote: 'p',
};
const storedRow = (status = 'READY') => ({
  status,
  createdAt: new Date('2026-11-16T01:12:00Z'),
  language: 'vi',
  numbers: numbers(42),
  content: status === 'READY' ? content : null,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-11-16T03:00:00Z')); // Monday 10:00 in Vietnam
  process.env.ANTHROPIC_API_KEY = 'test-key';
  mockPrisma.aiWeeklySummary.findUnique.mockResolvedValue(null);
  mockPrisma.aiWeeklySummary.create.mockImplementation(({ data }: any) => Promise.resolve({ ...data, createdAt: new Date('2026-11-16T03:00:01Z') }));
  mockPrisma.outlet.findUnique.mockResolvedValue({ name: 'Lê Lợi' });
  mockPrisma.outlet.findMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);
  mockPrisma.merchant.findUnique.mockResolvedValue({ businessType: 'CLOTHING', country: 'VN', city: 'HCM', currency: 'VND' });
  mockDb.merchants.findById.mockResolvedValue({ id: 2, outlets: [{ id: 3 }, { id: 4 }] });
  mockDb.outlets.findById.mockResolvedValue({ id: 4 });
  mockNumbers.mockResolvedValue(numbers(42));
  mockWriter.mockResolvedValue({ content, model: 'claude-haiku-5-5', inputTokens: 3000, outputTokens: 900 });
});

afterEach(() => {
  jest.useRealTimers();
  delete process.env.ANTHROPIC_API_KEY;
});

describe('GET /api/analytics/weekly-summary', () => {
  it('owner, nothing written yet: last full week, status NONE, no AI call', async () => {
    ctx = merchant;
    const res: any = await GET(req());
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ available: true, week, nextWeekStart: '2026-11-23', status: 'NONE', branchName: null, summary: null });
    expect(mockPrisma.aiWeeklySummary.findUnique).toHaveBeenCalledWith({
      where: { scopeKey_weekStart: { scopeKey: 'm:2', weekStart: '2026-11-09' } },
    });
    expect(mockWriter).not.toHaveBeenCalled();
  });

  it('available false without ANTHROPIC_API_KEY', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    ctx = merchant;
    const res: any = await GET(req());
    expect(res.body.data.available).toBe(false);
  });

  it('branch manager reads the row of the branch, with its name', async () => {
    ctx = outletAdmin;
    mockPrisma.aiWeeklySummary.findUnique.mockResolvedValue(storedRow());
    const res: any = await GET(req());
    expect(mockPrisma.aiWeeklySummary.findUnique).toHaveBeenCalledWith({
      where: { scopeKey_weekStart: { scopeKey: 'o:4', weekStart: '2026-11-09' } },
    });
    expect(res.body.data).toMatchObject({ status: 'READY', branchName: 'Lê Lợi' });
    expect(res.body.data.summary.content).toEqual(content);
  });

  it('staff and warehouse get 403', async () => {
    ctx = staff;
    const res: any = await GET(req());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('invalid timeZone → 400', async () => {
    ctx = merchant;
    const res: any = await GET(req('vi', '?timeZone=Mars/Base'));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/analytics/weekly-summary', () => {
  it('writes once: AI in the language of Accept-Language, stored as READY for the shop', async () => {
    ctx = merchant;
    const res: any = await POST(req('en-US'));
    expect(res.status).toBe(200);
    expect(mockWriter).toHaveBeenCalledTimes(1);
    const { system, user } = mockWriter.mock.calls[0][0];
    expect(system).toContain('Write in English');
    expect(user).toContain('Áo dài cưới đỏ');
    expect(user).toContain('whole shop');
    expect(user).not.toContain('productId');
    const data = mockPrisma.aiWeeklySummary.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ merchantId: 2, outletId: null, scopeKey: 'm:2', weekStart: '2026-11-09', status: 'READY', language: 'en', model: 'claude-haiku-5-5' });
    expect(res.body.data).toMatchObject({ status: 'READY', summary: { content } });
    // owner with two open branches: the figures list them
    expect(mockNumbers.mock.calls[0][2]).toMatchObject({ branchOutletIds: [3, 4], productScope: { merchantId: 2 }, outletFilter: { outletId: { in: [3, 4] } } });
  });

  it('one open branch: no branch list', async () => {
    ctx = merchant;
    mockPrisma.outlet.findMany.mockResolvedValue([{ id: 3 }]);
    await POST(req());
    expect(mockNumbers.mock.calls[0][2].branchOutletIds).toBeNull();
  });

  it('branch manager: own branch only, the prompt names the branch', async () => {
    ctx = outletAdmin;
    await POST(req('vi'));
    expect(mockNumbers.mock.calls[0][2]).toMatchObject({ branchOutletIds: null, productScope: { outletId: 4 }, outletFilter: { outletId: 4 } });
    expect(mockWriter.mock.calls[0][0].system).toContain('Write in Vietnamese');
    expect(mockWriter.mock.calls[0][0].user).toContain('one branch: Lê Lợi');
    expect(mockPrisma.aiWeeklySummary.create.mock.calls[0][0].data).toMatchObject({ scopeKey: 'o:4', outletId: 4 });
  });

  it('already written this week: returns it, no AI call', async () => {
    ctx = merchant;
    mockPrisma.aiWeeklySummary.findUnique.mockResolvedValue(storedRow());
    const res: any = await POST(req());
    expect(res.body.data.status).toBe('READY');
    expect(mockWriter).not.toHaveBeenCalled();
    expect(mockPrisma.aiWeeklySummary.create).not.toHaveBeenCalled();
  });

  it('a week with no orders: NO_ORDERS stored, no AI call', async () => {
    ctx = merchant;
    mockNumbers.mockResolvedValue(numbers(0));
    const res: any = await POST(req());
    expect(mockWriter).not.toHaveBeenCalled();
    expect(mockPrisma.aiWeeklySummary.create.mock.calls[0][0].data).toMatchObject({ status: 'NO_ORDERS' });
    expect(res.body.data.status).toBe('NO_ORDERS');
  });

  it('AI fails: 502 AI_SUMMARY_FAILED and nothing stored', async () => {
    ctx = merchant;
    mockWriter.mockRejectedValue(new AiSummaryError('refusal'));
    const res: any = await POST(req());
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('AI_SUMMARY_FAILED');
    expect(mockPrisma.aiWeeklySummary.create).not.toHaveBeenCalled();
  });

  it('two requests at the same time (double tap, StrictMode): one AI call, both get the summary', async () => {
    ctx = merchant;
    let release: () => void = () => {};
    const started = new Promise<void>((ready) => {
      mockWriter.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ content, model: 'claude-haiku-5-5', inputTokens: 1, outputTokens: 1 });
            ready();
          })
      );
    });
    const first = POST(req());
    const second = POST(req());
    await started;
    release();
    const [a, b]: any[] = await Promise.all([first, second]);
    expect(mockWriter).toHaveBeenCalledTimes(1);
    expect(mockPrisma.aiWeeklySummary.create).toHaveBeenCalledTimes(1);
    expect(a.body.data.status).toBe('READY');
    expect(b.body.data.status).toBe('READY');
  });

  it('no ANTHROPIC_API_KEY: 503 AI_SUMMARY_UNAVAILABLE', async () => {
    ctx = merchant;
    delete process.env.ANTHROPIC_API_KEY;
    const res: any = await POST(req());
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_SUMMARY_UNAVAILABLE');
    expect(mockWriter).not.toHaveBeenCalled();
  });

  it('two taps at once: the second insert hits the unique key and returns the stored row', async () => {
    ctx = merchant;
    mockPrisma.aiWeeklySummary.findUnique
      .mockResolvedValueOnce(null) // route read
      .mockResolvedValueOnce(null) // service check
      .mockResolvedValueOnce(storedRow()); // after P2002
    mockPrisma.aiWeeklySummary.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const res: any = await POST(req());
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('READY');
  });

  it('staff get 403 and no AI call', async () => {
    ctx = staff;
    const res: any = await POST(req());
    expect(res.status).toBe(403);
    expect(mockWriter).not.toHaveBeenCalled();
  });
});
