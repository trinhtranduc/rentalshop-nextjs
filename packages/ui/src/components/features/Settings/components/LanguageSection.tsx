'use client';

import React, { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Button } from '../../../ui/button';
import { Languages, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSettingsTranslations } from '@rentalshop/hooks';
import { useCurrency } from '@rentalshop/ui';

// Language options with flags
const languages = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
] as const;

/**
 * LanguageSection Component
 * 
 * Allows users to change their preferred language.
 * Language preference is stored in localStorage and cookie for persistence.
 */
export function LanguageSection() {
  const t = useSettingsTranslations();
  const currentLocale = useLocale();
  const router = useRouter();
  const currencyContext = useCurrency();
  const [isPending, startTransition] = useTransition();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLocale);

  const handleLanguageChange = (newLocale: string) => {
    setSelectedLanguage(newLocale);
    
    startTransition(() => {
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_language_preference', newLocale);
        
        // Set cookie for server-side access
        document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
        
        // Auto-set currency based on language
        const newCurrency = newLocale === 'vi' ? 'VND' : 'USD';
        currencyContext.setCurrency(newCurrency);
        
        // Also save to localStorage for persistence
        localStorage.setItem('rentalshop-currency', newCurrency);
      }
      
      // Refresh the page to apply new locale
      router.refresh();
    });
  };

  const currentLanguage = languages.find(lang => lang.value === currentLocale);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-action-primary" />
          <CardTitle>{t('language.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('language.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            {t('language.currentLanguage')}
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg">
            <span className="text-2xl">{currentLanguage?.flag}</span>
            <span className="text-text-primary font-medium">{currentLanguage?.label}</span>
            <Check className="h-4 w-4 text-action-success ml-auto" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            {t('language.selectLanguage')}
          </label>
          <Select
            value={selectedLanguage}
            onValueChange={handleLanguageChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('language.selectALanguage')} />
            </SelectTrigger>
            <SelectContent>
              {languages.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{language.flag}</span>
                    <span>{language.label}</span>
                    {language.value === currentLocale && (
                      <Check className="h-4 w-4 text-action-success ml-2" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <div className="h-4 w-4 border-2 border-action-primary border-t-transparent rounded-full animate-spin" />
            <span>{t('language.applyingChanges')}</span>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-text-secondary">
            ℹ️ {t('language.languagePreferenceSaved')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

