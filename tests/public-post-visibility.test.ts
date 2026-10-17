jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }));
jest.mock('@rentalshop/utils', () => ({ postsApi: { getPostBySlug: jest.fn() } }));
import { postsApi } from '@rentalshop/utils';
import { publishedPost, publishedEditions, postLanguageAlternates } from '../apps/client/lib/public-content/posts';
import type { Post } from '@rentalshop/types';
const getPost = postsApi.getPostBySlug as jest.Mock;
const vi = { id: 1, locale: 'vi', slug: 'gioi-thieu', title: 'AnyRent', status: 'PUBLISHED' } as Post;

describe('public post visibility and hreflang (#1000)', () => {
  beforeEach(() => getPost.mockReset());
  it('looks up exactly the requested locale once', async () => {
    getPost.mockResolvedValue({ success: false, code: 'POST_NOT_FOUND' });
    expect(await publishedPost('ru', 'introduction')).toBeNull();
    expect(getPost.mock.calls).toEqual([['introduction', 'ru']]);
  });
  it.each(['DRAFT', 'ARCHIVED'])('does not expose %s even if an API accidentally returns it', async status => {
    getPost.mockResolvedValue({ success: true, data: { ...vi, status } });
    expect(await publishedPost('vi', vi.slug)).toBeNull();
  });
  it('does not accept a response in another language', async () => {
    getPost.mockResolvedValue({ success: true, data: vi });
    expect(await publishedPost('en', vi.slug)).toBeNull();
  });
  it('does not turn an API outage into a false missing article', async () => {
    getPost.mockResolvedValue({ success: false, code: 'INTERNAL_SERVER_ERROR' });
    await expect(publishedPost('vi', vi.slug)).rejects.toThrow('Unable to load');
  });
  it('lists only published supported equivalents with the correct own slugs', () => {
    const post = { ...vi, translations: [
      { id: 2, locale: 'ru', slug: 'russian-edition', title: 'Русский', status: 'PUBLISHED' },
      { id: 3, locale: 'en', slug: 'draft', title: 'Draft', status: 'DRAFT' },
      { id: 4, locale: 'xx', slug: 'unsupported', title: 'X', status: 'PUBLISHED' },
    ] } as Post;
    expect(publishedEditions(post).map(p => p.id)).toEqual([1, 2]);
    expect(postLanguageAlternates(post)).toEqual({ vi: '/post/gioi-thieu', ru: '/ru/post/russian-edition' });
  });
});
