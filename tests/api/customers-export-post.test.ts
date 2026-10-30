/**
 * #1361 exporting many selected customers fails with ERR_FAILED: the web put every `customerIds=<id>` in the URL of
 * `GET /api/customers/export` (3,000 customers = ~60 KB), so the proxy cut the request. `POST /api/customers/export`
 * takes the ids in a JSON body and returns the same file. `GET` stays as it is for the installed apps and old tabs.
 *
 * The real auth wrapper (`withCustomerExportAuth`, `customers.export`) and the real Excel builder run; only the
 * token check, the database and `next/server` are replaced.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: Object.assign(
    function NextResponse(this: any, body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers || {};
    },
    { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) }
  ),
}));

const mockSearch = jest.fn();
const mockDb: any = { customers: { search: (...a: any[]) => mockSearch(...a) }, users: { findById: jest.fn() } };
jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {} }));

jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/date'),
  ...jest.requireActual('../../packages/utils/src/core/date-range'),
  ...jest.requireActual('../../packages/utils/src/core/excel'),
  handleApiError: (e: any) => ({ response: { success: false, message: String(e?.stack || e) }, statusCode: 500 }),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
}));

const mockAuthenticate = jest.fn();
jest.mock('../../packages/auth/src/core', () => ({
  ...jest.requireActual('../../packages/auth/src/core'),
  authenticateRequest: (...a: any[]) => mockAuthenticate(...a),
}));
jest.mock('@rentalshop/auth/server', () => ({
  withCustomerExportAuth: jest.requireActual('../../packages/auth/src/middleware').withCustomerExportAuth,
}));

import * as XLSX from 'xlsx';
import { GET, POST } from '../../apps/api/app/api/customers/export/route';

const NOW = new Date('2026-10-20T03:00:00Z'); // inside the last month for the period export

/** merchant 2 owns ids 1..3000 (outlet 1: 1..2000, outlet 2: 2001..3000); merchant 3 owns 5001..5010 */
const ALL = [
  ...Array.from({ length: 3000 }, (_, i) => ({ id: i + 1, merchantId: 2, outletId: i < 2000 ? 1 : 2 })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: 5001 + i, merchantId: 3, outletId: 9 })),
].map((c) => ({
  ...c,
  firstName: `Khach${c.id}`,
  lastName: 'Ho',
  email: `k${c.id}@x.vn`,
  phone: `09${String(c.id).padStart(8, '0')}`,
  address: 'Thu Dau Mot',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
  merchant: { id: c.merchantId, name: `Shop ${c.merchantId}` },
}));

function caller(role: string, extra: { merchantId?: number | null; outletId?: number | null; permissions?: string[] } = {}) {
  const merchantId = extra.merchantId === undefined ? 2 : extra.merchantId;
  const outletId = extra.outletId === undefined ? null : extra.outletId;
  mockAuthenticate.mockResolvedValue({
    success: true,
    user: { id: 10, role, email: 'u@x', merchantId, outletId, permissions: extra.permissions },
  });
}

const get = (qs: string): any => ({ url: `http://localhost/api/customers/export?${qs}`, method: 'GET', headers: { get: () => null } });
const post = (body: any): any => ({
  url: 'http://localhost/api/customers/export',
  method: 'POST',
  headers: { get: () => null },
  json: async () => (body instanceof Error ? Promise.reject(body) : body),
});

const rowsOf = (res: any): any[][] => {
  const wb = XLSX.read(Buffer.from(res.body), { type: 'buffer' });
  return XLSX.utils.sheet_to_json<any[]>(wb.Sheets['Customers'], { header: 1, defval: '' }).slice(1);
};
const header = (res: any): any[] => {
  const wb = XLSX.read(Buffer.from(res.body), { type: 'buffer' });
  return XLSX.utils.sheet_to_json<any[]>(wb.Sheets['Customers'], { header: 1, defval: '' })[0];
};

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout'], now: new Date('2026-10-25T03:00:00Z') });
  mockAuthenticate.mockReset();
  mockSearch.mockReset();
  mockSearch.mockImplementation(async (f: any) => {
    const data = ALL.filter((c) => (f.merchantId == null || c.merchantId === f.merchantId) && (f.outletId == null || c.outletId === f.outletId)).slice(0, f.limit);
    return { data, total: data.length };
  });
  caller('MERCHANT');
});
afterEach(() => jest.useRealTimers());

describe('POST /api/customers/export (#1361)', () => {
  it('returns the Excel file for 3,000 selected customers', async () => {
    const ids = Array.from({ length: 3000 }, (_, i) => i + 1);
    const res: any = await POST(post({ customerIds: ids, format: 'excel' }));
    expect(res.status).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['Content-Disposition']).toMatch(/^attachment; filename="customers-export-.*\.xlsx"$/);
    expect(rowsOf(res)).toHaveLength(3000);
  });

  it('gives the same file content as GET for the same input (ids, CSV, header, merchant column)', async () => {
    const ids = [3, 1, 2, 4, 2999];
    const viaGet: any = await GET(get(`format=excel&${ids.map((i) => `customerIds=${i}`).join('&')}`));
    const viaPost: any = await POST(post({ customerIds: ids, format: 'excel' }));
    expect(viaPost.status).toBe(viaGet.status);
    expect(header(viaPost)).toEqual(header(viaGet));
    expect(rowsOf(viaPost)).toEqual(rowsOf(viaGet));
    expect(viaPost.headers).toEqual(viaGet.headers);

    const csvGet: any = await GET(get(`format=csv&${ids.map((i) => `customerIds=${i}`).join('&')}`));
    const csvPost: any = await POST(post({ customerIds: ids, format: 'csv' }));
    expect(csvPost.headers['Content-Type']).toBe('text/csv');
    expect(csvPost.body).toBe(csvGet.body);
  });

  it('with a selection the period is ignored, as GET does (old customers are still exported)', async () => {
    mockSearch.mockImplementation(async () => ({ data: [{ ...ALL[0], createdAt: new Date('2020-01-01T00:00:00Z') }], total: 1 }));
    const res: any = await POST(post({ customerIds: [1], period: '1month' }));
    expect(rowsOf(res)).toHaveLength(1);
  });

  it('loads customers with the same filters as GET (limit 10000, firstName asc, merchant scope)', async () => {
    await GET(get('customerIds=1'));
    await POST(post({ customerIds: [1] }));
    expect(mockSearch).toHaveBeenCalledTimes(2);
    expect(mockSearch.mock.calls[1][0]).toEqual(mockSearch.mock.calls[0][0]);
    expect(mockSearch.mock.calls[1][0]).toEqual({ limit: 10000, offset: 0, sortBy: 'firstName', sortOrder: 'asc', merchantId: 2 });
  });

  it('exports by period when no ids are sent (same as GET)', async () => {
    const viaGet: any = await GET(get('period=1month'));
    const viaPost: any = await POST(post({ period: '1month' }));
    expect(viaPost.status).toBe(200);
    expect(rowsOf(viaPost)).toHaveLength(rowsOf(viaGet).length);
    expect(rowsOf(viaPost).length).toBe(3000);
  });

  describe('permissions', () => {
    it('OUTLET_STAFF: 403', async () => {
      caller('OUTLET_STAFF', { outletId: 1 });
      const res: any = await POST(post({ customerIds: [1] }));
      expect(res.status).toBe(403);
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('OUTLET_INVENTORY (no customers.export): 403', async () => {
      caller('OUTLET_INVENTORY', { outletId: 1 });
      const res: any = await POST(post({ customerIds: [1] }));
      expect(res.status).toBe(403);
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('not signed in: 401', async () => {
      mockAuthenticate.mockResolvedValue({
        success: false,
        response: { body: { success: false, code: 'ACCESS_TOKEN_REQUIRED' }, status: 401 },
      });
      const res: any = await POST(post({ customerIds: [1] }));
      expect(res.status).toBe(401);
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('OUTLET_ADMIN, MERCHANT, ADMIN may export', async () => {
      for (const [role, extra] of [
        ['OUTLET_ADMIN', { outletId: 1 }],
        ['MERCHANT', {}],
        ['ADMIN', { merchantId: null }],
      ] as const) {
        caller(role, extra);
        const res: any = await POST(post({ customerIds: [1] }));
        expect(res.status).toBe(200);
      }
    });
  });

  describe('scope', () => {
    it('ids of another shop are skipped; the caller never gets them', async () => {
      const res: any = await POST(post({ customerIds: [1, 2, 5001, 5002, 99999] }));
      expect(res.status).toBe(200);
      const emails = rowsOf(res).map((r) => r[2]);
      expect(emails.sort()).toEqual(['k1@x.vn', 'k2@x.vn']);
    });

    it('a shop owner cannot widen the scope with merchantId in the body', async () => {
      const res: any = await POST(post({ customerIds: [1, 5001], merchantId: 3 }));
      expect(rowsOf(res).map((r) => r[2])).toEqual(['k1@x.vn']);
      expect(mockSearch.mock.calls[0][0].merchantId).toBe(2);
    });

    it('OUTLET_ADMIN only gets customers of its own outlet', async () => {
      caller('OUTLET_ADMIN', { outletId: 2 });
      const res: any = await POST(post({ customerIds: [1, 1999, 2001, 2002, 5001] }));
      expect(rowsOf(res).map((r) => r[2]).sort()).toEqual(['k2001@x.vn', 'k2002@x.vn']);
      expect(mockSearch.mock.calls[0][0]).toEqual(expect.objectContaining({ merchantId: 2, outletId: 2 }));
    });

    it('ADMIN may pass merchantId in the body (merchant column shown)', async () => {
      caller('ADMIN', { merchantId: null });
      const res: any = await POST(post({ customerIds: [1, 5001], merchantId: 3 }));
      expect(mockSearch.mock.calls[0][0].merchantId).toBe(3);
      expect(header(res)[0]).toBe('Merchant');
      const email = header(res).indexOf('Email'); // the Merchant column shifts the others by one
      expect(rowsOf(res).map((r) => r[email])).toEqual(['k5001@x.vn']);
    });
  });

  describe('input', () => {
    it('more than 5,000 ids: 400 INVALID_INPUT', async () => {
      const ids = Array.from({ length: 5001 }, (_, i) => i + 1);
      const res: any = await POST(post({ customerIds: ids }));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_INPUT');
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('5,000 ids is accepted', async () => {
      const ids = Array.from({ length: 5000 }, (_, i) => i + 1);
      const res: any = await POST(post({ customerIds: ids }));
      expect(res.status).toBe(200);
    });

    it('no ids and no period: 400 INVALID_INPUT', async () => {
      for (const body of [{}, { customerIds: [] }, { format: 'excel' }]) {
        const res: any = await POST(post(body));
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_INPUT');
      }
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('wrong body: 400 INVALID_INPUT', async () => {
      const bodies: any[] = [
        { customerIds: 'abc' },
        { customerIds: ['x'] },
        { customerIds: [1.5] },
        { customerIds: [0] },
        { customerIds: [-3] },
        { customerIds: [1], format: 'pdf' },
        { customerIds: [1], period: '2weeks' },
        { customerIds: [1], merchantId: 'x' },
        null,
        [1, 2],
      ];
      for (const body of bodies) {
        const res: any = await POST(post(body));
        expect([JSON.stringify(body), res.status]).toEqual([JSON.stringify(body), 400]);
        expect(res.body.code).toBe('INVALID_INPUT');
      }
    });

    it('a body that is not JSON: 400 INVALID_INPUT', async () => {
      const res: any = await POST(post(new SyntaxError('Unexpected token')));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_INPUT');
    });

    it('custom period needs both dates (same message as GET)', async () => {
      const viaGet: any = await GET(get('period=custom&startDate=2026-10-01'));
      const viaPost: any = await POST(post({ customerIds: [1], period: 'custom', startDate: '2026-10-01' }));
      expect(viaGet.status).toBe(400);
      expect(viaPost.status).toBe(400);
      expect(viaPost.body).toEqual(viaGet.body);
    });
  });
});

describe('GET /api/customers/export stays as it was (installed apps, old tabs)', () => {
  it('selection by repeated customerIds, scoped to the shop, period ignored', async () => {
    const res: any = await GET(get('period=1month&format=excel&customerIds=1&customerIds=2&customerIds=5001'));
    expect(res.status).toBe(200);
    expect(rowsOf(res).map((r) => r[2]).sort()).toEqual(['k1@x.vn', 'k2@x.vn']);
  });

  it('period only (iOS / Android): the customers added in the period', async () => {
    mockSearch.mockImplementation(async () => ({
      data: [
        { ...ALL[0], createdAt: new Date('2026-10-10T03:00:00Z') },
        { ...ALL[1], createdAt: new Date('2025-01-10T03:00:00Z') },
      ],
      total: 2,
    }));
    const res: any = await GET(get('period=1month&format=excel'));
    expect(rowsOf(res).map((r) => r[2])).toEqual(['k1@x.vn']);
  });

  it('no query at all defaults to the last month, Excel', async () => {
    const res: any = await GET(get(''));
    expect(res.status).toBe(200);
    expect(res.headers['Content-Type']).toContain('spreadsheetml');
  });

  it('OUTLET_STAFF: 403; bad custom range: 400 INVALID_INPUT', async () => {
    caller('OUTLET_STAFF', { outletId: 1 });
    expect(((await GET(get('period=1month'))) as any).status).toBe(403);
    caller('MERCHANT');
    const bad: any = await GET(get('period=custom&startDate=2026-10-01'));
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_INPUT');
  });
});
