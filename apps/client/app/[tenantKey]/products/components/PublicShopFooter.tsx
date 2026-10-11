'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export function PublicShopFooter() {
  const t = useTranslations('products.public');
  return (
    <footer className="mt-auto w-full border-t border-slate-200 bg-white px-4 py-[18px] text-center text-[13px] text-slate-600">
      {t('footer')}
    </footer>
  );
}
