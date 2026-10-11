'use client';

/**
 * Tổng quan header controls (#827): the Thời gian dropdown and the Chi nhánh multi-select.
 * Desktop: popovers (branch ticks apply at once). Phone: the branch list is a bottom sheet with "Xem N chi nhánh".
 */
import React, { useEffect, useRef, useState } from 'react';
import type { OverviewPeriod } from '../overview-model';
import { branchLabel, isAllActive, toggleAllBranches, toggleBranch, type BranchLabel, type BranchOption } from '../branch-model';
import type { T } from './sections';

const CAL_ICON = 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4';
const BRANCH_ICON = 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6';

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      <path d={d} />
    </svg>
  );
}

const Caret = () => <span aria-hidden="true" className="flex-none text-[10px] opacity-70">▾</span>;

/** Closes a popover on an outside pointer or Escape */
function useDismiss(open: boolean, ref: React.RefObject<HTMLElement>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, ref, close]);
}

const buttonBase =
  'flex h-10 min-w-0 items-center gap-2 rounded-[10px] border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary';

export function PeriodMenu({
  periods,
  active,
  label,
  shortLabel,
  onSelect,
  t,
}: {
  periods: OverviewPeriod[];
  active: OverviewPeriod;
  /** "Hôm nay · CN 11/10" */
  label: string;
  /** "Hôm nay" (phone) */
  shortLabel: string;
  onSelect: (period: OverviewPeriod) => void;
  t: T;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useDismiss(open, box, close);
  return (
    <div ref={box} className="relative min-w-0">
      <button
        type="button"
        data-period-button
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('home.periods.label')}: ${label}`}
        onClick={() => setOpen((v) => !v)}
        className={`${buttonBase} border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle`}
      >
        <Icon d={CAL_ICON} />
        <span className="truncate sm:hidden">{shortLabel}</span>
        <span className="hidden truncate sm:inline">{label}</span>
        <Caret />
      </button>
      {open && (
        <div role="menu" aria-label={t('home.periods.label')} className="absolute right-0 top-full z-40 mt-1.5 w-[220px] max-w-[calc(100vw-32px)] rounded-xl border border-ar-line bg-ar-surface p-1.5 shadow-ar">
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              role="menuitemradio"
              aria-checked={active === p}
              data-period={p}
              onClick={() => {
                setOpen(false);
                onSelect(p);
              }}
              className={`flex min-h-[40px] w-full items-center justify-between rounded-lg px-3 text-left text-sm ${
                active === p ? 'bg-ar-primary-soft font-semibold text-ar-primary-ink' : 'text-ar-ink hover:bg-ar-subtle'
              }`}
            >
              {t(`home.periods.${p}`)}
              {active === p && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Button text: long on desktop ("Chi nhánh: Tất cả (2)"), short on phone ("Tất cả (2)") */
export function branchButtonText(label: BranchLabel, t: T): string {
  if (label.kind === 'all') return t('home.branches.all', { count: label.count });
  if (label.kind === 'one') return label.name;
  return t('home.branches.some', { count: label.count });
}

function BranchRows({
  options,
  draft,
  onChange,
  t,
}: {
  options: BranchOption[];
  draft: number[];
  onChange: (next: number[]) => void;
  t: T;
}) {
  const active = options.filter((o) => o.isActive);
  const inactive = options.filter((o) => !o.isActive);
  const row = (o: BranchOption) => (
    <label key={o.id} data-branch-option={o.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-ar-subtle">
      <input
        type="checkbox"
        checked={draft.includes(o.id)}
        onChange={() => onChange(toggleBranch(draft, o.id, options))}
        className="h-[18px] w-[18px] flex-none accent-[rgb(var(--ar-primary))]"
      />
      {o.isActive && <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${o.color}`} />}
      <span className={`min-w-0 flex-1 text-sm ${o.isActive ? 'text-ar-ink' : 'text-ar-muted'}`}>{o.name}</span>
      {o.isDefault && <span className="flex-none text-xs text-ar-muted">{t('home.branches.default')}</span>}
    </label>
  );
  return (
    <div className="flex flex-col">
      <label data-branch-option="all" className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-ar-subtle">
        <input
          type="checkbox"
          checked={isAllActive(draft, options)}
          onChange={() => onChange(toggleAllBranches(draft, options))}
          className="h-[18px] w-[18px] flex-none accent-[rgb(var(--ar-primary))]"
        />
        <span className="text-sm font-semibold text-ar-ink">{t('home.branches.allBranches')}</span>
      </label>
      {active.map(row)}
      {inactive.length > 0 && (
        <>
          <span className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-ar-muted">{t('home.branches.inactive')}</span>
          {inactive.map(row)}
        </>
      )}
    </div>
  );
}

const isPhone = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches;

export function BranchPicker({
  options,
  selection,
  onChange,
  t,
}: {
  options: BranchOption[];
  selection: number[];
  onChange: (next: number[]) => void;
  t: T;
}) {
  const [open, setOpen] = useState<'popover' | 'sheet' | null>(null);
  const [draft, setDraft] = useState<number[]>(selection);
  const box = useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(null), []);
  useDismiss(open === 'popover', box, close);
  const text = branchButtonText(branchLabel(selection, options), t);

  useEffect(() => {
    if (open !== 'sheet') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div ref={box} className="relative min-w-0">
      <button
        type="button"
        data-branch-button
        aria-haspopup="dialog"
        aria-expanded={open !== null}
        aria-label={`${t('home.branches.label')}: ${text}`}
        onClick={() => {
          if (open) return setOpen(null);
          setDraft(selection);
          setOpen(isPhone() ? 'sheet' : 'popover');
        }}
        className={`${buttonBase} border-ar-primary bg-ar-primary-soft text-ar-primary-ink hover:opacity-90`}
      >
        <Icon d={BRANCH_ICON} />
        <span className="max-w-[160px] truncate sm:hidden">{text}</span>
        <span className="hidden max-w-[280px] truncate sm:inline">{t('home.branches.prefix', { label: text })}</span>
        <Caret />
      </button>

      {open === 'popover' && (
        <div
          role="dialog"
          aria-label={t('home.branches.sheetTitle')}
          className="absolute right-0 top-full z-40 mt-1.5 max-h-[70vh] w-[330px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-xl border border-ar-line bg-ar-surface p-2 shadow-ar"
        >
          <BranchRows
            options={options}
            draft={draft}
            onChange={(next) => {
              setDraft(next);
              onChange(next);
            }}
            t={t}
          />
        </div>
      )}

      {open === 'sheet' && (
        <div className="fixed inset-0 z-50">
          <div aria-hidden="true" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('home.branches.sheetTitle')}
            className="absolute inset-x-0 bottom-0 box-border flex max-h-[85vh] flex-col gap-3 rounded-t-2xl border-t border-ar-line bg-ar-surface px-4 pb-5 pt-2.5 text-ar-ink shadow-ar"
          >
            <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-ar-line" />
            <h2 className="m-0 text-lg font-bold">{t('home.branches.sheetTitle')}</h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <BranchRows options={options} draft={draft} onChange={setDraft} t={t} />
            </div>
            <button
              type="button"
              data-branch-apply
              onClick={() => {
                onChange(draft);
                setOpen(null);
              }}
              className="h-12 w-full rounded-xl bg-ar-primary text-base font-semibold text-ar-on-primary hover:opacity-95"
            >
              {t('home.branches.apply', { count: draft.length })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
