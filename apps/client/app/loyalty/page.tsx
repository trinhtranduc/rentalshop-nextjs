'use client';

/**
 * Khách thân thiết (#546) on the shop shell, laid out like Cài đặt (tab list left, one card right).
 * It replaces the shared `LoyaltySettings` for the shop web (that component put a Badge `<div>` inside
 * a `<p>`, a hydration error, and used light-only colours). Same calls and rules: loyaltyApi.getProgram,
 * getTiers, upsertProgram (never `isActive`, Super Admin only), createTier, updateTier, deleteTier;
 * the inputs lock exactly where they locked before (`locks` in loyalty-model).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { loyaltyApi } from '@rentalshop/utils';
import type { LoyaltyProgram, LoyaltyTier } from '@rentalshop/types';
import { Skeleton, cardClass, outlineBtn, primaryBtn, type T } from '../orders/list/parts';
import { Modal, fieldClass } from '../orders/create/parts';
import { SectionCard } from '../settings/sections';
import {
  DEFAULT_PROGRAM,
  LOYALTY_SECTIONS,
  TIER_EMOJI,
  TIER_PRESETS,
  accessFrom,
  formatThousands,
  locks,
  parseDigits,
  parseSection,
  presetRow,
  presetTierPayload,
  programPayload,
  sortTiers,
  tierPayload,
  toEditableTier,
  type AccessState,
  type EditableTier,
  type LoyaltySection,
  type ProgramState,
  type TierPreset,
} from './loyalty-model';

const dangerBtn =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[10px] bg-ar-danger px-3.5 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50';
const smallBtn =
  'inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle disabled:opacity-50';
const labelClass = 'flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-ar-ink-2';
const inputClass = `${fieldClass} font-normal disabled:cursor-not-allowed disabled:bg-ar-surface-muted disabled:text-ar-muted`;
const tierInput =
  'h-9 rounded-xl border border-ar-line-strong bg-ar-surface px-3 text-sm text-ar-ink tabular-nums focus:border-ar-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-ar-surface-muted disabled:text-ar-muted';
const noteClass = 'm-0 flex flex-col gap-1 rounded-xl bg-ar-subtle px-3.5 py-2.5 text-sm text-ar-ink-2';

function Toggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-ar-primary' : 'bg-ar-line-strong'
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

function OnOffTag({ on, t }: { on: boolean; t: T }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-[7px] px-2 py-[2px] text-xs font-bold ${on ? 'bg-ar-done-bg text-ar-done' : 'bg-ar-cancelled-bg text-ar-cancelled'}`}>
      {on ? t('earn.on') : t('earn.off')}
    </span>
  );
}

function StatusTag({ access, active, t }: { access: AccessState; active: boolean; t: T }) {
  const [cls, text] =
    access === 'unavailable'
      ? ['bg-ar-late-bg text-ar-late', t('status.locked')]
      : active
        ? ['bg-ar-done-bg text-ar-done', t('status.active')]
        : ['bg-ar-unprepared-bg text-ar-unprepared', t('status.inactive')];
  return <span className={`inline-block whitespace-nowrap rounded-[7px] px-2 py-[3px] text-sm font-bold ${cls}`}>{text}</span>;
}

export default function LoyaltyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('settings.web.loyalty') as unknown as T;
  const { toastSuccess, toastError, toastWarning } = useToast();

  const [program, setProgram] = useState<ProgramState>(DEFAULT_PROGRAM);
  const [tiers, setTiers] = useState<EditableTier[]>([]);
  const [access, setAccess] = useState<AccessState>('loading');
  const [loading, setLoading] = useState(true);
  const [savingProgram, setSavingProgram] = useState(false);
  const [creatingTier, setCreatingTier] = useState(false);
  const [savingTierIds, setSavingTierIds] = useState<number[]>([]);
  const [deletingTierId, setDeletingTierId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EditableTier | null>(null);

  const { section, fixUrl } = parseSection(searchParams.get('tab'));
  useEffect(() => {
    if (fixUrl) router.replace('/loyalty?tab=overview');
  }, [fixUrl, router]);

  const load = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const [programRes, tiersRes] = await Promise.all([loyaltyApi.getProgram(), loyaltyApi.getTiers()]);
      const next = accessFrom(programRes as { success?: boolean; code?: string; data?: ProgramState | null });
      setProgram(next.program);
      setAccess(next.access);
      setTiers(tiersRes.success && tiersRes.data ? sortTiers(tiersRes.data.map((tier) => toEditableTier(tier))) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = <K extends keyof ProgramState>(key: K, value: ProgramState[K]) => setProgram((p) => ({ ...p, [key]: value }));
  const setTierField = <K extends keyof EditableTier>(id: number, key: K, value: EditableTier[K]) =>
    setTiers((list) => list.map((tier) => (tier.id === id ? { ...tier, [key]: value } : tier)));
  const go = (next: LoyaltySection) => router.push(`/loyalty?tab=${next}`);

  const unavailable = access === 'unavailable';
  const active = !unavailable && !!program.isActive;
  const inactive = access === 'inactive' || (!program.isActive && !unavailable);
  const lock = locks(program, active);

  const saveProgram = async () => {
    setSavingProgram(true);
    try {
      const res = await loyaltyApi.upsertProgram(programPayload(program) as Partial<LoyaltyProgram> & { name: string });
      if (!res.success) {
        toastError(t('toast.saveFailed'), res.message || res.error);
        return;
      }
      const next = accessFrom({ success: true, data: (res.data as ProgramState | undefined) || { ...program, ...programPayload(program) } });
      setProgram(next.program);
      setAccess(next.access);
      toastSuccess(t('toast.saved'), t('toast.savedBody'));
    } catch {
      toastError(t('toast.saveFailed'), t('toast.saveError'));
    } finally {
      setSavingProgram(false);
    }
  };

  const addPreset = async (preset: TierPreset) => {
    if (!program.id) {
      toastWarning(t('toast.saveFirst'), t('toast.saveFirstBody'));
      return;
    }
    setCreatingTier(true);
    try {
      const res = await loyaltyApi.createTier(presetTierPayload(preset) as Omit<LoyaltyTier, 'id' | 'programId' | 'createdAt' | 'updatedAt'>);
      if (!res.success || !res.data) {
        toastError(t('toast.tierAddFailed'), res.message || res.error);
        return;
      }
      const created = res.data;
      setTiers((list) => sortTiers([...list, toEditableTier(created)]));
      toastSuccess(t('toast.tierAdded', { name: preset.name }), '');
    } catch {
      toastError(t('toast.tierAddFailed'), t('toast.error'));
    } finally {
      setCreatingTier(false);
    }
  };

  const saveTier = async (id: number) => {
    const tier = tiers.find((x) => x.id === id);
    if (!tier) return;
    setSavingTierIds((ids) => [...ids, id]);
    try {
      const res = await loyaltyApi.updateTier(id, tierPayload(tier) as Partial<LoyaltyTier>);
      if (!res.success || !res.data) {
        toastError(t('toast.tierSaveFailed', { name: tier.name }), res.message || res.error);
        return;
      }
      const saved = res.data;
      setTiers((list) => sortTiers(list.map((x) => (x.id === id ? toEditableTier(saved) : x))));
      toastSuccess(t('toast.tierSaved'), t('toast.tierSavedBody', { name: tier.name }));
    } catch {
      toastError(t('toast.tierSaveFailed', { name: tier.name }), t('toast.tierSaveError'));
    } finally {
      setSavingTierIds((ids) => ids.filter((x) => x !== id));
    }
  };

  const deleteTier = async () => {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    setDeletingTierId(id);
    try {
      const res = await loyaltyApi.deleteTier(id);
      if (!res.success) {
        toastError(t('toast.tierDeleteFailed', { name }), res.message || res.error);
        return;
      }
      setTiers((list) => list.filter((x) => x.id !== id));
      toastSuccess(t('toast.tierDeleted'), t('toast.tierDeletedBody', { name }));
      await load(false);
    } catch {
      toastError(t('toast.tierDeleteFailed', { name }), t('toast.tierDeleteError'));
    } finally {
      setDeletingTierId(null);
      setPendingDelete(null);
    }
  };

  // ------------------------------------------------------------------ pieces
  const select = <V extends string>(label: string, value: V, options: Array<[V, string]>, onChange: (v: V) => void, disabled = false, className = '') => (
    <label className={`${labelClass} ${className}`}>
      {label}
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as V)} className={`${inputClass} cursor-pointer pr-8`}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  const numberField = (label: string, value: number | null | undefined, onChange: (n: number) => void, opts: { disabled?: boolean; min?: number; max?: number; hint?: string } = {}) => (
    <label className={labelClass}>
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={opts.min ?? 1}
        max={opts.max}
        value={value ?? ''}
        disabled={opts.disabled}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className={inputClass}
      />
      {opts.hint && <span className="text-xs font-normal text-ar-muted">{opts.hint}</span>}
    </label>
  );
  const moneyField = (label: string, value: number | null | undefined, onChange: (n: number) => void, disabled: boolean) => (
    <label className={labelClass}>
      {label}
      <input type="text" inputMode="numeric" value={formatThousands(value)} disabled={disabled} onChange={(e) => onChange(parseDigits(e.target.value))} className={`${inputClass} tabular-nums`} />
    </label>
  );
  const switchRow = (title: string, hint: string, checked: boolean, onChange: (v: boolean) => void, disabled: boolean, tag?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ar-ink">
          {title}
          {tag}
        </span>
        <span className="text-sm text-ar-muted">{hint}</span>
      </div>
      <Toggle checked={checked} disabled={disabled} label={title} onChange={onChange} />
    </div>
  );

  const overview = () => (
    <SectionCard title={t('overview.title')} action={<StatusTag access={access} active={active} t={t} />}>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">{t('overview.statusLabel')}</span>
        <span className="text-sm text-ar-ink-2">{active ? t('overview.activeText') : t('overview.inactiveText')}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 border-t border-ar-subtle pt-4 md:grid-cols-3">
        {select(t('overview.metric'), program.tierMetric || 'total_spend', [['total_spend', t('overview.metricSpend')], ['total_orders', t('overview.metricOrders')]], (v) => setField('tierMetric', v), lock.overview)}
        {select(t('overview.period'), program.tierPeriod || 'lifetime', [['lifetime', t('overview.lifetime')], ['yearly', t('overview.yearly')]], (v) => setField('tierPeriod', v), lock.overview)}
        {select(
          t('overview.downgrade'),
          program.tierDowngrade || 'never',
          [
            ['never', t('overview.never')],
            ['immediate', t('overview.immediate')],
            ['grace_30d', t('overview.grace')],
          ],
          (v) => setField('tierDowngrade', v),
          lock.overview,
        )}
      </div>
      <p className="m-0 flex flex-col gap-0.5 border-t border-ar-subtle pt-3 text-xs text-ar-muted">
        <span>{program.tierMetric === 'total_orders' ? t('overview.noteOrders') : t('overview.noteSpend')}</span>
        <span>{t('overview.lockedNote')}</span>
      </p>
    </SectionCard>
  );

  const earn = () => (
    <>
      <SectionCard title={t('earn.title')}>
        <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('earn.description')}</p>
        {switchRow(t('earn.rent'), t('earn.rentHint'), !!program.rentEarnEnabled, (v) => setField('rentEarnEnabled', v), false, <OnOffTag on={!!program.rentEarnEnabled} t={t} />)}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {numberField(t('earn.rate'), program.rentEarnRate, (n) => setField('rentEarnRate', n), { disabled: lock.rentAmounts })}
          {moneyField(t('earn.perAmount'), program.rentEarnPerAmount, (n) => setField('rentEarnPerAmount', n), lock.rentAmounts)}
        </div>
        <div className="border-t border-ar-subtle pt-4">
          {switchRow(t('earn.sale'), t('earn.saleHint'), !!program.saleEarnEnabled, (v) => setField('saleEarnEnabled', v), false, <OnOffTag on={!!program.saleEarnEnabled} t={t} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {numberField(t('earn.rate'), program.saleEarnRate, (n) => setField('saleEarnRate', n), { disabled: lock.saleAmounts })}
          {moneyField(t('earn.perAmount'), program.saleEarnPerAmount, (n) => setField('saleEarnPerAmount', n), lock.saleAmounts)}
        </div>
        <p className={noteClass}>
          <span>{t('earn.example1')}</span>
          <span>{t('earn.example2')}</span>
        </p>
      </SectionCard>
      <SectionCard title={t('redeem.title')}>
        <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('redeem.description')}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {moneyField(t('redeem.pointValue'), program.pointValue, (n) => setField('pointValue', n), lock.redeem)}
          {numberField(t('redeem.minPoints'), program.minRedeemPoints, (n) => setField('minRedeemPoints', n), { disabled: lock.redeem })}
          {numberField(t('redeem.maxPercent'), program.maxRedeemPercent, (n) => setField('maxRedeemPercent', n), { disabled: lock.redeem, max: 100 })}
        </div>
        <p className={noteClass}>
          <span>{t('redeem.example1')}</span>
          <span>{t('redeem.example2')}</span>
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {switchRow(t('redeem.onRent'), t('redeem.onRentHint'), !!program.redeemOnRent, (v) => setField('redeemOnRent', v), lock.redeem)}
          {switchRow(t('redeem.onSale'), t('redeem.onSaleHint'), !!program.redeemOnSale, (v) => setField('redeemOnSale', v), lock.redeem)}
        </div>
      </SectionCard>
    </>
  );

  const tierRows = () => (
    <SectionCard title={t('tiers.title')}>
      <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('tiers.description')}</p>
      <ul className="m-0 list-none overflow-hidden rounded-xl border border-ar-line p-0">
        {TIER_PRESETS.map((preset) => {
          const { existing, isDefault, enabled } = presetRow(preset, tiers);
          const busy = existing ? savingTierIds.includes(existing.id) : creatingTier;
          const threshold = existing ? existing.threshold : preset.threshold;
          const multiplier = existing ? existing.multiplier : 1;
          const editable = !!existing && !busy && !lock.tiers;
          return (
            <li key={preset.key} className={`flex flex-col gap-3 border-t border-ar-subtle px-4 py-3 first:border-t-0 md:flex-row md:items-center md:justify-between ${enabled ? '' : 'opacity-70'}`}>
              <label className="flex min-w-0 items-center gap-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={busy || lock.tiers}
                  readOnly={isDefault}
                  aria-label={t('tiers.toggle', { name: preset.name })}
                  onClick={(e) => {
                    if (isDefault) e.preventDefault();
                  }}
                  onChange={() => {
                    if (!active || isDefault) return;
                    if (existing) setPendingDelete(existing);
                    else void addPreset(preset);
                  }}
                  className={`h-5 w-5 flex-none accent-[rgb(var(--ar-primary))] disabled:cursor-not-allowed ${isDefault ? 'cursor-default' : 'cursor-pointer'}`}
                />
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm"
                  style={{ backgroundColor: `${preset.color}33` }}
                >
                  {TIER_EMOJI[preset.icon]}
                </span>
                <span className="truncate text-[15px] font-semibold text-ar-ink">{preset.name}</span>
                {isDefault && <span className="inline-block whitespace-nowrap rounded-[7px] bg-ar-subtle px-2 py-[2px] text-xs font-bold text-ar-ink-2">{t('tiers.default')}</span>}
              </label>
              {enabled ? (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 whitespace-nowrap text-sm text-ar-muted">
                    {t('tiers.threshold')}
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={t('tiers.thresholdLabel', { name: preset.name })}
                      value={formatThousands(threshold)}
                      disabled={isDefault || !editable}
                      onChange={(e) => existing && setTierField(existing.id, 'threshold', parseDigits(e.target.value))}
                      className={`${tierInput} w-32`}
                    />
                  </label>
                  <label className="flex items-center gap-2 whitespace-nowrap text-sm text-ar-muted">
                    {t('tiers.multiplier')}
                    <input
                      type="number"
                      min={1}
                      step="0.1"
                      aria-label={t('tiers.multiplierLabel', { name: preset.name })}
                      value={multiplier}
                      disabled={!editable}
                      onChange={(e) => existing && setTierField(existing.id, 'multiplier', Number(e.target.value || 1))}
                      className={`${tierInput} w-20`}
                    />
                  </label>
                  <button type="button" onClick={() => existing && saveTier(existing.id)} disabled={!editable} className={smallBtn}>
                    {busy ? t('tiers.saving') : t('tiers.save')}
                  </button>
                </div>
              ) : (
                <span className="text-sm text-ar-muted">{isDefault ? t('tiers.defaultAlways') : ''}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-xs text-ar-muted">{program.tierMetric === 'total_orders' ? t('tiers.footOrders') : t('tiers.footSpend')}</p>
    </SectionCard>
  );

  const expiry = () => (
    <SectionCard title={t('expiry.title')}>
      <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('expiry.description')}</p>
      {select(
        t('expiry.mode'),
        program.pointsExpiryMode || 'never',
        [
          ['never', t('expiry.never')],
          ['per_transaction', t('expiry.perTransaction')],
          ['yearly_reset', t('expiry.yearlyReset')],
        ],
        (v) => setField('pointsExpiryMode', v),
        false,
        'md:max-w-[320px]',
      )}
      {program.pointsExpiryMode === 'per_transaction' && (
        <div className="grid grid-cols-1 gap-4 border-t border-ar-subtle pt-4 md:grid-cols-2">
          {numberField(t('expiry.days'), program.pointsExpiryDays, (n) => setField('pointsExpiryDays', n), { hint: t('expiry.daysHint') })}
        </div>
      )}
      {program.pointsExpiryMode === 'yearly_reset' && (
        <div className="grid grid-cols-1 gap-4 border-t border-ar-subtle pt-4 md:grid-cols-2">
          {numberField(t('expiry.month'), program.yearlyResetMonth, (n) => setField('yearlyResetMonth', n), { max: 12, hint: t('expiry.monthHint') })}
          {numberField(t('expiry.day'), program.yearlyResetDay, (n) => setField('yearlyResetDay', n), { max: 28, hint: t('expiry.dayHint') })}
        </div>
      )}
    </SectionCard>
  );

  const navItem = (id: LoyaltySection) => {
    const on = id === section;
    return (
      <li key={id} className="flex-none lg:flex-auto">
        <button
          type="button"
          aria-current={on ? 'page' : undefined}
          onClick={() => go(id)}
          className={`flex min-h-[40px] w-full flex-col justify-center whitespace-nowrap rounded-[10px] px-3 py-1.5 text-left text-[15px] ${
            on ? 'bg-ar-surface font-semibold text-ar-ink shadow-[0_1px_2px_rgba(15,23,42,0.08)]' : 'text-ar-ink-2 hover:bg-ar-subtle'
          }`}
        >
          {t(`nav.${id}`)}
          <span className="hidden text-xs font-normal text-ar-muted lg:block">{t(`nav.${id}Hint`)}</span>
        </button>
      </li>
    );
  };

  // ------------------------------------------------------------------ render
  const container = 'mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8';
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 flex flex-wrap items-center gap-2 text-2xl font-bold">
          {t('title')}
          {!loading && <StatusTag access={access} active={active} t={t} />}
        </h1>
        <p className="m-0 text-[15px] text-ar-muted">{t('subtitle')}</p>
      </div>
      {!loading && !unavailable && (
        <button type="button" onClick={saveProgram} disabled={savingProgram} className={primaryBtn}>
          {savingProgram ? t('saving') : t('save')}
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={container} aria-busy="true">
        {header}
        <div className="flex flex-col gap-4 lg:flex-row">
          <Skeleton className="h-40 w-full lg:w-[240px]" />
          <Skeleton className="h-[360px] w-full flex-1" />
        </div>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className={container}>
        {header}
        <section className={`${cardClass} flex flex-col gap-3 px-5 py-[18px]`}>
          <h2 className="m-0 text-lg font-bold">{t('locked.title')}</h2>
          <p className="m-0 text-[15px] text-ar-ink-2">{t('locked.body')}</p>
          <p className="m-0 rounded-xl border border-dashed border-ar-line-strong px-4 py-3 text-sm text-ar-muted">{t('locked.note')}</p>
        </section>
      </div>
    );
  }

  return (
    <div className={container}>
      {header}
      {inactive && (
        <div role="status" className="flex flex-col gap-0.5 rounded-2xl bg-ar-unprepared-bg px-5 py-3.5 text-ar-unprepared">
          <span className="text-[15px] font-bold">{t('inactive.title')}</span>
          <span className="text-sm">{t('inactive.body')}</span>
        </div>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <nav aria-label={t('navLabel')} className="-mx-4 min-w-0 overflow-x-auto px-4 lg:mx-0 lg:w-[240px] lg:flex-none lg:overflow-visible lg:px-0">
          <ul className="m-0 flex list-none gap-1 p-0 lg:flex-col lg:gap-0.5">{LOYALTY_SECTIONS.map((id) => navItem(id))}</ul>
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {section === 'overview' && overview()}
          {section === 'earn' && earn()}
          {section === 'tiers' && tierRows()}
          {section === 'expiry' && expiry()}
        </div>
      </div>

      <Modal
        open={!!pendingDelete}
        title={t('confirm.title')}
        onClose={() => (deletingTierId != null ? undefined : setPendingDelete(null))}
        closeLabel={t('confirm.close')}
        footer={
          <>
            <button type="button" onClick={() => setPendingDelete(null)} disabled={deletingTierId != null} className={outlineBtn}>
              {t('confirm.cancel')}
            </button>
            <button type="button" onClick={deleteTier} disabled={deletingTierId != null} className={dangerBtn}>
              {t('confirm.delete')}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink-2">{pendingDelete ? t('confirm.body', { name: pendingDelete.name }) : ''}</p>
      </Modal>
    </div>
  );
}
