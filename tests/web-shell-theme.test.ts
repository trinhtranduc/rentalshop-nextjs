/**
 * #509 light/dark theme: saved choice wins, otherwise the OS; disabled switch = always light.
 */
import { describe, expect, it } from '@jest/globals';
import { parseThemeChoice, resolveTheme, themeBootScript, THEME_STORAGE_KEY } from '../apps/client/lib/theme';

describe('resolveTheme', () => {
  it('follows the OS when nothing is saved', () => {
    expect(resolveTheme(null, true, true)).toBe('dark');
    expect(resolveTheme(null, false, true)).toBe('light');
  });

  it('a saved choice wins over the OS', () => {
    expect(resolveTheme('light', true, true)).toBe('light');
    expect(resolveTheme('dark', false, true)).toBe('dark');
  });

  it('ignores junk in storage', () => {
    expect(resolveTheme('purple', true, true)).toBe('dark');
    expect(parseThemeChoice(undefined)).toBeNull();
  });

  it('is always light while the switch is disabled', () => {
    expect(resolveTheme('dark', true, false)).toBe('light');
  });

  it('boot script reads the same storage key', () => {
    expect(themeBootScript).toContain(THEME_STORAGE_KEY);
    expect(themeBootScript).toContain('data-ar-theme');
  });
});
