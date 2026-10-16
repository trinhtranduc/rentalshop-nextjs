import Link from 'next/link';
import { PUBLIC_LOCALES, PUBLIC_LOCALE_NAMES, publicPostPath, publicHomePath, type PublicLocale } from '@rentalshop/constants';
import { LanguageSwitcher } from '@rentalshop/ui';
import type { PostTranslation } from '@rentalshop/types';
import { publicMessages } from '../../../lib/public-content/messages';
import { LandingBrandLogo } from '../LandingBrandLogo';
import styles from './public-content.module.css';

export function LanguageLinks({ locale, kind = 'home', translations = [] }: {
  locale: PublicLocale;
  kind?: 'home' | 'list' | 'post';
  translations?: PostTranslation[];
}) {
  const t = publicMessages(locale);
  return <details className={styles.languages}>
    <summary>{t.language}: {PUBLIC_LOCALE_NAMES[locale]}</summary>
    <nav aria-label={t.language}>
      {PUBLIC_LOCALES.map(code => {
        const edition = translations.find(p => p.locale === code && p.status === 'PUBLISHED');
        const href = kind === 'home' ? publicHomePath(code) : kind === 'post' && edition
          ? publicPostPath(code, edition.slug) : `${publicPostPath(code)}${kind === 'post' ? '?untranslated=1' : ''}`;
        return <Link key={code} href={href} hrefLang={code} aria-current={code === locale ? 'page' : undefined} lang={code}>{PUBLIC_LOCALE_NAMES[code]}</Link>;
      })}
    </nav>
  </details>;
}

export function PublicShell({ locale, children, kind = 'home', translations = [] }: {
  locale: PublicLocale; children: React.ReactNode; kind?: 'home' | 'list' | 'post'; translations?: PostTranslation[];
}) {
  const t = publicMessages(locale);
  const localePaths = Object.fromEntries(PUBLIC_LOCALES.map(code => {
    if (kind === 'home') return [code, publicHomePath(code)];
    if (kind === 'list') return [code, publicPostPath(code)];
    const edition = translations.find(post => post.locale === code && post.status === 'PUBLISHED');
    return [code, edition ? publicPostPath(code, edition.slug) : publicPostPath(code)];
  })) as Partial<Record<PublicLocale, string>>;

  return <div className={styles.page} lang={locale}>
    <header className={styles.header} role="banner">
      <div className={styles.headerInner}>
        <Link href={publicHomePath(locale)} className={styles.brand} aria-label="AnyRent">
          <LandingBrandLogo />
        </Link>
        <nav aria-label={t.home} className={styles.nav}>
          <Link href={publicHomePath(locale)}>{t.home}</Link>
          <Link href={publicPostPath(locale)} aria-current={kind !== 'home' ? 'page' : undefined}>{t.posts}</Link>
          <LanguageSwitcher variant="compact" publicLocale={locale} publicLocalePaths={localePaths} />
          <Link href="/register" className={styles.button}>{t.tryApp}</Link>
        </nav>
      </div>
    </header>
    {children}
    <footer className={styles.footer}>
      <Link href={publicHomePath(locale)} className={styles.footerBrand}><LandingBrandLogo size="sm" /></Link>
      <p>{t.footer}</p>
      <Link href={publicPostPath(locale)}>{t.posts}</Link>
    </footer>
  </div>;
}
