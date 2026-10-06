/**
 * Light / dark theme for the signed-in shop app (#509).
 *
 * The choice is stored in localStorage and mirrored on <html data-ar-theme>.
 * Only elements inside `.ar-theme` read the dark tokens (see globals.css), so
 * public pages stay light whatever the visitor picked.
 */

export type ThemeName = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'anyrent-theme';
export const THEME_ATTRIBUTE = 'data-ar-theme';

/** The switch ships hidden until every page is redrawn for dark mode. */
export const isThemeSwitchEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_ENABLE_THEME_SWITCH === 'true';

export function parseThemeChoice(value: unknown): ThemeName | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * The theme to show: a saved choice wins, otherwise the OS preference.
 * When the switch is disabled the app is always light.
 */
export function resolveTheme(saved: unknown, prefersDark: boolean, enabled: boolean): ThemeName {
  if (!enabled) return 'light';
  return parseThemeChoice(saved) ?? (prefersDark ? 'dark' : 'light');
}

/** Runs in <head> before first paint so a dark user never sees a light flash. */
export const themeBootScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=s==='light'||s==='dark'?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('${THEME_ATTRIBUTE}',t);}catch(e){}})();`;
