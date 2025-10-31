import { defaultLocale, type Locale, isValidLocale } from '../i18n';

const LOCALE_STORAGE_KEY = 'user_language_preference';

/**
 * Get the user's preferred locale from localStorage
 * Falls back to default locale (Vietnamese) if not set or invalid
 * ✅ Vietnamese as default for Vietnam market
 */
export function getUserLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale; // 'vi' for Vietnam market
  }

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isValidLocale(stored)) {
      return stored;
    }
  } catch (error) {
    console.error('Error reading locale from localStorage:', error);
  }

  return defaultLocale; // 'vi' for Vietnam market
}

/**
 * Set the user's preferred locale in localStorage
 */
export function setUserLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    
    // Set cookie for server-side access
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
  } catch (error) {
    console.error('Error saving locale to localStorage:', error);
  }
}

/**
 * Get locale from cookie (server-side)
 */
export function getLocaleFromCookie(cookieHeader?: string): Locale {
  if (!cookieHeader) {
    return defaultLocale;
  }

  const match = cookieHeader.match(/NEXT_LOCALE=([^;]+)/);
  const locale = match?.[1];

  if (locale && isValidLocale(locale)) {
    return locale;
  }

  return defaultLocale;
}

