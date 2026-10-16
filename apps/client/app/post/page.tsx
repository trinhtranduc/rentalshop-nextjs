import LocalizedPosts, { generateMetadata as postsMetadata } from '../[tenantKey]/(public-content)/post/page';

export function generateMetadata() {
  return postsMetadata({ params: { tenantKey: 'vi' }, searchParams: {} });
}

export default function VietnamesePosts({ searchParams }: {
  searchParams: { q?: string; page?: string; untranslated?: string };
}) {
  return LocalizedPosts({ params: { tenantKey: 'vi' }, searchParams });
}
