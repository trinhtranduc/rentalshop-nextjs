/**
 * #946 landing page `/` on a phone opens the App Store (iPhone/iPad) or Google Play (Android).
 * Pure helpers: used by `middleware.ts` (edge) and the landing page (iPadOS desktop-mode fallback).
 * Desktop, crawlers and link-preview bots keep the page. `?web=1` keeps it and is remembered in a cookie.
 */

export const APP_STORE_URL = 'https://apps.apple.com/vn/app/anyrent/id6754793592';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=anyrent.shop';

/** Cookie set by `?web=1`; while it is `1` the landing page never redirects on that device. */
export const WEB_OPT_OUT_COOKIE = 'anyrent_web';
export const WEB_OPT_OUT_MAX_AGE = 60 * 60 * 24 * 365;

// Crawlers, link previews, audit tools and in-app browsers of chat apps (Zalo) keep the page.
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|zalo|whatsapp|telegram|skype|preview|embedly|pinterest|vkshare|quora link|outbrain|bitlyfetcher|google-inspectiontool|google-read-aloud|mediapartners-google|adsbot|apis-google|feedfetcher|lighthouse|pagespeed|headlesschrome|phantomjs|bytespider|yandex|baidu|coccoc|ahrefs|semrush|curl|wget|python-requests|okhttp|go-http-client/i;

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  return !!userAgent && BOT_UA.test(userAgent);
}

export function isWebOptOut(web: string | null | undefined, webCookie: string | null | undefined): boolean {
  return web === '1' || webCookie === '1';
}

export type LandingRedirectInput = {
  userAgent: string | null | undefined;
  /** value of the `web` query param */
  web?: string | null;
  /** value of the `anyrent_web` cookie */
  webCookie?: string | null;
};

/** Store URL to send this visitor of `/` to, or null to show the landing page. */
export function landingStoreRedirect({ userAgent, web, webCookie }: LandingRedirectInput): string | null {
  if (!userAgent || isWebOptOut(web, webCookie) || isBotUserAgent(userAgent)) return null;
  if (/iPhone|iPad|iPod/.test(userAgent)) return APP_STORE_URL;
  if (/Android/i.test(userAgent)) return GOOGLE_PLAY_URL;
  return null;
}

/** iPadOS Safari "desktop site" sends a Mac UA; only touch points tell it apart (browser only). */
export function isIpadDesktop(userAgent: string | null | undefined, maxTouchPoints: number | null | undefined): boolean {
  if (!userAgent || isBotUserAgent(userAgent)) return false;
  return /Macintosh/.test(userAgent) && (maxTouchPoints ?? 0) > 1;
}
