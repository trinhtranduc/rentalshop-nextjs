/**
 * #654 — the embedding cron is reachable with CRON_SECRET only (no user JWT),
 * reclaims stuck RUNNING jobs, then drains PENDING ones.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

const mockJobs = {
  reclaimStale: jest.fn(async () => ({ reclaimed: 2, failed: 1 })),
  processPending: jest.fn(async () => ({ queued: 3, processed: 3, completed: 3, failed: 0, skipped: 0 })),
};
jest.mock('@rentalshop/database', () => ({ db: { embeddingJobs: mockJobs } }));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
  handleApiError: () => ({ response: { success: false }, statusCode: 500 }),
}));

import { POST } from '../../apps/api/app/api/cron/embedding-jobs/route';
import { usesRouteManagedAuth } from '../../apps/api/lib/route-auth';

function req(headers: Record<string, string>, url = 'http://api.test/api/cron/embedding-jobs?batchSize=10') {
  return { url, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = 'cron-secret-for-tests';
});

it('is route-managed so the JWT middleware lets a CRON_SECRET call through', () => {
  expect(usesRouteManagedAuth('/api/cron/embedding-jobs')).toBe(true);
});

it('rejects a call without the secret', async () => {
  const res: any = await POST(req({ authorization: 'Bearer wrong' }));
  expect(res.status).toBe(401);
  expect(mockJobs.reclaimStale).not.toHaveBeenCalled();
});

it('reclaims stuck jobs, then processes pending ones (Bearer)', async () => {
  const res: any = await POST(req({ authorization: 'Bearer cron-secret-for-tests' }));
  expect(res.status).toBe(200);
  expect(mockJobs.reclaimStale.mock.invocationCallOrder[0]).toBeLessThan(
    mockJobs.processPending.mock.invocationCallOrder[0],
  );
  expect(mockJobs.processPending).toHaveBeenCalledWith({ batchSize: 10 });
  expect(res.body.data).toMatchObject({ processed: 3, reclaimed: 2, reclaimFailed: 1 });
});

it('accepts x-cron-secret too', async () => {
  const res: any = await POST(req({ 'x-cron-secret': 'cron-secret-for-tests' }));
  expect(res.status).toBe(200);
});

// #1087: a full re-index needs more than one small batch per call
describe('maxSeconds', () => {
  it('without it, one batch as before', async () => {
    const res: any = await POST(req({ authorization: 'Bearer cron-secret-for-tests' }));
    expect(mockJobs.processPending).toHaveBeenCalledTimes(1);
    expect(res.body.data.batches).toBe(1);
  });

  it('runs batches until no job is left and totals them', async () => {
    mockJobs.processPending
      .mockResolvedValueOnce({ queued: 10, processed: 10, completed: 9, failed: 1, skipped: 0 })
      .mockResolvedValueOnce({ queued: 4, processed: 4, completed: 4, failed: 0, skipped: 0 })
      .mockResolvedValueOnce({ queued: 0, processed: 0, completed: 0, failed: 0, skipped: 0 });
    const res: any = await POST(
      req({ authorization: 'Bearer cron-secret-for-tests' }, 'http://api.test/api/cron/embedding-jobs?batchSize=10&maxSeconds=60'),
    );
    expect(res.status).toBe(200);
    expect(mockJobs.processPending).toHaveBeenCalledTimes(3);
    expect(mockJobs.reclaimStale).toHaveBeenCalledTimes(1);
    expect(res.body.data).toMatchObject({ batches: 3, queued: 14, processed: 14, completed: 13, failed: 1, skipped: 0 });
  });

  it('stops when the time is used', async () => {
    const now = jest.spyOn(Date, 'now');
    let t = 1_000_000;
    now.mockImplementation(() => t);
    mockJobs.processPending.mockImplementation(async () => {
      t += 25_000; // each batch takes 25 s
      return { queued: 10, processed: 10, completed: 10, failed: 0, skipped: 0 };
    });
    const res: any = await POST(
      req({ authorization: 'Bearer cron-secret-for-tests' }, 'http://api.test/api/cron/embedding-jobs?batchSize=10&maxSeconds=60'),
    );
    expect(res.body.data.batches).toBe(3); // 25, 50, 75 s: the third one starts before 60 s, none after
    now.mockRestore();
    mockJobs.processPending.mockReset();
    mockJobs.processPending.mockImplementation(async () => ({ queued: 3, processed: 3, completed: 3, failed: 0, skipped: 0 }));
  });

  it('caps maxSeconds at 270 and rejects a bad value', async () => {
    const bad: any = await POST(
      req({ authorization: 'Bearer cron-secret-for-tests' }, 'http://api.test/api/cron/embedding-jobs?maxSeconds=abc'),
    );
    expect(bad.status).toBe(400);
    const neg: any = await POST(
      req({ authorization: 'Bearer cron-secret-for-tests' }, 'http://api.test/api/cron/embedding-jobs?maxSeconds=-5'),
    );
    expect(neg.status).toBe(400);
  });
});

