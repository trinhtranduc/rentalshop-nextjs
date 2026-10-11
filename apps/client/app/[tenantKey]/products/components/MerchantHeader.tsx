'use client';

import React from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { LanguageSwitcher } from '@rentalshop/ui';
import { useTranslations } from 'next-intl';
import { shopInitials, telLink, zaloLink } from '../lib/public-shop';

export interface PublicOutlet {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
}

interface MerchantHeaderProps {
  merchant: {
    name: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  outlets?: PublicOutlet[];
}

/** #665 — shop name, outlet address and the Gọi / Nhắn Zalo buttons */
export function MerchantHeader({ merchant, outlets = [] }: MerchantHeaderProps) {
  const t = useTranslations('products.public');
  const outlet = outlets[0];
  const phone = outlet?.phone || merchant.phone || null;
  const tel = telLink(phone);
  const zalo = zaloLink(phone);
  const address = [outlet?.address || merchant.address, outlet?.city].filter(Boolean).join(', ');
  const place = [outlet?.name, address].filter(Boolean).join(' · ');

  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-3 sm:items-center px-4 py-4 sm:gap-5 sm:px-5 sm:py-6">
        <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl bg-blue-700 text-xl font-extrabold text-white sm:h-16 sm:w-16 sm:text-2xl">
          {shopInitials(merchant.name)}
        </div>
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{merchant.name}</h1>
            <div className="flex-none sm:hidden">
              <LanguageSwitcher variant="compact" />
            </div>
          </div>
          {place && <p className="mt-1 text-sm text-slate-600">{place}</p>}
          {merchant.description && <p className="mt-0.5 text-sm text-slate-600">{merchant.description}</p>}
        </div>
        {(tel || zalo) && (
          <div className="flex w-full gap-2.5 sm:w-auto">
            {tel && (
              <a
                href={tel}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-200 bg-white px-4 text-[15px] font-bold text-slate-900 hover:bg-slate-50 sm:flex-none"
              >
                <Phone className="h-[18px] w-[18px]" aria-hidden />
                {phone}
              </a>
            )}
            {zalo && (
              <a
                href={zalo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-[15px] font-bold text-white hover:bg-blue-800 sm:flex-none"
              >
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
                {t('zalo')}
              </a>
            )}
          </div>
        )}
        <div className="hidden flex-none sm:block">
          <LanguageSwitcher variant="compact" />
        </div>
      </div>
    </header>
  );
}
