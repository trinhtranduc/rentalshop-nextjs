import Link from 'next/link';
import { PUBLIC_LOCALES, PUBLIC_LOCALE_NAMES, publicPostPath, publicHomePath, type PublicLocale } from '@rentalshop/constants';
import type { PostTranslation } from '@rentalshop/types';
import { publicMessages } from '../../../lib/public-content/messages';
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

export function PublicShell({ locale, children, kind = 'home', translations }: {
  locale: PublicLocale; children: React.ReactNode; kind?: 'home' | 'list' | 'post'; translations?: PostTranslation[];
}) {
  const t = publicMessages(locale);
  return <div className={styles.page} lang={locale}>
    <header className={styles.header}>
      <Link href={publicHomePath(locale)} className={styles.brand}><img src="/anyrent-logo-dark.svg" alt="AnyRent" width="133" height="34" /></Link>
      <nav aria-label={t.home} className={styles.nav}>
        <Link href={publicHomePath(locale)}>{t.home}</Link><Link href={publicPostPath(locale)}>{t.posts}</Link>
        <LanguageLinks locale={locale} kind={kind} translations={translations} />
        <Link href="/register" className={styles.button}>{t.tryApp}</Link>
      </nav>
    </header>
    {children}
    <footer className={styles.footer}><Link href={publicHomePath(locale)}>AnyRent</Link><p>{t.footer}</p><Link href={publicPostPath(locale)}>{t.posts}</Link></footer>
  </div>;
}
