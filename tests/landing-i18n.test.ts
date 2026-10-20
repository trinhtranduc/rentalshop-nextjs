import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PUBLIC_LOCALES } from '../packages/constants/src/public-locales';
import { publicLandingMessages } from '../apps/client/lib/public-content/landing-messages';
import en from '../locales/en/landing.json';

/** #1103: every landing text exists in all 12 public locales, nothing falls back to English or Vietnamese */
type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
    return out;
  }, {});
}

/** Letters only Vietnamese uses (â, ê, ô are left out: French and others use them too) */
const VIETNAMESE = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const english = flatten(en as Tree);

/** Same text in every language: names, numbers, contact channels, discount badges */
const SAME_AS_ENGLISH = new Set([
  'navigation.faq',
  'customSolution.contact.email',
  'customSolution.contact.whatsapp',
  'contactButtons.zalo',
  'contactButtons.whatsapp',
  'contactButtons.telegram',
  'pricing.discounts.three',
  'pricing.discounts.six',
  'pricing.discounts.twelve',
  'whyChoose.rating',
  'hero.trustRating',
  ...Object.keys(english).filter((key) => key.startsWith('testimonials.items.') && key.endsWith('.name')),
]);

describe('landing translations', () => {
  it.each(PUBLIC_LOCALES)('%s has every landing key, none empty', (locale) => {
    const messages = flatten(publicLandingMessages(locale) as unknown as Tree);
    const missing = Object.keys(english).filter((key) => !messages[key]?.trim());
    expect(missing).toEqual([]);
  });

  it.each(PUBLIC_LOCALES.filter((locale) => locale !== 'vi'))('%s has no Vietnamese text', (locale) => {
    const messages = flatten(publicLandingMessages(locale) as unknown as Tree);
    expect(Object.entries(messages).filter(([, value]) => VIETNAMESE.test(value)).map(([key]) => key)).toEqual([]);
  });

  /** Words that are the same in that language: vi keeps its existing loanwords (only hardcoded copy changes in #1103) */
  const SAME_IN: Partial<Record<string, string[]>> = {
    vi: ['download.webPortal', 'pricing.features.webPortal'],
    fr: ['navigation.contact', 'blog.badge'],
    de: ['blog.badge', 'download.mobileApp', 'pricing.features.mobileApp'],
  };

  it.each(PUBLIC_LOCALES.filter((locale) => locale !== 'en'))('%s does not fall back to the English text', (locale) => {
    const messages = flatten(publicLandingMessages(locale) as unknown as Tree);
    const untranslated = Object.keys(english).filter((key) =>
      !SAME_AS_ENGLISH.has(key) && !(SAME_IN[locale] ?? []).includes(key) && messages[key] === english[key]);
    expect(untranslated).toEqual([]);
  });
});

describe('landing source has no hardcoded copy', () => {
  const files = [
    'apps/client/app/LandingPageClient.tsx',
    'apps/client/app/components/PublicSiteFooter.tsx',
    'apps/client/app/components/BlogSection.tsx',
  ];
  /** Text that once sat in the JSX instead of the locale files */
  const PHRASES = [
    'Why Choose Us', 'Active Stores', 'Orders Processed', 'Customer Rating', 'Support Available', 'Secure &amp; Reliable',
    'Testimonials</span>', 'Price:', '>Snap<', 'Blog section', 'Hero section', 'Statistics section',
  ];

  const code = (file: string) => readFileSync(join(__dirname, '..', file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it.each(files)('%s has no Vietnamese JSX text or attribute', (file) => {
    const source = code(file);
    const lines = source.split('\n').filter((line) => VIETNAMESE.test(line) && !/includes\(|replace\(|reviewBody:/.test(line));
    expect(lines.map((line) => line.trim())).toEqual([]);
  });

  it.each(files)('%s has none of the old hardcoded English phrases', (file) => {
    const source = code(file);
    expect(PHRASES.filter((phrase) => source.includes(phrase))).toEqual([]);
  });
});
