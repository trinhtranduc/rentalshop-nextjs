import type { Metadata } from 'next';
import { PUBLIC_LOCALES, publicHomePath, publicPagePath, type PublicLocale, type PublicPage } from '@rentalshop/constants';
import vi from '../../../../locales/vi/publicPages.json';
import en from '../../../../locales/en/publicPages.json';
import ja from '../../../../locales/ja/publicPages.json';
import ko from '../../../../locales/ko/publicPages.json';
import zh from '../../../../locales/zh/publicPages.json';
import ru from '../../../../locales/ru/publicPages.json';
import zhTW from '../../../../locales/zh-TW/publicPages.json';
import fr from '../../../../locales/fr/publicPages.json';
import de from '../../../../locales/de/publicPages.json';
import th from '../../../../locales/th/publicPages.json';
import id from '../../../../locales/id/publicPages.json';
import es from '../../../../locales/es/publicPages.json';

/** #1114: copy of the public pricing, features, download and AI image search pages, per public locale */
export type PublicPageMessages = typeof en;

const MESSAGES: Record<PublicLocale, PublicPageMessages> = {
  vi, en, ja, ko, zh, ru, 'zh-TW': zhTW, fr, de, th, id, es,
};

const META_KEY: Record<PublicPage, keyof PublicPageMessages['meta']> = {
  pricing: 'pricing',
  features: 'features',
  download: 'download',
  'image-search': 'imageSearch',
};

const BASE_URL = (process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop').replace(/\/$/, '');

export function publicPageMessages(locale: PublicLocale): PublicPageMessages {
  return MESSAGES[locale];
}

/** hreflang group of one page: every language at its own URL; x-default is the Vietnamese URL */
export function publicPageAlternates(page: PublicPage): Record<string, string> {
  return {
    ...Object.fromEntries(PUBLIC_LOCALES.map((locale) => [locale, publicPagePath(locale, page)])),
    'x-default': publicPagePath('vi', page),
  };
}

const OG_IMAGE: Record<PublicPage, { url: string; width: number; height: number }> = {
  pricing: { url: '/anyrent-og.jpg', width: 1200, height: 630 },
  features: { url: '/anyrent-og.jpg', width: 1200, height: 630 },
  download: { url: '/anyrent-og.jpg', width: 1200, height: 630 },
  'image-search': { url: '/anyrent-ai-phone-results.png', width: 720, height: 1280 },
};

export function publicPageMetadata(locale: PublicLocale, page: PublicPage): Metadata {
  const meta = MESSAGES[locale].meta[META_KEY[page]];
  const path = publicPagePath(locale, page);
  const image = OG_IMAGE[page];
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: path, languages: publicPageAlternates(page) },
    openGraph: {
      title: meta.title,
      description: meta.ogDescription,
      type: 'website',
      url: path,
      images: [{ ...image, alt: meta.name }],
    },
    twitter: { card: 'summary_large_image', title: meta.title, description: meta.ogDescription, images: [image.url] },
  };
}

/** WebPage + breadcrumb JSON-LD in the page language */
export function publicPageJsonLd(locale: PublicLocale, page: PublicPage) {
  const messages = MESSAGES[locale];
  const meta = messages.meta[META_KEY[page]];
  const home = `${BASE_URL}${publicHomePath(locale) === '/' ? '' : publicHomePath(locale)}`;
  const url = `${BASE_URL}${publicPagePath(locale, page)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.name,
    description: meta.description,
    url,
    inLanguage: locale,
    isPartOf: { '@type': 'WebSite', name: 'AnyRent', url: BASE_URL },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: messages.common.home, item: home || BASE_URL },
        { '@type': 'ListItem', position: 2, name: meta.breadcrumb, item: url },
      ],
    },
  };
}

/** FAQ JSON-LD from question/answer pairs */
export function faqJsonLd(pairs: Array<[string, string]>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
  };
}
