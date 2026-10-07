/**
 * #509 light/dark theme: saved choice wins, otherwise the OS; disabled switch = always light.
 * #528: the switch is on unless NEXT_PUBLIC_ENABLE_THEME_SWITCH is 'false'.
 */
import { describe, expect, it } from '@jest/globals';
import {
  isThemeSwitchEnabledFor,
  parseThemeChoice,
  resolveTheme,
  themeBootScript,
  THEME_STORAGE_KEY,
} from '../apps/client/lib/theme';

describe('isThemeSwitchEnabledFor (#528: on by default)', () => {
  it('is on when the env var is unset or anything but false', () => {
    expect(isThemeSwitchEnabledFor(undefined)).toBe(true);
    expect(isThemeSwitchEnabledFor('')).toBe(true);
    expect(isThemeSwitchEnabledFor('true')).toBe(true);
    expect(isThemeSwitchEnabledFor('1')).toBe(true);
  });

  it('is off only when the env var is false', () => {
    expect(isThemeSwitchEnabledFor('false')).toBe(false);
    expect(isThemeSwitchEnabledFor(' FALSE ')).toBe(false);
  });
});

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
