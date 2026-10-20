import type { PublicLocale } from '@rentalshop/constants';
import vi from '../../../../locales/vi/landing.json';
import en from '../../../../locales/en/landing.json';
import ja from '../../../../locales/ja/landing.json';
import ko from '../../../../locales/ko/landing.json';
import zh from '../../../../locales/zh/landing.json';
import ru from '../../../../locales/ru/landing.json';
import zhTW from '../../../../locales/zh-TW/landing.json';
import fr from '../../../../locales/fr/landing.json';
import de from '../../../../locales/de/landing.json';
import th from '../../../../locales/th/landing.json';
import id from '../../../../locales/id/landing.json';
import es from '../../../../locales/es/landing.json';
import { publicMessages } from './messages';

export type LandingMessages = typeof en;
type Tree = { [key: string]: unknown };

/** Locales whose landing file has always been complete */
const COMPLETE: Partial<Record<PublicLocale, LandingMessages>> = { vi, en, ja, ko, zh };
/** #1103: the newer public locales; English fills a key that is added later and not yet translated */
const NEWER: Partial<Record<PublicLocale, Tree>> = { ru, 'zh-TW': zhTW, fr, de, th, id, es };

function overlay(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const current = out[key];
    out[key] = value && typeof value === 'object' && current && typeof current === 'object'
      ? overlay(current as Tree, value as Tree)
      : value;
  }
  return out;
}

/** The `landing` namespace of the public landing page for one public locale */
export function publicLandingMessages(locale: PublicLocale): LandingMessages {
  const complete = COMPLETE[locale];
  if (complete) return complete;
  const landing = overlay(en as unknown as Tree, NEWER[locale] ?? {}) as unknown as LandingMessages;
  // #1000: hero, features, image search and blog headings come from the reviewed public copy
  const copy = publicMessages(locale);
  return {
    ...landing,
    hero: { ...landing.hero, title: copy.heroTitle, description: copy.heroDescription, downloadApp: copy.tryApp },
    features: { ...landing.features, title: copy.ordersTitle, description: copy.ordersDescription },
    aiSearch: { ...landing.aiSearch, title: copy.imageTitle, description: copy.imageDescription },
    blog: { ...landing.blog, title: copy.blogTitle, subtitle: copy.blogDescription },
  };
}
