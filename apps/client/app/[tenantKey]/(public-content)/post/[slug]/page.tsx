import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isPublicLocale, publicPostPath } from '@rentalshop/constants';
import { publicMessages } from '../../../../../lib/public-content/messages';
import { publishedPost, publishedEditions, postLanguageAlternates } from '../../../../../lib/public-content/posts';
import { RichPostBody } from '../../../../../lib/public-content/RichPostBody';
import { PublicShell, LanguageLinks } from '../../../../components/public-content/PublicShell';
import styles from '../../../../components/public-content/public-content.module.css';

type Props = { params: { tenantKey: string; slug: string } };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isPublicLocale(params.tenantKey)) notFound();
  const post = await publishedPost(params.tenantKey, params.slug);
  if (!post) notFound();
  const title = post.seoTitle || post.title, description = post.seoDescription || post.excerpt;
  return { title, description, alternates: { canonical: publicPostPath(params.tenantKey, post.slug), languages: postLanguageAlternates(post) },
    openGraph: { type: 'article', title, description, url: publicPostPath(params.tenantKey, post.slug), images: post.featuredImage ? [post.featuredImage] : [] },
  };
}
export default async function LocalizedPost({ params }: Props) {
  if (!isPublicLocale(params.tenantKey)) notFound();
  const locale = params.tenantKey, t = publicMessages(locale);
  const post = await publishedPost(locale, params.slug);
  if (!post) notFound();
  const editions = publishedEditions(post);
  return <PublicShell locale={locale} kind="post" translations={editions}>
    <article className={styles.article}>
      <Link href={publicPostPath(locale)} className={styles.back}>← {t.back}</Link>
      <h1>{post.title}</h1>
      <time dateTime={String(post.publishedAt ?? post.createdAt)}>{new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(post.publishedAt ?? post.createdAt))}</time>
      {post.excerpt && <p>{post.excerpt}</p>}
      {post.featuredImage && <img src={post.featuredImage} alt={post.title} />}
      <RichPostBody content={post.content} />
      <div className={styles.translations}><LanguageLinks locale={locale} kind="post" translations={editions} /></div>
    </article>
  </PublicShell>;
}
