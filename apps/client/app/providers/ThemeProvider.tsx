'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  isThemeSwitchEnabled,
  resolveTheme,
  type ThemeName,
} from '../../lib/theme';

interface ThemeContextValue {
  theme: ThemeName;
  enabled: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  enabled: false,
  toggleTheme: () => {},
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

  // Sync with what the boot script already applied, then follow the OS until the user picks.
  useEffect(() => {
    if (!enabled) {
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
      return;
    }
    const apply = () => {
      const next = resolveTheme(readSaved(), prefersDark(), true);
      document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
      setTheme(next);
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
      return next;
    });
  }, [enabled]);

  return <ThemeContext.Provider value={{ theme, enabled, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
