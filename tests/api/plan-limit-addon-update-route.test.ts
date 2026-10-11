/**
 * #800: PUT /api/plan-limit-addons/[id] takes the id from the URL.
 * The update schema also asked for `id` in the body, the client does not send it, so every edit answered
 * 400 "id: Expected number, received nan".
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, {}),
}));

const mockAddons = { findById: jest.fn(), update: jest.fn() };
// #826: raising outlets reads the merchant's plan; this merchant is on a multi-branch plan
const mockMerchants = { findById: jest.fn(async () => ({ id: 2, subscription: { plan: { limits: { outlets: 3 } } } })) };
jest.mock('@rentalshop/database', () => ({ db: { planLimitAddons: mockAddons, merchants: mockMerchants } }));
jest.mock('@rentalshop/utils/server', () => ({ validateAddonDeletion: jest.fn() }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/validation-schemas'),
  ...jest.requireActual('../../packages/utils/src/core/plan-addon-rules'),
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
    validationError: (e: any) => ({ success: false, code: 'VALIDATION_ERROR', error: e }),
  },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
  sendPlanLimitAddonChangeEmail: jest.fn(),
}));

import { PUT } from '../../apps/api/app/api/plan-limit-addons/[id]/route';

const call = (id: string, body: any) => PUT({ json: async () => body } as any, { params: { id } }) as any;

describe('PUT /api/plan-limit-addons/[id] (#800)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddons.findById.mockResolvedValue({ id: 2, merchantId: 2, users: 2, isActive: true });
    mockAddons.update.mockImplementation(async (id: number, data: any) => ({ id, merchantId: 2, ...data }));
  });

  it('updates with only the changed fields in the body (no id)', async () => {
    const res = await call('2', { users: 3, notes: 'more users' });
    expect(res.status).toBe(200);
    expect(mockAddons.update).toHaveBeenCalledWith(2, { users: 3, notes: 'more users' });
  });

  it('the id of the URL wins over an id in the body, and the id is not written', async () => {
    await call('2', { id: 99, outlets: 1 });
    expect(mockAddons.update).toHaveBeenCalledWith(2, { outlets: 1 });
  });

  it('still refuses a negative number', async () => {
    const res = await call('2', { users: -1 });
    expect(res.status).toBe(400);
    expect(mockAddons.update).not.toHaveBeenCalled();
  });

  it('a non-numeric id in the URL is 400 INVALID_INPUT', async () => {
    const res = await call('abc', { users: 1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });
});
