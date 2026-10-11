'use client';

import React from 'react';
import { useAdminTheme } from './useAdminTheme';
import { ICONS, ShellIcon } from './Icon';

export function AdminThemeSwitch() {
  const { theme, toggleTheme } = useAdminTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary lg:h-10 lg:w-10"
    >
      <ShellIcon d={theme === 'dark' ? ICONS.sun : ICONS.moon} />
    </button>
  );
}
