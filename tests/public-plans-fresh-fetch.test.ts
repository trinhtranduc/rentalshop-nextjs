// #1117: the public plans list used the same uncached-by-option fetch as posts, so a server-rendered pricing page
// could keep old prices from Next's data cache.
jest.mock('../packages/utils/src/core', () => ({ authenticatedFetch: jest.fn(), parseApiResponse: jest.fn(async (r: unknown) => r) }));
jest.mock('../packages/utils/src/config/api', () => ({ apiUrls: { plans: { public: 'https://api.example/api/plans/public' } } }));
import { publicPlansApi } from '../packages/utils/src/api/plans';

const fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
beforeAll(() => { (global as any).fetch = fetchMock; });

it('reads the public plans with cache: no-store (#1117)', async () => {
  await publicPlansApi.getPublicPlansWithVariants();
  expect((fetchMock.mock.calls[0] as any[])[1]).toMatchObject({ method: 'GET', cache: 'no-store' });
});
