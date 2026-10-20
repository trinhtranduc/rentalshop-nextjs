import type { PublicLocale } from '@rentalshop/constants';
import ruProducts from '../../../../locales/ru/products.json';
import zhTWProducts from '../../../../locales/zh-TW/products.json';
import frProducts from '../../../../locales/fr/products.json';
import deProducts from '../../../../locales/de/products.json';
import thProducts from '../../../../locales/th/products.json';
import idProducts from '../../../../locales/id/products.json';
import esProducts from '../../../../locales/es/products.json';
import ruCommon from '../../../../locales/ru/common.json';
import zhTWCommon from '../../../../locales/zh-TW/common.json';
import frCommon from '../../../../locales/fr/common.json';
import deCommon from '../../../../locales/de/common.json';
import thCommon from '../../../../locales/th/common.json';
import idCommon from '../../../../locales/id/common.json';
import esCommon from '../../../../locales/es/common.json';


type Messages = Record<string, unknown>;

/** Deep merge: keys of `partial` win, the rest stays from `base` */
export function mergeMessages(base: Messages, partial: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(partial)) {
    const current = out[key];
    out[key] =
      value && typeof value === 'object' && current && typeof current === 'object'
        ? mergeMessages(current as Messages, value as Messages)
        : value;
  }
  return out;
}

/** The shop strings of the public-only languages (`products` shop keys and `common.pagination`) */
const SHOP: Partial<Record<PublicLocale, { products: Messages; common: Messages }>> = {
  ru: { products: ruProducts, common: ruCommon },
  'zh-TW': { products: zhTWProducts, common: zhTWCommon },
  fr: { products: frProducts, common: frCommon },
  de: { products: deProducts, common: deCommon },
  th: { products: thProducts, common: thCommon },
  id: { products: idProducts, common: idCommon },
  es: { products: esProducts, common: esCommon },
};

/** `products` and `common` for a public-only language, over the English ones */
export function shopMessages(locale: PublicLocale, en: { products: Messages; common: Messages }) {
  const shop = SHOP[locale];
  if (!shop) return en;
  return { products: mergeMessages(en.products, shop.products), common: mergeMessages(en.common, shop.common) };
}
