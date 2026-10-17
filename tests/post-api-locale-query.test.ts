jest.mock('../packages/utils/src/core', () => ({ authenticatedFetch: jest.fn(), parseApiResponse: jest.fn(async (response: unknown) => response) }));
jest.mock('../packages/utils/src/config/api', () => ({ apiUrls: { posts: { list: 'https://local.example/api/posts' } } }));
import { postsApi } from '../packages/utils/src/api/posts';
import { authenticatedFetch } from '../packages/utils/src/core';

it('includes the selected CMS language without dropping existing search and pagination', async () => {
  await postsApi.searchPosts({ locale: 'ru', search: 'AnyRent', status: 'DRAFT', page: 2, limit: 12 });
  const url = new URL((authenticatedFetch as jest.Mock).mock.calls[0][0]);
  expect(Object.fromEntries(url.searchParams)).toEqual({ locale: 'ru', search: 'AnyRent', status: 'DRAFT', page: '2', limit: '12' });
});
