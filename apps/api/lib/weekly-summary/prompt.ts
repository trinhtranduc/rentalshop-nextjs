import { z } from 'zod';
import type { WeeklyNumbers } from './numbers';

/** #1612 languages of the apps; the key is what the summary row stores */
export const SUMMARY_LANGUAGES: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  th: 'Thai',
  id: 'Indonesian',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ru: 'Russian'
};

/** Language of the summary from Accept-Language (the apps and the web send the in-app language); default Vietnamese */
export function resolveSummaryLanguage(header: string | null | undefined): string {
  const first = (header ?? '').split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!first) return 'vi';
  if (first === 'zh-tw' || first === 'zh-hk' || first.startsWith('zh-hant')) return 'zh-TW';
  const base = first.split('-')[0];
  return base in SUMMARY_LANGUAGES ? base : 'vi';
}

export interface SummaryShop {
  businessType?: string | null;
  country?: string | null;
  city?: string | null;
  currency?: string | null;
  /** null = whole shop; a name = the summary of that branch only */
  branchName?: string | null;
}

/** What the model must return (structured output) */
export const SUMMARY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    actions: { type: 'array', items: { type: 'string' } },
    revenueNote: { type: 'string' },
    ordersNote: { type: 'string' },
    productsNote: { type: 'string' }
  },
  required: ['summary', 'actions', 'revenueNote', 'ordersNote', 'productsNote'],
  additionalProperties: false
} as const;

const contentSchema = z.object({
  summary: z.string().trim().min(1).max(600),
  actions: z.array(z.string().trim().min(1).max(300)).min(1),
  revenueNote: z.string().trim().max(400),
  ordersNote: z.string().trim().max(400),
  productsNote: z.string().trim().max(400)
});

export type SummaryContent = z.infer<typeof contentSchema>;

/** Parsed and trimmed model output; `null` when it is not the expected JSON */
export function parseSummaryContent(text: string): SummaryContent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) return null;
  return { ...parsed.data, actions: parsed.data.actions.slice(0, 3) };
}

/** System prompt: fixed text, the language is the only variable part */
export function summarySystemPrompt(language: string): string {
  const name = SUMMARY_LANGUAGES[language] ?? SUMMARY_LANGUAGES.vi;
  return [
    'You write a short weekly business summary for the owner or branch manager of a rental shop that uses AnyRent,',
    'a point-of-sale app for rental shops. You receive figures for one week (Monday to Sunday) and the week before,',
    'computed by the app. The app shows these figures next to your text.',
    '',
    'Rules:',
    `- Write in ${name}. Plain sentences, no markdown, no emoji, no greeting.`,
    '- Use only the figures given. Never invent numbers, products, branches, customers or causes the data does not show.',
    '- Prefer counts and percentages. Avoid repeating money amounts; the app already shows them.',
    '- summary: at most two short sentences: how the week went against the week before, and the one thing to watch.',
    '- actions: exactly three concrete things to do this week, one short sentence each, grounded in the figures',
    '  (stock of hot items, late returns, bookings not picked up, quiet days, items nobody rented, a branch that fell',
    '  behind). You may use the dates and the country for a seasonal hint (wedding season, holidays) as a suggestion.',
    '- revenueNote, ordersNote, productsNote: one short sentence each about that group. When a branch list is given,',
    '  revenueNote compares the branches. productsNote may also mention new and returning customers.',
    '- Keep every sentence under 160 characters.'
  ].join('\n');
}

/** User message: the figures as JSON. Customer names and phones are never part of `numbers`. */
export function summaryUserMessage(numbers: WeeklyNumbers, shop: SummaryShop, todayKey: string): string {
  const payload = {
    today: todayKey,
    shop: {
      type: shop.businessType || 'GENERAL',
      country: shop.country || null,
      city: shop.city || null,
      currency: shop.currency || null,
      scope: shop.branchName ? `one branch: ${shop.branchName}` : 'whole shop'
    },
    week: numbers.week,
    previousWeek: numbers.previousWeek,
    revenue: numbers.revenue,
    branches: numbers.branches.map((b) => ({ name: b.name, orderValue: b.orderValue, collected: b.collected, newOrders: b.newOrders })),
    orders: numbers.orders,
    rentals: numbers.rentals,
    products: {
      hot: numbers.products.hot.map((p) => ({ name: p.name, rentals: p.rentals, sales: p.sales, revenue: p.revenue })),
      notRented: numbers.products.notRented
    },
    customers: numbers.customers
  };
  return `Figures of the week (JSON):\n${JSON.stringify(payload)}`;
}
