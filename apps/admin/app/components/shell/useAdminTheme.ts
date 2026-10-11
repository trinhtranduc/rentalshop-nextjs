'use client';

import { useCallback, useEffect, useState } from 'react';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY, resolveTheme, type ThemeName } from './theme';

function readSaved(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

const prefersDark = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Current theme plus a toggle that persists the choice and updates <html data-ar-theme>. */
export function useAdminTheme() {
  const [theme, setTheme] = useState<ThemeName>('light');

  useEffect(() => {
    const next = resolveTheme(readSaved(), prefersDark());
    document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
    setTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeName = document.documentElement.getAttribute(THEME_ATTRIBUTE) === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
    document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
    setTheme(next);
  }, []);

  return { theme, toggleTheme };
}
