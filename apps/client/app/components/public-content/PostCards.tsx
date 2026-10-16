import Link from 'next/link';
import type { Post } from '@rentalshop/types';
import { publicPostPath, type PublicLocale } from '@rentalshop/constants';
import { publicMessages } from '../../../lib/public-content/messages';
import styles from './public-content.module.css';

export function PostCards({ posts, locale }: { posts: Post[]; locale: PublicLocale }) {
  const t = publicMessages(locale);
  return <div className={styles.grid}>{posts.map(post => <article key={post.id} className={styles.postCard}>
    <Link href={publicPostPath(locale, post.slug)}>{post.featuredImage && <img src={post.featuredImage} alt={post.title} loading="lazy" />}
      <h2>{post.title}</h2>
    </Link>
    <time dateTime={String(post.publishedAt ?? post.createdAt)}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(post.publishedAt ?? post.createdAt))}</time>
    {post.excerpt && <p>{post.excerpt}</p>}
    <Link href={publicPostPath(locale, post.slug)}>{t.readMore} →</Link>
  </article>)}</div>;
}
