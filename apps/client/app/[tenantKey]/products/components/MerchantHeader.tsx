'use client';

import React from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { LanguageSwitcher } from '@rentalshop/ui';
import { OUTLET_LINK_BRAND_NAMES } from '@rentalshop/utils';
import { useLocale, useTranslations } from 'next-intl';
import { isPublicLocale } from '@rentalshop/constants';
import { shopInitials, telLink, zaloLink } from '../lib/public-shop';
import { showsOutletPicker, showsPhoneZaloButton, type PickerOutlet } from '../lib/outlet-picker';
import { LinkIcon } from './LinkIcon';

export type PublicOutlet = PickerOutlet;

interface MerchantHeaderProps {
  merchant: {
    name: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  /** Active branches, the main one first (#1643) */
  outlets?: PublicOutlet[];
  /** The branch shown (#1643); the picker appears from 2 branches */
  selected?: PublicOutlet;
  onSelect?: (outlet: PublicOutlet) => void;
}

/** #1146: the 12 public languages; the choice (NEXT_PUBLIC_LOCALE) reloads the same shop page */
const samePage = () => `${window.location.pathname}${window.location.search}`;

/** #665 — shop name, outlet address and the Gọi / Nhắn Zalo buttons */
export function MerchantHeader({ merchant, outlets = [], selected, onSelect }: MerchantHeaderProps) {
  const t = useTranslations('products.public');
  const current = useLocale();
  const locale = isPublicLocale(current) ? current : 'vi';
  const outlet = selected ?? outlets[0];
  const many = showsOutletPicker(outlets);
  const links = outlet?.links ?? [];
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
              <LanguageSwitcher variant="compact" publicLocale={locale} publicPath={samePage} />
            </div>
          </div>
          {many && (
            <div role="group" aria-label={t('outlets')} className="mt-2 flex flex-wrap gap-1.5" data-shop-outlet-picker>
              {outlets.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={o.id === outlet?.id}
                  onClick={() => onSelect?.(o)}
                  className={`rounded-full border-[1.5px] px-3 py-1 text-[13px] font-semibold ${
                    o.id === outlet?.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {o.name}
                  {o.isDefault ? ` · ${t('mainOutlet')}` : ''}
                </button>
              ))}
            </div>
          )}
          {place && <p className="mt-1 text-sm text-slate-600">{place}</p>}
          {merchant.description && <p className="mt-0.5 text-sm text-slate-600">{merchant.description}</p>}
          {links.length > 0 && (
            <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-2 p-0" aria-label={t('links')} data-shop-links>
              {links.map((link) => (
                <li key={`${link.type}-${link.url}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[34px] items-center gap-1.5 rounded-full border-[1.5px] border-slate-200 bg-white pl-2 pr-3 text-[13px] font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    <LinkIcon type={link.type} />
                    {link.type === 'other' && link.label ? link.label : OUTLET_LINK_BRAND_NAMES[link.type] ?? t(`linkTypes.${link.type}`)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {(tel || (zalo && showsPhoneZaloButton(outlet))) && (
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
            {zalo && showsPhoneZaloButton(outlet) && (
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
          <LanguageSwitcher variant="compact" publicLocale={locale} publicPath={samePage} />
        </div>
      </div>
    </header>
  );
}
