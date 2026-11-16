import { mergeMessages } from './public-content/shop-messages';
import type { AppLocale } from './public-content/shop-locale';

/** The `locales/<code>/<namespace>.json` files the logged-in app reads */
export const APP_NAMESPACES = [
  'common',
  'public',
  'auth',
  'dashboard',
  'orders',
  'products',
  'customers',
  'settings',
  'validation',
  'errors',
  'users',
  'outlets',
  'categories',
  'calendar',
  'plans',
  'subscription',
  'landing',
  'bankAccounts',
  'features',
  'affiliate',
  'availability',
  'attendance',
] as const;

type Messages = Record<string, unknown>;
export type AppMessages = Record<(typeof APP_NAMESPACES)[number], Messages>;

const load = async (locale: string, namespace: string): Promise<Messages> =>
  (await import(`../../../locales/${locale}/${namespace}.json`)).default as Messages;

const cache = new Map<string, Promise<AppMessages>>();

/**
 * #1597 the messages of the logged-in app in one web language: each namespace is the language's own file over the
 * English one, so a key it lacks shows English. Server only (root layout, `i18n.ts`); loaded once per language.
 */
export function appMessages(locale: AppLocale): Promise<AppMessages> {
  let messages = cache.get(locale);
  if (!messages) {
    messages = Promise.all(
      APP_NAMESPACES.map(async (namespace) => {
        const en = await load('en', namespace);
        return [namespace, locale === 'en' ? en : mergeMessages(en, await load(locale, namespace))] as const;
      })
    ).then((entries) => Object.fromEntries(entries) as AppMessages);
    cache.set(locale, messages);
    // a failed load is tried again on the next request
    messages.catch(() => cache.delete(locale));
  }
  return messages;
}
