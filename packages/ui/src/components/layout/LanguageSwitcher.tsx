'use client'

/**
 * Language Switcher Component
 * 
 * Provides a simple UI to switch between English and Vietnamese.
 * 
 * HOW IT WORKS:
 * 1. User clicks EN or VI button
 * 2. Component sets cookie: NEXT_LOCALE=en or NEXT_LOCALE=vi
 * 3. Component sets localStorage for client-side persistence
 * 4. Page refreshes to apply new locale
 * 5. Server reads cookie and renders with correct locale
 * 
 * WHY USE COOKIE + LOCALSTORAGE?
 * - Cookie: Server can read it for SSR
 * - LocalStorage: Client-side fallback
 * - Both: Ensures consistency
 */

import React, { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@rentalshop/ui/base';
import { Globe } from 'lucide-react';

type SupportedLocale = 'en' | 'vi';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'default' 
}) => {
  const currentLocale = useLocale() as SupportedLocale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (newLocale: SupportedLocale) => {
    if (newLocale === currentLocale) return; // Already selected

    startTransition(() => {
      // Set cookie for server-side access
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      
      // Set localStorage for client-side persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_language_preference', newLocale);
      }
      
      // Refresh the page to apply new locale
      router.refresh();
    });
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant={currentLocale === 'en' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleLanguageChange('en')}
          disabled={isPending}
          className="text-xs px-2 py-1 min-w-[40px]"
        >
          EN
        </Button>
        <Button
          variant={currentLocale === 'vi' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleLanguageChange('vi')}
          disabled={isPending}
          className="text-xs px-2 py-1 min-w-[40px]"
        >
          VI
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-text-tertiary" />
      <Button
        variant={currentLocale === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleLanguageChange('en')}
        disabled={isPending}
        className="min-w-[50px]"
      >
        EN
      </Button>
      <Button
        variant={currentLocale === 'vi' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleLanguageChange('vi')}
        disabled={isPending}
        className="min-w-[50px]"
      >
        VI
      </Button>
      {isPending && (
        <div className="h-4 w-4 border-2 border-action-primary border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}; 