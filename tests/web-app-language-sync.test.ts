/**
 * #1627 the logged-in web speaks the language saved in Settings (`NEXT_LOCALE`). A tab that came in from the landing
 * page (`/en`, client navigation to log in) shows the landing language: none saved → save it, so a new tab and F5 keep
 * it; saved and different → refresh into the saved one. Spec .agent/changes/1627-portal-products-return-language (6).
 */
import { describe, expect, it } from '@jest/globals';
import { PUBLIC_LOCALES } from '../packages/constants/src';
import { APP_LOCALES, appLanguageSync } from '../apps/client/lib/public-content/shop-locale';

describe('#1627 appLanguageSync', () => {
  it('came in from /en with nothing saved: save en, no refresh', () => {
    expect(appLanguageSync('en', undefined)).toEqual({ save: 'en', refresh: false });
    expect(appLanguageSync('en', null)).toEqual({ save: 'en', refresh: false });
    expect(appLanguageSync('vi', '')).toEqual({ save: 'vi', refresh: false });
  });

  it('a value that is not a language counts as nothing saved', () => {
    expect(appLanguageSync('en', 'xx')).toEqual({ save: 'en', refresh: false });
  });

  it('saved and shown agree: nothing to do', () => {
    expect(appLanguageSync('en', 'en')).toEqual({ refresh: false });
    expect(appLanguageSync('vi', 'vi')).toEqual({ refresh: false });
  });

  it('saved Vietnamese, came in from the English landing: refresh into Vietnamese, keep the saved choice', () => {
    expect(appLanguageSync('en', 'vi')).toEqual({ refresh: true });
    expect(appLanguageSync('vi', 'en')).toEqual({ refresh: true });
  });

  it('a landing language the app does not speak: save and show its app language', () => {
    const publicOnly = (PUBLIC_LOCALES as readonly string[]).find((l) => !(APP_LOCALES as readonly string[]).includes(l));
    if (!publicOnly) return; // every public language is on for the web
    expect(appLanguageSync(publicOnly, undefined)).toEqual({ save: 'en', refresh: true });
    expect(appLanguageSync('en', publicOnly)).toEqual({ refresh: false });
  });
});
