import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { postsApi } from '@rentalshop/utils';
import { isPublicLocale, PUBLIC_LOCALES, publicPostPath } from '@rentalshop/constants';
import { publicMessages } from '../../../../lib/public-content/messages';
import { PublicShell } from '../../../components/public-content/PublicShell';
import { PostCards } from '../../../components/public-content/PostCards';
import styles from '../../../components/public-content/public-content.module.css';

type Props = { params: { tenantKey: string }; searchParams: { q?: string; page?: string; untranslated?: string } };

export function generateMetadata({ params }: Props): Metadata {
  if (!isPublicLocale(params.tenantKey)) notFound();
  const t = publicMessages(params.tenantKey);
  return { title: { absolute: `${t.blogTitle} | AnyRent` }, description: t.blogDescription,
    alternates: { canonical: publicPostPath(params.tenantKey), languages: Object.fromEntries(PUBLIC_LOCALES.map(code => [code, publicPostPath(code)])) },
  };
}

export default async function LocalizedPosts({ params, searchParams }: Props) {
  if (!isPublicLocale(params.tenantKey)) notFound();
  const locale = params.tenantKey, t = publicMessages(locale);
  const page = /^\d+$/.test(searchParams.page ?? '') ? Math.max(1, Math.min(10000, Number(searchParams.page))) : 1;
  const q = (searchParams.q ?? '').slice(0, 200);
  const result = await postsApi.searchPublicPosts({ locale, search: q || undefined, page, limit: 12, sortBy: 'publishedAt', sortOrder: 'desc' }).catch(() => null);
  const posts = result?.success ? (result.data?.data ?? []).filter(p => p.locale === locale && p.status === 'PUBLISHED') : [];
  const pageUrl = (n: number) => `${publicPostPath(locale)}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;
  return <PublicShell locale={locale} kind="list">
    <div className={styles.listHeading}><h1>{t.blogTitle}</h1><p>{t.blogDescription}</p>
      <form action={publicPostPath(locale)} className={styles.search}>
        <input name="q" type="search" aria-label={t.search} placeholder={t.searchPlaceholder} defaultValue={q} maxLength={200} />
        <button type="submit" className={styles.button}>{t.search}</button>
      </form>
      {searchParams.untranslated === '1' && <p role="status" className={styles.notice}>{t.translationUnavailable}</p>}
    </div>
    <section className={styles.section}>
      {!result?.success ? <div role="alert" className={styles.notice}><p>{t.loadError}</p><Link href={pageUrl(page)}>{t.retry}</Link></div>
        : posts.length ? <PostCards posts={posts} locale={locale} /> : <p role="status" className={styles.notice}>{t.empty}</p>}
      {result?.success && <nav className={styles.pagination} aria-label={t.page}>
        {page > 1 && <Link href={pageUrl(page - 1)}>{t.previous}</Link>}
        <span>{t.page} {page}</span>{result.data?.hasMore && <Link href={pageUrl(page + 1)}>{t.next}</Link>}
      </nav>}
    </section>
  </PublicShell>;
}
