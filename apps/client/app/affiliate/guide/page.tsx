'use client';

/**
 * /affiliate/guide (#582): public page (PUBLIC_ROUTES, outside the shell) on the landing look. A signed-in
 * shop with a referral code (referralLink, else tenantKey) also sees its sign-up link with Copy.
 * `examples.note` carries <strong>, so it renders with `t.rich` (was an IntlError).
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, CheckCircle, Copy, DollarSign, Link2, Share2, TrendingUp, Users } from 'lucide-react';
import { useToast } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import PublicSiteHeader from '../../components/PublicSiteHeader';
import PublicSiteFooter from '../../components/PublicSiteFooter';
import { moneyText } from '../../settings/subscription-model';

const card = 'rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8';
const iconBox = 'flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sky-50 text-sky-800';

const EXAMPLES = [
  { key: 'example1', price: 1_000_000 },
  { key: 'example2', price: 5_000_000 },
] as const;
const COMMISSION = 0.1;

export default function AffiliateGuidePage() {
  const { toastSuccess } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const t = useTranslations('affiliate.guide');

  // Referral code: merchant (or the outlet's merchant) referralLink, else its tenantKey
  const merchantRef = user?.merchant as { referralLink?: string; tenantKey?: string } | undefined;
  const outletMerchantRef = user?.outlet?.merchant as { referralLink?: string; tenantKey?: string } | undefined;
  const referralCode = merchantRef?.referralLink || merchantRef?.tenantKey || outletMerchantRef?.referralLink || outletMerchantRef?.tenantKey;

  const registrationLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_CLIENT_URL || 'https://dev.anyrent.shop'}/register?referralCode=${referralCode}`
    : null;

  const handleCopyLink = async () => {
    if (!registrationLink) return;
    try {
      await navigator.clipboard.writeText(registrationLink);
      setCopied(true);
      toastSuccess(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const overview = [
    { icon: DollarSign, value: '10%', label: t('overview.commission') },
    { icon: TrendingUp, value: t('overview.autoPayment'), label: t('overview.payment') },
    { icon: Users, value: t('overview.unlimitedLabel'), label: t('overview.unlimited') },
  ];
  const details = [
    { key: 'rate', badge: '10%' },
    { key: 'payment', badge: t('overview.autoPayment') },
    { key: 'tracking', badge: t('commissionDetails.tracking.badge') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
      <PublicSiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p className="mb-3 text-sm font-medium text-sky-700">{t('eyebrow')}</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">{t('subtitle')}</p>

        {user && registrationLink && (
          <section className="mt-10 rounded-2xl border border-sky-100 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={iconBox}>
                <Share2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">{t('yourLink')}</h2>
                <p className="text-sm text-slate-600">{t('linkHint')}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                <Link2 aria-hidden="true" className="h-4 w-4 flex-none text-sky-700" />
                <span className="min-w-0 break-all font-mono text-sm text-slate-800">{registrationLink}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-[15px] font-semibold ${
                  copied ? 'border border-green-200 bg-green-50 text-green-700' : 'bg-blue-700 text-white hover:bg-blue-800'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t('copied') : t('copy')}
              </button>
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {overview.map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className={iconBox}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-1 text-sm text-slate-600">{label}</p>
            </div>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('howItWorks.title')}</h2>
          <ol className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-3">
            {(['step1', 'step2', 'step3'] as const).map((step, i) => (
              <li key={step} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-[15px] font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 font-semibold text-slate-900">{t(`howItWorks.${step}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(`howItWorks.${step}.description`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${card} mt-14`}>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('commissionDetails.title')}</h2>
          <ul className="mt-6 flex list-none flex-col gap-3 p-0">
            {details.map(({ key, badge }) => (
              <li key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">{t(`commissionDetails.${key}.label`)}</span>
                  <span className="whitespace-nowrap rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-800">{badge}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-600">{t(`commissionDetails.${key}.description`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('examples.title')}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {EXAMPLES.map(({ key, price }) => (
              <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle aria-hidden="true" className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-slate-900">{t(`examples.${key}.title`)}</span>
                </div>
                <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-600">{t(`examples.${key}.label1`)}</dt>
                    <dd className="m-0 font-medium tabular-nums text-slate-900">{moneyText(price, 'VND')}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-600">{t(`examples.${key}.label2`)}</dt>
                    <dd className="m-0 text-blue-700">{t(`examples.${key}.confirmed`)}</dd>
                  </div>
                  <div className="mt-1 flex justify-between gap-3 border-t border-slate-200 pt-2">
                    <dt className="text-slate-600">{t(`examples.${key}.label3`)}</dt>
                    <dd className="m-0 font-bold tabular-nums text-green-700">{moneyText(price * COMMISSION, 'VND')}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-relaxed text-slate-700">
            {t.rich('examples.note', { strong: (chunks) => <strong className="font-semibold text-slate-900">{chunks}</strong> })}
          </p>
        </section>

        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('tips.title')}</h2>
          <ul className="mt-6 grid list-none gap-5 p-0 md:grid-cols-2">
            {(['tip1', 'tip2', 'tip3', 'tip4'] as const).map((tip) => (
              <li key={tip} className="flex gap-3">
                <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-none text-green-600" />
                <div>
                  <h3 className="font-semibold text-slate-900">{t(`tips.${tip}.title`)}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t(`tips.${tip}.description`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {!user && (
          <section className="mt-10 rounded-2xl border border-sky-100 bg-white/90 p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{t('cta.title')}</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-600">{t('cta.description')}</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-[15px] font-semibold text-white shadow-sm hover:bg-blue-800"
              >
                {t('cta.register')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-[15px] font-semibold text-slate-800 hover:bg-slate-50"
              >
                {t('cta.login')}
              </Link>
            </div>
          </section>
        )}
      </main>

      <PublicSiteFooter />
    </div>
  );
}
