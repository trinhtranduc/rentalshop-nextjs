'use client';

import React from 'react';
import { useCommonTranslations } from '@rentalshop/hooks';
import { useTheme } from '../../providers/ThemeProvider';
import { ICONS, ShellIcon } from './Icon';

export function ThemeSwitch() {
  const { theme, enabled, toggleTheme } = useTheme();
  const t = useCommonTranslations();
  if (!enabled) return null;
  const label = theme === 'dark' ? t('shell.themeToLight') : t('shell.themeToDark');
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary"
    >
      <ShellIcon d={theme === 'dark' ? ICONS.sun : ICONS.moon} />
    </button>
  );
}
