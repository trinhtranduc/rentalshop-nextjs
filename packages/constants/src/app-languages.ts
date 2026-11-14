// ============================================================================
// #1553 / #1554 APP LANGUAGES — the languages of the shop pages (web) and the mobile apps
// ============================================================================

/**
 * One language of the shop pages and the apps. `enabled` is the switch: a language is turned on only when
 * tests/locales-complete.test.ts passes for it (every string on the web, iOS and Android) and the main screens
 * were checked. Until then the shop pages fall back to English for it.
 */
export interface AppLanguage {
  /** BCP 47 code, also the web folder under locales/ */
  code: 'vi' | 'en' | 'ja' | 'ko' | 'zh' | 'zh-TW' | 'fr' | 'de' | 'ru' | 'th' | 'id' | 'es';
  /** Short label of the language switch */
  label: string;
  flag: string;
  /** The language's own name */
  name: string;
  /** Turned on for the app (iOS and Android) */
  enabled: boolean;
  /** Turned on for the shop pages on the web only (#1553 web first) */
  webEnabled: boolean;
  /** locales/<web>/ */
  web: string;
  /** apps/mobile/POS ADBD/<ios>.lproj */
  ios: string;
  /** apps/mobile-android/app/src/main/res/values-<android> ('' = values, the default English) */
  android: string;
}

export const APP_LANGUAGES: readonly AppLanguage[] = [
  { code: 'vi', label: 'VI', flag: '🇻🇳', name: 'Tiếng Việt', enabled: true, webEnabled: true, web: 'vi', ios: 'vi-VN', android: 'vi' },
  { code: 'en', label: 'EN', flag: '🇺🇸', name: 'English', enabled: true, webEnabled: true, web: 'en', ios: 'en', android: '' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', name: '日本語', enabled: false, webEnabled: true, web: 'ja', ios: 'ja', android: 'ja' },
  { code: 'ko', label: '한국어', flag: '🇰🇷', name: '한국어', enabled: false, webEnabled: true, web: 'ko', ios: 'ko', android: 'ko' },
  { code: 'zh', label: '中文', flag: '🇨🇳', name: '中文', enabled: false, webEnabled: true, web: 'zh', ios: 'zh-Hans', android: 'zh' },
  { code: 'zh-TW', label: 'ZH-TW', flag: '🇹🇼', name: '繁體中文', enabled: false, webEnabled: true, web: 'zh-TW', ios: 'zh-Hant', android: 'zh-rTW' },
  { code: 'fr', label: 'FR', flag: '🇫🇷', name: 'Français', enabled: false, webEnabled: true, web: 'fr', ios: 'fr', android: 'fr' },
  { code: 'de', label: 'DE', flag: '🇩🇪', name: 'Deutsch', enabled: false, webEnabled: true, web: 'de', ios: 'de', android: 'de' },
  { code: 'ru', label: 'RU', flag: '🇷🇺', name: 'Русский', enabled: false, webEnabled: true, web: 'ru', ios: 'ru', android: 'ru' },
  { code: 'th', label: 'TH', flag: '🇹🇭', name: 'ไทย', enabled: false, webEnabled: true, web: 'th', ios: 'th', android: 'th' },
  { code: 'id', label: 'ID', flag: '🇮🇩', name: 'Bahasa Indonesia', enabled: false, webEnabled: true, web: 'id', ios: 'id', android: 'in' },
  { code: 'es', label: 'ES', flag: '🇪🇸', name: 'Español', enabled: false, webEnabled: true, web: 'es', ios: 'es', android: 'es' },
];

/** The languages that are on, in list order (Tiếng Việt first) */
export function enabledAppLanguages(): AppLanguage[] {
  return APP_LANGUAGES.filter((l) => l.enabled);
}

/** The languages the shop pages (web) list in the language switch */
export function webLanguages(): AppLanguage[] {
  return APP_LANGUAGES.filter((l) => l.webEnabled);
}

export function isEnabledAppLanguage(code: unknown): boolean {
  return typeof code === 'string' && APP_LANGUAGES.some((l) => l.enabled && l.code === code);
}
