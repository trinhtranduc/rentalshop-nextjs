import type { Metadata } from 'next';
import ImageSearchPageContent from '../../components/public-pages/ImageSearchPageContent';
import { publicPageMetadata } from '../../../lib/public-content/public-pages';
import { localizedPageLocale } from '../../../lib/public-content/localized-page';

type Props = { params: { tenantKey: string } };

/** #1114: /{locale}/image-search (Vietnamese: /tim-san-pham-bang-hinh-anh) */
export function generateMetadata({ params }: Props): Metadata {
  return publicPageMetadata(localizedPageLocale(params.tenantKey), 'image-search');
}

export default function LocalizedImageSearchPage({ params }: Props) {
  return <ImageSearchPageContent locale={localizedPageLocale(params.tenantKey)} />;
}
