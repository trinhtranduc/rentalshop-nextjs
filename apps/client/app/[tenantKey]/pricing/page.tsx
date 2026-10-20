import type { Metadata } from 'next';
import PricingClient from '../../pricing/PricingClient';
import { faqJsonLd, publicPageJsonLd, publicPageMessages, publicPageMetadata } from '../../../lib/public-content/public-pages';
import { localizedPageLocale } from '../../../lib/public-content/localized-page';
import { loadPublicPlans } from '../../../lib/public-content/public-plans';

type Props = { params: { tenantKey: string } };

/** #1114: /{locale}/pricing */
export function generateMetadata({ params }: Props): Metadata {
  return publicPageMetadata(localizedPageLocale(params.tenantKey), 'pricing');
}

export default async function LocalizedPricingPage({ params }: Props) {
  const plans = await loadPublicPlans();
  const locale = localizedPageLocale(params.tenantKey);
  const faq = publicPageMessages(locale).pricingFaq;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(publicPageJsonLd(locale, 'pricing')) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd([[faq.q1, faq.a1], [faq.q2, faq.a2], [faq.q3, faq.a3]])) }}
      />
      <PricingClient plans={plans} />
    </>
  );
}
