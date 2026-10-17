import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isPublicLocale, PUBLIC_LOCALES, publicHomePath } from '@rentalshop/constants';
import { publicMessages } from '../../../lib/public-content/messages';
import LandingPage from '../../LandingPageClient';

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
  return <LandingPage publicLocale={params.tenantKey} />;
}
