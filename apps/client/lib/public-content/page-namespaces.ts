import type { PublicLocale } from '@rentalshop/constants';
import viFeatures from '../../../../locales/vi/features.json';
import enFeatures from '../../../../locales/en/features.json';
import jaFeatures from '../../../../locales/ja/features.json';
import koFeatures from '../../../../locales/ko/features.json';
import zhFeatures from '../../../../locales/zh/features.json';
import ruFeatures from '../../../../locales/ru/features.json';
import zhTWFeatures from '../../../../locales/zh-TW/features.json';
import frFeatures from '../../../../locales/fr/features.json';
import deFeatures from '../../../../locales/de/features.json';
import thFeatures from '../../../../locales/th/features.json';
import idFeatures from '../../../../locales/id/features.json';
import esFeatures from '../../../../locales/es/features.json';
import viPlans from '../../../../locales/vi/plans.json';
import enPlans from '../../../../locales/en/plans.json';
import jaPlans from '../../../../locales/ja/plans.json';
import koPlans from '../../../../locales/ko/plans.json';
import zhPlans from '../../../../locales/zh/plans.json';
import ruPlans from '../../../../locales/ru/plans.json';
import zhTWPlans from '../../../../locales/zh-TW/plans.json';
import frPlans from '../../../../locales/fr/plans.json';
import dePlans from '../../../../locales/de/plans.json';
import thPlans from '../../../../locales/th/plans.json';
import idPlans from '../../../../locales/id/plans.json';
import esPlans from '../../../../locales/es/plans.json';

/** #1114: the `features` and `plans` namespaces of the public features and pricing pages, per public locale */
export type FeaturesMessages = typeof enFeatures;
export type PlansMessages = typeof enPlans;

const FEATURES: Record<PublicLocale, FeaturesMessages> = {
  vi: viFeatures, en: enFeatures, ja: jaFeatures, ko: koFeatures, zh: zhFeatures,
  ru: ruFeatures, 'zh-TW': zhTWFeatures, fr: frFeatures, de: deFeatures, th: thFeatures, id: idFeatures, es: esFeatures,
};

/** The newer locales translate only the public pricing page; the in-app plan texts stay English */
const PRICING_ONLY: Partial<Record<PublicLocale, { pricingPage: PlansMessages['pricingPage'] }>> = {
  ru: ruPlans, 'zh-TW': zhTWPlans, fr: frPlans, de: dePlans, th: thPlans, id: idPlans, es: esPlans,
};
const FULL_PLANS: Partial<Record<PublicLocale, PlansMessages>> = {
  vi: viPlans as unknown as PlansMessages, en: enPlans, ja: jaPlans as unknown as PlansMessages,
  ko: koPlans as unknown as PlansMessages, zh: zhPlans as unknown as PlansMessages,
};

export function publicFeaturesMessages(locale: PublicLocale): FeaturesMessages {
  return FEATURES[locale];
}

export function publicPlansMessages(locale: PublicLocale): PlansMessages {
  const full = FULL_PLANS[locale];
  if (full) return full;
  return { ...enPlans, pricingPage: { ...enPlans.pricingPage, ...PRICING_ONLY[locale]?.pricingPage } };
}
