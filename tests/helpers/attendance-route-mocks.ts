/**
 * #907 shared mocks for the attendance route tests (tests/api/attendance-*.test.ts).
 * Each test file wires them with jest.mock(..., () => require('../helpers/attendance-route-mocks').<x>).
 */
export const mockState: { ctx: any } = { ctx: null };

const fn = () => jest.fn();

export const mockDb: any = {
  merchantModules: {
    isActive: fn(),
    getActiveKeys: fn(),
    listForMerchant: fn(),
    upsert: fn(),
  },
  attendance: {
    getOutlet: fn(),
    listOutlets: fn(),
    getSetting: fn(),
    listSettings: fn(),
    upsertSetting: fn(),
    bumpQrVersion: fn(),
    setKioskToken: fn(),
    findSettingByKioskToken: fn(),
    createScan: fn(),
    recentPunches: fn(),
    autoCloseOverdue: fn(),
    findOpenRecord: fn(),
    punch: fn(),
    lastRecord: fn(),
    getScheduleData: fn(),
    listOutletUsers: fn(),
    findUsersByIds: fn(),
    listOutletScans: fn(),
    getUserInMerchant: fn(),
    workedDays: fn(),
    listTemplates: fn(),
    getTemplate: fn(),
    createTemplate: fn(),
    updateTemplate: fn(),
    deleteTemplate: fn(),
    isTemplateUsed: fn(),
    listRules: fn(),
    getRule: fn(),
    createRules: fn(),
    updateRule: fn(),
    deleteRule: fn(),
    replaceRule: fn(),
    upsertDayChange: fn(),
    deleteDayChange: fn(),
    listRecords: fn(),
    getRecord: fn(),
    updateRecordWithEdit: fn(),
    createRecordWithEdit: fn(),
    listScans: fn(),
    listEdits: fn(),
    isMonthLocked: fn(),
    lockMonth: fn(),
    unlockMonth: fn(),
  },
  auditLogs: { create: fn() },
  users: { findById: fn() },
  merchants: { findById: fn(), ensureTenantKey: jest.fn(async () => 'shop') },
  outlets: { findById: fn() },
  sessions: { createUserSession: jest.fn(async () => ({ sessionId: 's1' })) },
  refreshTokens: { create: fn() },
};

export const databaseModule = {
  db: mockDb,
  prisma: {},
  getDefaultBankAccount: async () => null,
};

export const nextServerModule = {
  NextRequest: jest.fn(),
  NextResponse: Object.assign(
    function NextResponse(this: any, body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers || {};
    },
    { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) }
  ),
};

/** Same contract as the real wrapper: role list → 403 INSUFFICIENT_PERMISSIONS, then the handler. */
const wrap = (roles?: string[]) => (handler: any) => (request: any) => {
  const ctx = mockState.ctx;
  if (roles && roles.length > 0 && !roles.includes(ctx.user.role)) {
    return { body: { success: false, code: 'INSUFFICIENT_PERMISSIONS' }, status: 403 };
  }
  return handler(request, ctx);
};

export const authServerModule = {
  withAuthRoles: (roles?: string[]) => wrap(roles),
  withAnyAuth: wrap(),
  withReadOnlyAuth: wrap(),
  generateToken: jest.fn(() => 'web-token'),
  generateMobileToken: jest.fn(() => 'mobile-token'),
  generateRefreshableToken: jest.fn(() => 'refreshable'),
  getUserPermissions: jest.fn(async () => ['orders.view']),
};

export const utilsModule = () => ({
  ...jest.requireActual('../../packages/utils/src/core/date'),
  ...jest.requireActual('../../packages/utils/src/core/date-range'),
  formatFullName: (a?: string | null, b?: string | null) => [a, b].filter(Boolean).join(' '),
  handleApiError: (e: any) => ({ response: { success: false, message: String(e?.stack || e) }, statusCode: 500 }),
  createExcelWorkbook: jest.fn(() => Buffer.from('x')),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code, message: code, error: code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
});

/** Caller as the route sees it. merchantId 2, outlet 1 unless given. */
export function setCaller(role: string, extra: { id?: number; outletId?: number | null; merchantId?: number | null } = {}) {
  const merchantId = extra.merchantId === undefined ? 2 : extra.merchantId;
  const outletId = extra.outletId === undefined ? (role.startsWith('OUTLET_') ? 1 : null) : extra.outletId;
  mockState.ctx = {
    user: { id: extra.id ?? 10, role, email: 'u@x', firstName: 'An', lastName: 'Le', merchantId, outletId },
    userScope: { merchantId, outletId },
  };
  return mockState.ctx;
}

export function req(url: string, body?: any, headers: Record<string, string> = {}): any {
  return {
    url: url.startsWith('http') ? url : `http://localhost${url}`,
    method: 'POST',
    headers: {
      get: (k: string) => headers[k.toLowerCase()] ?? headers[k] ?? null,
      entries: () => Object.entries(headers)[Symbol.iterator](),
    },
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    },
  };
}

export const params = (p: Record<string, string>) => ({ params: p });

export function resetAttendanceMocks() {
  jest.clearAllMocks();
  const a = mockDb.attendance;
  mockDb.merchantModules.isActive.mockResolvedValue(true);
  mockDb.merchantModules.getActiveKeys.mockResolvedValue(['attendance']);
  a.getOutlet.mockImplementation(async (outletId: number, merchantId: number) =>
    merchantId === 2 && [1, 2].includes(outletId) ? { id: outletId, name: `CN ${outletId}`, merchantId: 2 } : null
  );
  a.autoCloseOverdue.mockResolvedValue(0);
  a.findOpenRecord.mockResolvedValue(null);
  a.createScan.mockResolvedValue({ id: 1 });
  a.getScheduleData.mockResolvedValue({ rules: [], dayChanges: [], templates: [] });
  a.workedDays.mockResolvedValue([]);
  a.isMonthLocked.mockResolvedValue(false);
  a.findUsersByIds.mockResolvedValue([]);
  a.listOutletScans.mockResolvedValue([]);
  a.listOutletUsers.mockResolvedValue([
    { id: 7, firstName: 'Bình', lastName: 'Tran', role: 'OUTLET_STAFF', outletId: 1 },
    { id: 8, firstName: 'Chi', lastName: 'Ng', role: 'OUTLET_ADMIN', outletId: 1 },
  ]);
  a.getUserInMerchant.mockImplementation(async (userId: number, merchantId: number) =>
    merchantId === 2 && [7, 8, 10].includes(userId)
      ? { id: userId, firstName: 'U', lastName: String(userId), role: userId === 8 ? 'OUTLET_ADMIN' : 'OUTLET_STAFF', outletId: 1, merchantId: 2 }
      : null
  );
  mockDb.auditLogs.create.mockResolvedValue({ id: 1 });
}
