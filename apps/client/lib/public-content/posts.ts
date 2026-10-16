import { cache } from 'react';
import { postsApi } from '@rentalshop/utils';
import { isPublicLocale, publicPostPath, type PublicLocale } from '@rentalshop/constants';
import type { Post, PostTranslation } from '@rentalshop/types';

/** Request-scoped deduplication for metadata and page; never fall back to another language. */
export const publishedPost = cache(async (locale: PublicLocale, slug: string): Promise<Post | null> => {
  const response = await postsApi.getPostBySlug(slug, locale);
  if (!response.success && response.code !== 'POST_NOT_FOUND') throw new Error('Unable to load public post');
  return response.success && response.data?.locale === locale && response.data.status === 'PUBLISHED' ? response.data : null;
});

export function publishedEditions(post: Post): PostTranslation[] {
  const byLocale = new Map<PublicLocale, PostTranslation>();
  for (const edition of [post, ...(post.translations ?? [])]) {
    if (isPublicLocale(edition.locale) && edition.status === 'PUBLISHED') byLocale.set(edition.locale, edition);
  }
  return [...byLocale.values()];
}

export function postLanguageAlternates(post: Post): Record<string, string> {
  return Object.fromEntries(publishedEditions(post).map(p => [p.locale, publicPostPath(p.locale, p.slug)]));
}
