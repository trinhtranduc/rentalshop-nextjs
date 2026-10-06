'use client';

/**
 * Shop web auth helper pages (#582) on the dotted 4A look of /login and /register (#510).
 * `ShopAuthPage` / `ShopAuthHeading` come from @rentalshop/ui; the field and button classes there are
 * not exported, so the same values live here. Light only, like /login.
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShopAuthPage } from '@rentalshop/ui';

const fieldBase =
  'h-[52px] w-full rounded-xl border bg-white pl-11 pr-3.5 text-base text-slate-900 placeholder:text-slate-400 ' +
  'focus:outline-none focus:border-[1.5px] focus:ring-[3px] focus-visible:ring-[3px] focus-visible:ring-offset-0';

/** One border set at a time; stacking both lets CSS order pick the colour. */
export function authFieldClass(invalid = false): string {
  return invalid
    ? `${fieldBase} border-red-600 focus:border-red-600 focus:ring-red-100 focus-visible:ring-red-100`
    : `${fieldBase} border-slate-300 focus:border-blue-700 focus:ring-blue-100 focus-visible:ring-blue-100`;
}

export const authLabelClass = 'text-[15px] font-semibold text-slate-900';
export const authIconClass = 'pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500';
export const authPrimaryBtn =
  'inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-blue-700 px-4 text-base font-bold text-white no-underline shadow-[0_6px_16px_rgba(29,78,216,0.25)] hover:bg-blue-800 disabled:opacity-60';
export const authOutlineBtn =
  'inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900 no-underline hover:bg-slate-50 disabled:opacity-60';
export const authLinkBtn = 'inline-flex items-center justify-center gap-1.5 py-1 text-[15px] font-semibold text-blue-700 hover:text-blue-800';

/** The /login page frame: dotted background, brand mark, terms · privacy · language footer. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useTranslations('auth');
  return (
    <ShopAuthPage termsLabel={t('termsOfService')} privacyLabel={t('privacyPolicy')} onNavigate={(path: string) => router.push(path)}>
      {children}
    </ShopAuthPage>
  );
}

export function AuthSpinner({ light = true }: { light?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`h-5 w-5 animate-spin rounded-full border-2 ${light ? 'border-white/40 border-t-white' : 'border-blue-200 border-t-blue-700'}`}
    />
  );
}

type Tone = 'error' | 'info' | 'warn' | 'success';
const NOTICE: Record<Tone, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-100 bg-blue-50 text-blue-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  success: 'border-green-200 bg-green-50 text-green-800',
};

export function AuthNotice({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={`rounded-xl border px-3.5 py-3 text-[15px] leading-6 ${NOTICE[tone]}`}>
      {children}
    </div>
  );
}

const BADGE: Record<'success' | 'error' | 'info', string> = {
  success: 'bg-green-50 text-green-700',
  error: 'bg-red-50 text-red-600',
  info: 'bg-blue-50 text-blue-700',
};
const BADGE_ICON: Record<'success' | 'error' | 'info', string> = {
  success: 'M20 6 9 17l-5-5',
  error: 'M18 6 6 18M6 6l12 12',
  info: 'M4 6h16v12H4zM4 7l8 6 8-6',
};

/** Round state badge above a heading: tick, cross or envelope. */
export function AuthBadge({ tone }: { tone: 'success' | 'error' | 'info' }) {
  return (
    <span aria-hidden="true" className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${BADGE[tone]}`}>
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={BADGE_ICON[tone]} />
      </svg>
    </span>
  );
}
