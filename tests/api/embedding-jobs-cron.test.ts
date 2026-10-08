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
