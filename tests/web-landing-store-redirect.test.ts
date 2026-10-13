/**
 * #946 landing page `/` on a phone opens the App Store (iPhone/iPad) or Google Play (Android).
 * Desktop, crawlers and link-preview bots keep the page; `?web=1` keeps it and is remembered.
 */
import { describe, expect, it } from '@jest/globals';
import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  WEB_OPT_OUT_COOKIE,
  isBotUserAgent,
  isIpadDesktop,
  isWebOptOut,
  landingStoreRedirect,
} from '../apps/client/lib/store-redirect';

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  ipadMobile:
    'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  androidPhone:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  desktopSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  googlebotSmartphone:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.126 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  bingbotMobile:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  zaloPreview: 'Mozilla/5.0 (compatible; Zalo/1.0; +https://zalo.me)',
  zaloInApp:
    'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Zalo android/12100566 ZaloTheme/light ZaloLanguage/vn',
  whatsapp: 'WhatsApp/2.23.20.0',
  telegram: 'TelegramBot (like TwitterBot)',
  lighthouseMobile:
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
};

const go = (userAgent: string, extra: Partial<Parameters<typeof landingStoreRedirect>[0]> = {}) =>
  landingStoreRedirect({ userAgent, ...extra });

describe('landingStoreRedirect: phones go to their store', () => {
  it('iPhone (Safari and Chrome) → App Store', () => {
    expect(go(UA.iphone)).toBe(APP_STORE_URL);
    expect(go(UA.iphoneChrome)).toBe(APP_STORE_URL);
  });
  it('iPad with a mobile UA → App Store', () => {
    expect(go(UA.ipadMobile)).toBe(APP_STORE_URL);
  });
  it('Android phone and tablet → Google Play', () => {
    expect(go(UA.androidPhone)).toBe(GOOGLE_PLAY_URL);
    expect(go(UA.androidTablet)).toBe(GOOGLE_PLAY_URL);
  });
  it('store URLs are the badge URLs', () => {
    expect(APP_STORE_URL).toBe('https://apps.apple.com/vn/app/anyrent/id6754793592');
    expect(GOOGLE_PLAY_URL).toBe('https://play.google.com/store/apps/details?id=anyrent.shop');
  });
});

describe('landingStoreRedirect: desktop keeps the page', () => {
  it('desktop Chrome and Safari → null', () => {
    expect(go(UA.desktopChrome)).toBeNull();
    expect(go(UA.desktopSafari)).toBeNull();
  });
  it('iPadOS desktop-mode UA cannot be told from a Mac on the server → null', () => {
    expect(go(UA.ipadDesktopMode)).toBeNull();
  });
  it('missing UA → null', () => {
    expect(go('')).toBeNull();
    expect(landingStoreRedirect({ userAgent: null })).toBeNull();
  });
});

describe('landingStoreRedirect: crawlers and link previews are never redirected', () => {
  const bots: Array<keyof typeof UA> = [
    'googlebot',
    'googlebotSmartphone',
    'bingbot',
    'bingbotMobile',
    'facebook',
    'zaloPreview',
    'zaloInApp',
    'whatsapp',
    'telegram',
    'lighthouseMobile',
  ];
  it.each(bots)('%s → null and isBotUserAgent', (name) => {
    expect(isBotUserAgent(UA[name])).toBe(true);
    expect(go(UA[name])).toBeNull();
  });
  it('real browsers are not bots', () => {
    for (const name of ['iphone', 'iphoneChrome', 'androidPhone', 'desktopChrome', 'desktopSafari'] as const) {
      expect(isBotUserAgent(UA[name])).toBe(false);
    }
  });
});

describe('?web=1 keeps the web page and is remembered', () => {
  it('?web=1 on a phone → null', () => {
    expect(go(UA.iphone, { web: '1' })).toBeNull();
    expect(go(UA.androidPhone, { web: '1' })).toBeNull();
  });
  it('remembered cookie on a phone → null', () => {
    expect(go(UA.iphone, { webCookie: '1' })).toBeNull();
    expect(go(UA.androidPhone, { webCookie: '1' })).toBeNull();
  });
  it('other web / cookie values do not opt out', () => {
    expect(isWebOptOut('0', undefined)).toBe(false);
    expect(isWebOptOut(null, '')).toBe(false);
    expect(isWebOptOut('1', undefined)).toBe(true);
    expect(isWebOptOut(undefined, '1')).toBe(true);
    expect(go(UA.iphone, { web: '0' })).toBe(APP_STORE_URL);
  });
  it('cookie name is stable', () => {
    expect(WEB_OPT_OUT_COOKIE).toBe('anyrent_web');
  });
});

describe('isIpadDesktop (client fallback for iPadOS desktop-mode Safari)', () => {
  it('Mac UA with touch points → iPad', () => {
    expect(isIpadDesktop(UA.ipadDesktopMode, 5)).toBe(true);
  });
  it('real Mac (no touch) → not iPad', () => {
    expect(isIpadDesktop(UA.desktopSafari, 0)).toBe(false);
    expect(isIpadDesktop(UA.desktopSafari, undefined)).toBe(false);
  });
  it('Windows touch laptop → not iPad', () => {
    expect(isIpadDesktop(UA.desktopChrome, 10)).toBe(false);
  });
  it('bots with a Mac UA are never treated as iPad', () => {
    expect(isIpadDesktop(`${UA.desktopSafari} (compatible; Googlebot/2.1)`, 5)).toBe(false);
  });
});
