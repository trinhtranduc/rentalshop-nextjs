'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { appLanguageSync } from '../../lib/public-content/shop-locale';

function savedLanguage(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * #1627 Keeps the logged-in pages in one language across tabs. Coming in from the landing page (`/en` → log in) is a
 * client navigation, so the tab keeps the landing language while the server renders new tabs from `NEXT_LOCALE`.
 * None saved → save the shown language; saved and different → refresh once into the saved one. Renders nothing;
 * mount it on logged-in, non-public pages only (a public page's language comes from its URL).
 */
export function AppLanguageSync() {
  const shown = useLocale();
  const router = useRouter();
  const refreshed = useRef(false);
  useEffect(() => {
    const step = appLanguageSync(shown, savedLanguage());
    if (step.save) document.cookie = `NEXT_LOCALE=${step.save};path=/;max-age=31536000;SameSite=Lax`;
    if (step.refresh && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [shown, router]);
  return null;
}
