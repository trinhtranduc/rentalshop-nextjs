/**
 * Light / dark theme for the admin shell (#804). Same mechanism as the shop portal: the choice lives in
 * localStorage and is mirrored on <html data-ar-theme>; only `.ar-theme` reads the dark tokens.
 */
export type ThemeName = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'anyrent-admin-theme';
export const THEME_ATTRIBUTE = 'data-ar-theme';

export function parseThemeChoice(value: unknown): ThemeName | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/** A saved choice wins, otherwise the OS preference. */
export function resolveTheme(saved: unknown, prefersDark: boolean): ThemeName {
  return parseThemeChoice(saved) ?? (prefersDark ? 'dark' : 'light');
}

/** Runs in <head> before first paint so a dark user never sees a light flash. */
export const themeBootScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=s==='light'||s==='dark'?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('${THEME_ATTRIBUTE}',t);}catch(e){}})();`;
