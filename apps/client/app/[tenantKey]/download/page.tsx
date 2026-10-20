import type { Metadata } from 'next';
import DownloadPageContent from '../../components/public-pages/DownloadPageContent';
import { publicPageMetadata } from '../../../lib/public-content/public-pages';
import { localizedPageLocale } from '../../../lib/public-content/localized-page';

type Props = { params: { tenantKey: string } };

/** #1114: /{locale}/download */
export function generateMetadata({ params }: Props): Metadata {
  return publicPageMetadata(localizedPageLocale(params.tenantKey), 'download');
}

export default function LocalizedDownloadPage({ params }: Props) {
  return <DownloadPageContent locale={localizedPageLocale(params.tenantKey)} />;
}
