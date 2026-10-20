import type { Metadata } from 'next';
import FeaturesClient from '../../features/FeaturesClient';
import { publicPageJsonLd, publicPageMetadata } from '../../../lib/public-content/public-pages';
import { localizedPageLocale } from '../../../lib/public-content/localized-page';

type Props = { params: { tenantKey: string } };

/** #1114: /{locale}/features */
export function generateMetadata({ params }: Props): Metadata {
  return publicPageMetadata(localizedPageLocale(params.tenantKey), 'features');
}

export default function LocalizedFeaturesPage({ params }: Props) {
  const locale = localizedPageLocale(params.tenantKey);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(publicPageJsonLd(locale, 'features')) }} />
      <FeaturesClient />
    </>
  );
}
