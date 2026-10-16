import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isPublicLocale, PUBLIC_LOCALES, publicPostPath, publicHomePath } from '@rentalshop/constants';
import { publicMessages } from '../../../lib/public-content/messages';
import { PublicShell } from '../../components/public-content/PublicShell';
import styles from '../../components/public-content/public-content.module.css';

type Props = { params: { tenantKey: string } };

export function generateMetadata({ params }: Props): Metadata {
  if (!isPublicLocale(params.tenantKey)) notFound();
  const locale = params.tenantKey, t = publicMessages(locale);
  return {
    title: { absolute: `${t.heroTitle} | AnyRent` }, description: t.heroDescription,
    alternates: { canonical: publicHomePath(locale), languages: Object.fromEntries(PUBLIC_LOCALES.map(code => [code, publicHomePath(code)])) },
    openGraph: { title: t.heroTitle, description: t.heroDescription, url: publicHomePath(locale), images: ['/anyrent-og.jpg'] },
  };
}

export default function LocalizedLanding({ params }: Props) {
  if (!isPublicLocale(params.tenantKey)) notFound();
  const locale = params.tenantKey, t = publicMessages(locale);
  return <PublicShell locale={locale}>
    <section className={styles.hero}>
      <div><div className={styles.eyebrow}>{t.eyebrow}</div><h1>{t.heroTitle}</h1><p>{t.heroDescription}</p>
        <div className={styles.actions}><a className={styles.button} href="/register">{t.tryApp}</a><a href={publicPostPath(locale)}>{t.posts} →</a></div>
      </div>
      <img src="/anyrent-landing-download-devices.png" alt={t.heroAlt} width="1024" height="1024" />
    </section>
    <section className={styles.section}><div className={styles.features}>
      {(['orders', 'calendar', 'products'] as const).map((name, i) => <div key={name}>
        <span>0{i + 1}</span><h2>{t[`${name}Title`]}</h2><p>{t[`${name}Description`]}</p>
      </div>)}
    </div></section>
    <section className={`${styles.section} ${styles.imageSection}`}>
      <div><h2>{t.imageTitle}</h2><p>{t.imageDescription}</p></div>
      <img src="/auth-showcase/web-image-search.jpg" alt={t.imageAlt} width="1280" height="800" loading="lazy" />
    </section>
    <section className={styles.section}><div className={styles.cta}><h2>{t.ctaTitle}</h2><p>{t.ctaDescription}</p>
      <div className={styles.actions}><a className={styles.button} href="/register">{t.tryApp}</a>
        <a href="https://apps.apple.com/vn/app/anyrent/id6754793592">{t.appStore}</a>
        <a href="https://play.google.com/store/apps/details?id=anyrent.shop">{t.googlePlay}</a>
      </div>
    </div></section>
  </PublicShell>;
}
