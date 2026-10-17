import englishMessages from '../../../locales/en/errors.json';
import vietnameseMessages from '../../../locales/vi/errors.json';

const catalogs = {
  en: englishMessages as Readonly<Record<string, string>>,
  vi: vietnameseMessages as Readonly<Record<string, string>>,
};

export type ApiMessageLocale = 'en' | 'vi';
export type ApiMessageValues = Readonly<Record<string, string | number | boolean | null | undefined>>;

const friendlyFallback: Record<ApiMessageLocale, string> = {
  en: 'Something went wrong. Please try again.',
  vi: 'Đã có lỗi. Vui lòng thử lại.',
};

/**
 * First language range only. `en` / `en-US` → English. `vi` / `vi-VN` → Vietnamese.
 * Missing, empty, or any other language (ja, ko, zh) stays Vietnamese.
 */
export function resolveApiMessageLocale(header: string | null | undefined): ApiMessageLocale {
  if (!header) return 'vi';
  const first = header.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (first === 'en' || first.startsWith('en-')) return 'en';
  if (first === 'vi' || first.startsWith('vi-')) return 'vi';
  return 'vi';
}

const REQUEST_STORE = Symbol.for('rentalshop.apiMessageRequest');

type HeaderBag = { headers?: Record<string, string | string[] | undefined> };

/**
 * Header from the request remembered by `installApiMessageLocale` (server entry).
 * `undefined` means no request is bound. `null` means a request with no Accept-Language.
 * The store lives on `globalThis` because the API route bundle and the server entry
 * are two copies of this package and do not share a module variable.
 */
function boundAcceptLanguage(): string | null | undefined {
  const store = (globalThis as typeof globalThis & {
    [REQUEST_STORE]?: { getStore: () => HeaderBag | undefined };
  })[REQUEST_STORE];
  if (!store || typeof store.getStore !== 'function') return undefined;
  const current = store.getStore();
  if (!current) return undefined;
  const raw = current.headers ? current.headers['accept-language'] : undefined;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

/**
 * Locale of the request currently running. Outside a request (tests, scripts) this is Vietnamese.
 * `next/headers` is loaded only when a request is active, so the browser bundle does not import it.
 * That call often sees a different copy than the one Next.js filled, so the server binding is checked first.
 */
export function currentRequestApiLocale(): ApiMessageLocale {
  if (typeof window !== 'undefined') return 'vi';
  const bound = boundAcceptLanguage();
  if (bound !== undefined) return resolveApiMessageLocale(bound);
  try {
    const dynamicRequire = new Function('moduleName', 'return require(moduleName)') as (moduleName: string) => {
      headers: () => { get: (name: string) => string | null };
    };
    const { headers } = dynamicRequire('next/headers');
    return resolveApiMessageLocale(headers().get('accept-language'));
  } catch {
    return 'vi';
  }
}

/**
 * Catalog sentence for `code`. Placeholder names are filled once, as text, never as a second template.
 * A code missing from the catalog becomes a short friendly sentence, not the code and not an exception.
 */
export function getApiMessage(
  code: string,
  values: ApiMessageValues = {},
  locale?: ApiMessageLocale,
  legacy?: Readonly<Record<string, string>>,
): string {
  const lang = locale ?? currentRequestApiLocale();
  return fillTemplate(catalogs[lang][code] ?? legacy?.[code] ?? friendlyFallback[lang], values);
}

/** #1013: neutral sentence for a success code without its own sentence. Never the error fallback. */
const successFallback: Record<ApiMessageLocale, string> = {
  en: 'Success',
  vi: 'Thành công',
};

/**
 * Like `getApiMessage`, for a success response: catalog sentence, else the legacy sentence, else a neutral
 * success sentence. A success must never say "Something went wrong".
 */
export function getApiSuccessMessage(
  code: string,
  values: ApiMessageValues = {},
  locale?: ApiMessageLocale,
  legacy?: Readonly<Record<string, string>>,
): string {
  const lang = locale ?? currentRequestApiLocale();
  return fillTemplate(catalogs[lang][code] ?? legacy?.[code] ?? successFallback[lang], values);
}

function fillTemplate(template: string, values: ApiMessageValues): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (placeholder, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) return placeholder;
    const value = values[name];
    return value === null || value === undefined ? '' : String(value);
  });
}
