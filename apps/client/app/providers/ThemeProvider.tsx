'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  isThemeSwitchEnabled,
  parseThemeChoice,
  resolveTheme,
  type ThemeName,
} from '../../lib/theme';

/** What the user picked in Cài đặt → Giao diện; `system` = no saved choice, follow the OS. */
export type ThemeChoice = ThemeName | 'system';

interface ThemeContextValue {
  theme: ThemeName;
  choice: ThemeChoice;
  enabled: boolean;
  toggleTheme: () => void;
  setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  choice: 'system',
  enabled: false,
  toggleTheme: () => {},
  setChoice: () => {},
});

function readSaved(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function prefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const enabled = isThemeSwitchEnabled();
  const [theme, setTheme] = useState<ThemeName>('light');
  const [choice, setChoiceState] = useState<ThemeChoice>('system');

  // Sync with what the boot script already applied, then follow the OS until the user picks.
  useEffect(() => {
    if (!enabled) {
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
      return;
    }
    const apply = () => {
      const saved = readSaved();
      const next = resolveTheme(saved, prefersDark(), true);
      document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
      setTheme(next);
      setChoiceState(parseThemeChoice(saved) ?? 'system');
    };
    apply();
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [enabled]);

  const toggleTheme = useCallback(() => {
    if (!enabled) return;
    setTheme((current) => {
      const next: ThemeName = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Private mode: the choice lasts for this page only.
      }
      document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
      setChoiceState(next);
      return next;
    });
  }, [enabled]);

  const setChoice = useCallback(
    (next: ThemeChoice) => {
      if (!enabled) return;
      try {
        if (next === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
        else window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Private mode: the choice lasts for this page only.
      }
      const applied = resolveTheme(next === 'system' ? null : next, prefersDark(), true);
      document.documentElement.setAttribute(THEME_ATTRIBUTE, applied);
      setTheme(applied);
      setChoiceState(next);
    },
    [enabled],
  );

  return <ThemeContext.Provider value={{ theme, choice, enabled, toggleTheme, setChoice }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
