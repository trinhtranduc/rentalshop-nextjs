// #1117: public post reads ran through Next's data cache (fetch without a cache option is cached forever in a
// server component, across deploys on Vercel), so /en/post kept serving the empty list from before the English
// edition was published while /en/post?q=AnyRent (another URL) showed it.
jest.mock('../packages/utils/src/core', () => ({ authenticatedFetch: jest.fn(), parseApiResponse: jest.fn(async (r: unknown) => r) }));
jest.mock('../packages/utils/src/config/api', () => ({
  apiUrls: { posts: { public: 'https://api.example/api/posts/public', getBySlug: (s: string) => `https://api.example/api/posts/slug/${s}`,
    categories: { public: 'https://api.example/api/posts/categories/public' } } },
}));
import { postsApi } from '../packages/utils/src/api/posts';

const fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
beforeAll(() => { (global as any).fetch = fetchMock; });
beforeEach(() => fetchMock.mockClear());

describe('public post reads are never served from the data cache (#1117)', () => {
  it('lists published posts with cache: no-store', async () => {
    await postsApi.searchPublicPosts({ locale: 'en', page: 1, limit: 12, sortBy: 'publishedAt', sortOrder: 'desc' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as any[])[1]).toMatchObject({ method: 'GET', cache: 'no-store' });
  });
  it('reads one post (and its translations for hreflang) with cache: no-store', async () => {
    await postsApi.getPostBySlug('anyrent-phan-mem-quan-ly-cua-hang-cho-thue', 'vi');
    expect((fetchMock.mock.calls[0] as any[])[1]).toMatchObject({ cache: 'no-store' });
  });
});
