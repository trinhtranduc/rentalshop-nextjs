'use client';

/**
 * Gói dịch vụ (/plans, #582) on the shell tokens. Same flow as before: pick a plan → billing cycle →
 * confirm → `lemonsqueezyApi.createSubscriptionCheckout` → the Lemon Squeezy page. Limits, features,
 * prices and the cycle estimate come from `plans-model.ts`; money reads like Cài đặt → Gói dịch vụ.
 *
 * #1631 With Polar on (`GET /api/polar/offers` enabled): prices are the Polar products' (6 / 12 months), the button
 * follows the API's decision (buy, renew, manage in Polar's portal, renews on a store, bought in the app) and pay opens
 * the Polar checkout. Polar off: the page is as before.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { lemonsqueezyApi, plansApi, polarApi, subscriptionsApi, type PolarOffersResponse } from '@rentalshop/utils';
import type { Plan } from '@rentalshop/types';
import { cardClass, outlineBtn, primaryBtn, Skeleton, type T } from '../orders/list/parts';
import { Modal } from '../orders/create/parts';
import { planLabel } from '../settings/subscription-model';
import {
  BILLING_CYCLES,
  cycleDiscount,
  cycleTotalText,
  isCurrentPlan,
  limitText,
  offerMonthlyText,
  offerPriceText,
  planAction,
  planFeatures,
  planLimits,
  planOffers,
  planPriceText,
  yearSaving,
  type BillingCycle,
  type PolarIntervalKey,
} from './plans-model';

interface CurrentSub {
  planId: number | null;
  planName: string | null;
  dbStatus: string | null;
}

const CHECK = 'M20 6 9 17l-5-5';

function Tick() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-[3px] h-4 w-4 flex-none text-ar-done" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d={CHECK} />
    </svg>
  );
}

export default function PlansPage() {
  const t = useTranslations('plans.web') as unknown as T;
  const tSub = useTranslations('settings.web') as unknown as T;
  const locale = useLocale();
  const n = useCallback((v: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(v), [locale]);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [load, setLoad] = useState<'loading' | 'ok' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState<CurrentSub | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  // #1631 Polar: offers, the chosen cycle, the portal button, the "paid" notice after the checkout
  const [polar, setPolar] = useState<PolarOffersResponse | null>(null);
  const [polarInterval, setPolarInterval] = useState<PolarIntervalKey>('annual');
  const [opening, setOpening] = useState(false);
  const [paidNotice, setPaidNotice] = useState(false);
  const usePolar = !!polar?.enabled;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoad('loading');
        const plansResult = await plansApi.getPlans();
        if (!alive) return;
        if (plansResult.success && plansResult.data) {
          setPlans(plansResult.data.plans || []);
          setLoad('ok');
        } else {
          setLoad('failed');
        }
        // #1631 a failure keeps the old flow (polar stays null)
        const offers = await polarApi.getOffers().catch(() => null);
        if (!alive) return;
        if (offers?.success && offers.data) setPolar(offers.data);
        const sub = await subscriptionsApi.getCurrentUserSubscriptionStatus();
        if (!alive) return;
        if (sub.success && sub.data) {
          const d = sub.data as { planId?: number | null; planName?: string | null; dbStatus?: string | null; status?: string | null };
          setCurrent({ planId: d.planId ?? null, planName: d.planName ?? null, dbStatus: d.dbStatus ?? d.status ?? null });
        }
      } catch (err) {
        // API errors are toasted by useGlobalErrorHandler
        console.error('Error fetching plans:', err);
        if (alive) setLoad((l) => (l === 'loading' ? 'failed' : l));
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt]);

  const sortedPlans = useMemo(
    () => plans.filter((p) => p.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [plans],
  );

  // #1631 back from the Polar checkout: say it is paid, then reload the plan while the webhook lands
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;
    setPaidNotice(true);
    window.history.replaceState(null, '', window.location.pathname);
    const timers = [3000, 8000].map((ms) => window.setTimeout(() => setAttempt((x) => x + 1), ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const openPortal = async () => {
    if (opening) return;
    try {
      setOpening(true);
      const result = await polarApi.createPortal({ returnUrl: `${window.location.origin}/plans` });
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
        return;
      }
    } catch (err) {
      console.error('Error opening the Polar portal:', err);
    }
    setOpening(false);
  };

  const choosePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    if (usePolar) {
      const ok = planOffers(polar?.offers, plan.id).filter((o) => o.decision === 'ok');
      if (ok.length > 0 && !ok.some((o) => o.interval === polarInterval)) setPolarInterval(ok[ok.length - 1].interval);
    }
  };

  const selectedOffer = usePolar && selectedPlan
    ? planOffers(polar?.offers, selectedPlan.id).find((o) => o.interval === polarInterval && o.decision === 'ok') ?? null
    : null;

  const handleConfirmPurchase = async () => {
    if (!selectedPlan || paying) return;
    if (usePolar) {
      if (!selectedOffer) return;
      try {
        setPaying(true);
        const origin = window.location.origin;
        const result = await polarApi.createCheckout({
          planId: selectedPlan.id,
          interval: selectedOffer.interval,
          successUrl: `${origin}/plans?checkout=success`,
          returnUrl: `${origin}/plans`,
        });
        if (result.success && result.data?.url) {
          window.location.href = result.data.url;
          return;
        }
        // Error toasted by useGlobalErrorHandler
        setPaying(false);
      } catch (err) {
        console.error('Error opening the Polar checkout:', err);
        setPaying(false);
      }
      return;
    }
    try {
      setPaying(true);
      const origin = window.location.origin;
      const result = await lemonsqueezyApi.createSubscriptionCheckout({
        planId: selectedPlan.id,
        billingInterval: billingCycle,
        successUrl: `${origin}/plans?checkout=success`,
        cancelUrl: `${origin}/plans?checkout=cancel`,
      });
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
        return;
      }
      // Error automatically handled by useGlobalErrorHandler
      setPaying(false);
    } catch (err) {
      console.error('Error purchasing plan:', err);
      setPaying(false);
    }
  };

  const isTrial = String(current?.dbStatus || '').toUpperCase() === 'TRIAL';

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-bold text-ar-ink">{t('title')}</h1>
        <p className="m-0 text-[15px] text-ar-muted">{t('subtitle')}</p>
      </div>

      {current?.planName && (
        <p className="m-0 rounded-xl border border-ar-line-soft bg-ar-primary-soft px-4 py-3 text-[15px] text-ar-primary-ink">
          {t('currentLine', { plan: planLabel(current.planName, tSub) })}
          {isTrial ? ` ${t('trialNote')}` : ''}
        </p>
      )}

      {paidNotice && (
        <p role="status" className="m-0 rounded-xl border border-ar-line-soft bg-ar-done-bg px-4 py-3 text-[15px] text-ar-done">
          {t('polar.success')}
        </p>
      )}

      {usePolar && polar?.manage && (
        <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
          <p className="m-0 min-w-0 flex-1 text-[15px] text-ar-ink-2">{t('polar.manageHint')}</p>
          <button type="button" onClick={() => void openPortal()} disabled={opening} className={outlineBtn}>
            {opening ? t('redirecting') : t('polar.manage')}
          </button>
        </div>
      )}

      {load === 'loading' && plans.length === 0 ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${cardClass} flex flex-col gap-3 p-5`}>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : load === 'failed' && plans.length === 0 ? (
        <div className={`${cardClass} flex flex-wrap items-center gap-3 p-5`}>
          <p className="m-0 text-[15px] text-ar-danger">{t('loadFailed')}</p>
          <button type="button" onClick={() => setAttempt((x) => x + 1)} className={outlineBtn}>
            {t('retry')}
          </button>
        </div>
      ) : sortedPlans.length === 0 ? (
        <p className={`${cardClass} m-0 px-4 py-6 text-center text-[15px] text-ar-muted`}>{t('empty')}</p>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {sortedPlans.map((plan) => {
            const isCurrent = isCurrentPlan(plan, current?.planId);
            const isSelected = selectedPlan?.id === plan.id;
            const features = planFeatures(plan);
            const limits = planLimits(plan);
            const price = planPriceText(plan, t);
            const free = !(plan.basePrice > 0);
            const offers = usePolar ? planOffers(polar?.offers, plan.id) : [];
            const action = usePolar ? planAction(offers, isCurrent, plan) : null;
            const saving = yearSaving(offers);
            return (
              <li
                key={plan.id}
                className={`${cardClass} flex flex-col overflow-hidden ${isSelected ? 'ring-2 ring-ar-primary' : isCurrent ? 'ring-1 ring-ar-line-strong' : ''}`}
              >
                <div className="flex flex-1 flex-col gap-4 px-5 py-[18px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 text-lg font-bold">{planLabel(plan.name, tSub)}</h2>
                      {isCurrent && <span className="rounded-[7px] bg-ar-done-bg px-2 py-[3px] text-xs font-bold text-ar-done">{t('current')}</span>}
                      {plan.isPopular && <span className="rounded-[7px] bg-ar-reserved-bg px-2 py-[3px] text-xs font-bold text-ar-reserved">{t('popular')}</span>}
                    </div>
                    {plan.description && <p className="m-0 text-sm text-ar-muted">{plan.description}</p>}
                  </div>
                  {offers.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {offers.map((o, i) => (
                        <p key={o.interval} className="m-0 flex flex-wrap items-baseline gap-x-1">
                          <span className={`${i === 0 ? 'text-[28px] leading-9' : 'text-[19px] leading-7'} font-bold tabular-nums`}>{offerPriceText(o)}</span>
                          <span className="text-[15px] text-ar-muted">{t('polar.perMonths', { months: o.months })}</span>
                          {o.months === 12 && saving && (
                            <span className="rounded-[7px] bg-ar-done-bg px-2 py-[2px] text-xs font-bold text-ar-done">{t('polar.saving', { percent: saving })}</span>
                          )}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="m-0 flex flex-wrap items-baseline gap-x-1">
                      <span className="text-[28px] font-bold leading-9 tabular-nums">{price}</span>
                      {!free && <span className="text-[15px] text-ar-muted">{t('perMonth')}</span>}
                    </p>
                  )}

                  {features.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="m-0 text-xs font-bold uppercase tracking-[0.04em] text-ar-muted">{t('features')}</h3>
                      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {features.map((f) => (
                          <li key={f} className="flex gap-2 text-[15px] text-ar-ink-2">
                            <Tick />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {limits.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-ar-line-soft pt-4">
                      <h3 className="m-0 text-xs font-bold uppercase tracking-[0.04em] text-ar-muted">{t('limitsTitle')}</h3>
                      <dl className="m-0 flex flex-col gap-1.5">
                        {limits.map((row) => (
                          <div key={row.key} className="flex items-baseline justify-between gap-3 text-[15px]">
                            <dt className="text-ar-ink-2">{t(`limit.${row.key}`)}</dt>
                            <dd className="m-0 font-semibold tabular-nums">{limitText(row, t, n)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
                <div className={`border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5 ${action === 'none' ? 'hidden' : ''}`}>
                  {action === 'buy' || action === 'renew' ? (
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => choosePlan(plan)}
                      className={`${isSelected || plan.isPopular ? primaryBtn : outlineBtn} w-full`}
                    >
                      {isSelected ? t('chosen') : action === 'renew' ? t('polar.renew') : t('choose')}
                    </button>
                  ) : action === 'manage' ? (
                    <button type="button" onClick={() => void openPortal()} disabled={opening} className={`${outlineBtn} w-full`}>
                      {opening ? t('redirecting') : t('polar.manage')}
                    </button>
                  ) : action === 'current' ? (
                    <button type="button" disabled className={`${outlineBtn} w-full`}>
                      {t('currentButton')}
                    </button>
                  ) : action === 'none' ? null : action ? (
                    <p className="m-0 py-1.5 text-center text-sm font-semibold text-ar-muted">
                      {action === 'store'
                        ? t('polar.renewsInStore')
                        : action === 'app'
                          ? t('polar.inApp')
                          : action === 'contact'
                            ? t('polar.contact')
                            : t('polar.unavailable')}
                    </p>
                  ) : isCurrent ? (
                    <button type="button" disabled className={`${outlineBtn} w-full`}>
                      {t('currentButton')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => choosePlan(plan)}
                      className={`${isSelected || plan.isPopular ? primaryBtn : outlineBtn} w-full`}
                    >
                      {isSelected ? t('chosen') : t('choose')}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedPlan && (
        <section className={`${cardClass} overflow-hidden`} aria-labelledby="plans-selected-title">
          <div className="flex flex-col gap-4 px-5 py-[18px]">
            <h2 id="plans-selected-title" className="m-0 text-lg font-bold">
              {t('selectedTitle', { plan: planLabel(selectedPlan.name, tSub) })}
            </h2>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 p-0 text-sm font-semibold text-ar-ink-2">{t('cycleLabel')}</legend>
              <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                {usePolar && planOffers(polar?.offers, selectedPlan.id).filter((o) => o.decision === 'ok').map((o) => {
                  const on = polarInterval === o.interval;
                  const off = o.months === 12 ? yearSaving(planOffers(polar?.offers, selectedPlan.id)) : null;
                  return (
                    <label
                      key={o.interval}
                      className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border px-4 py-3 ${on ? 'border-ar-primary bg-ar-primary-soft' : 'border-ar-line bg-ar-surface hover:bg-ar-subtle'}`}
                    >
                      <input type="radio" name="billing-cycle" value={o.interval} checked={on} onChange={() => setPolarInterval(o.interval)} className="sr-only" />
                      <span className="flex items-center justify-between gap-2 text-[15px] font-semibold">
                        {t(`polar.cycle.${o.interval}`)}
                        {off && <span className="rounded-[7px] bg-ar-done-bg px-2 py-[2px] text-xs font-bold text-ar-done">{t('polar.saving', { percent: off })}</span>}
                      </span>
                      <span className="text-[15px] tabular-nums text-ar-ink-2">{offerPriceText(o)}</span>
                      <span className="text-sm tabular-nums text-ar-muted">{t('polar.perMonthEach', { price: offerMonthlyText(o) })}</span>
                    </label>
                  );
                })}
                {!usePolar && BILLING_CYCLES.map((cycle) => {
                  const on = billingCycle === cycle;
                  const off = cycleDiscount(cycle);
                  return (
                    <label
                      key={cycle}
                      className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border px-4 py-3 ${on ? 'border-ar-primary bg-ar-primary-soft' : 'border-ar-line bg-ar-surface hover:bg-ar-subtle'}`}
                    >
                      <input type="radio" name="billing-cycle" value={cycle} checked={on} onChange={() => setBillingCycle(cycle)} className="sr-only" />
                      <span className="flex items-center justify-between gap-2 text-[15px] font-semibold">
                        {t(`cycle.${cycle}`)}
                        {off > 0 && <span className="rounded-[7px] bg-ar-done-bg px-2 py-[2px] text-xs font-bold text-ar-done">{t('discount', { percent: off })}</span>}
                      </span>
                      <span className="text-[15px] tabular-nums text-ar-ink-2">{cycleTotalText(selectedPlan, cycle, t)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5">
            <button type="button" onClick={() => setSelectedPlan(null)} className={outlineBtn}>
              {t('cancel')}
            </button>
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={usePolar && !selectedOffer} className={primaryBtn}>
              {t('pay')}
            </button>
          </div>
        </section>
      )}

      <Modal
        open={confirmOpen && !!selectedPlan}
        title={t('confirmTitle')}
        onClose={() => !paying && setConfirmOpen(false)}
        closeLabel={t('close')}
        footer={
          <>
            <button type="button" onClick={() => setConfirmOpen(false)} disabled={paying} className={outlineBtn}>
              {t('cancel')}
            </button>
            <button type="button" onClick={handleConfirmPurchase} disabled={paying} className={primaryBtn}>
              {paying ? t('redirecting') : t('pay')}
            </button>
          </>
        }
      >
        {selectedPlan && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[15px] text-ar-muted">{usePolar ? t('polar.confirmHint') : t('confirmHint')}</p>
            <dl className="m-0 flex flex-col gap-2 rounded-xl bg-ar-surface-muted px-4 py-3">
              <div className="flex justify-between gap-3 text-[15px]">
                <dt className="text-ar-ink-2">{t('plan')}</dt>
                <dd className="m-0 font-semibold">{planLabel(selectedPlan.name, tSub)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-[15px]">
                <dt className="text-ar-ink-2">{t('cycleLabel')}</dt>
                <dd className="m-0 font-semibold">{selectedOffer ? t(`polar.cycle.${selectedOffer.interval}`) : t(`cycle.${billingCycle}`)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-[15px]">
                <dt className="text-ar-ink-2">{t('method')}</dt>
                <dd className="m-0 text-right font-semibold">{usePolar ? t('polar.method') : t('methodLemon')}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-ar-line-soft pt-2 text-[17px]">
                <dt className="font-semibold">{t('total')}</dt>
                <dd className="m-0 font-bold tabular-nums">{selectedOffer ? offerPriceText(selectedOffer) : cycleTotalText(selectedPlan, billingCycle, t)}</dd>
              </div>
            </dl>
            <p className="m-0 text-sm text-ar-muted">
              {usePolar ? t('terms') : `${t('estimateNote')} ${t('terms')}`}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
