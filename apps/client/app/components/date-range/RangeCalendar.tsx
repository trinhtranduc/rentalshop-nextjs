'use client';

/**
 * The one date-range picker of the shop web (#556 Tạo đơn, #559 Tổng quan, Kiểm tra còn hàng, Đơn hàng).
 * `RangeCalendar` is the grid; `DateRangeField` is a compact trigger ("T4 01/10 → T6 31/10 · 31 ngày") that
 * opens it in a popover (a bottom sheet on phones). Day logic lives in ./range-model on Vietnam day keys.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ICONS, ShellIcon } from '../shell/Icon';
import { formatDayLabel } from '../../dashboard/overview-model';
import { dayAllowed, dayMark, monthCells, monthOf, pickDay, rangeDays, rangeProblem, shiftMonth, type DayRangePick } from './range-model';

const CALENDAR_ICON = 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z';
/** Layout effect in the browser (no first-frame jump of the popover), plain effect on the server. */
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const navBtn = 'flex h-9 w-9 items-center justify-center rounded-[10px] text-ar-ink hover:bg-ar-subtle';

export interface DayLimits {
  /** First day that can be picked (day key), e.g. today for future-only screens */
  min?: string;
  /** Last day that can be picked (day key), e.g. today for reports */
  max?: string;
}

/** "T4 01/10 → T6 31/10 · 31 ngày", "T4 08/10 · 1 ngày", or '' when the range is not complete. */
export function useRangeLabel() {
  const t = useTranslations('common');
  const weekdays = t('dateRange.weekdays').split(',');
  return (from: string, to: string): string => {
    const days = rangeDays(from, to);
    if (!days) return '';
    const a = formatDayLabel(from, weekdays);
    return days === 1 ? t('dateRange.single', { from: a }) : t('dateRange.summary', { from: a, to: formatDayLabel(to, weekdays), days });
  };
}

/**
 * Click the first day, then the last; hover previews the end. Monday-first, today ringed, two months side by side
 * from 640px, one on phones. Days outside `min` / `max` are disabled. When the next month is past `max`, the grid
 * shows the month before instead, so a report range opens on the last two months.
 */
export function RangeCalendar({
  from,
  to,
  todayKey,
  onPick,
  min,
  max,
  hints,
}: {
  from: string;
  to: string;
  todayKey: string;
  onPick: (range: DayRangePick) => void;
  /** Line above the grid: before the start is picked, and while the end is being picked */
  hints?: { start: string; end: string };
} & DayLimits) {
  const t = useTranslations('common');
  const weekdays = t('dateRange.weekdays').split(',');
  // The month holding the start (or today) is always shown; it is on the right when the next month is past `max`.
  const [anchorRight] = useState(() => !!max && shiftMonth(monthOf(from || todayKey), 1) > monthOf(max));
  const [month, setMonth] = useState(() => {
    const m = monthOf(from || todayKey);
    return anchorRight ? shiftMonth(m, -1) : m;
  });
  const [hover, setHover] = useState<string | null>(null);
  const range = { from, to };
  // Monday-first headers from the Sunday-first list ("CN,T2,…,T7")
  const heads = [1, 2, 3, 4, 5, 6, 0].map((i) => weekdays[i] ?? '');
  const renderMonth = (m: string, extra = '') => {
    const [y, mm] = m.split('-').map(Number);
    return (
      <div key={m} className={`min-w-0 flex-1 ${extra}`}>
        <div className="pb-2 text-center text-[15px] font-semibold">{t('dateRange.month', { month: mm, year: y })}</div>
        <div className="grid grid-cols-7 text-center text-xs text-ar-muted">
          {heads.map((h, i) => (
            <span key={i} className="pb-1">
              {h}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7" onMouseLeave={() => setHover(null)}>
          {monthCells(m).map((key, i) => {
            if (!key) return <span key={`e${i}`} />;
            const allowed = dayAllowed(key, { min, max });
            const mark = dayMark(range, key, hover);
            const ends = mark === 'start' || mark === 'end' || mark === 'single';
            return (
              <span
                key={key}
                className={`flex h-10 items-center justify-center ${mark === 'inside' ? 'bg-ar-primary-soft' : ''} ${
                  mark === 'start' ? 'rounded-l-full bg-ar-primary-soft' : ''
                } ${mark === 'end' ? 'rounded-r-full bg-ar-primary-soft' : ''}`}
              >
                <button
                  type="button"
                  disabled={!allowed}
                  aria-pressed={!!mark && mark !== 'inside'}
                  aria-label={key.split('-').reverse().join('/')}
                  onClick={() => onPick(pickDay(range, key))}
                  onMouseEnter={() => allowed && from && !to && setHover(key)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums ${
                    ends
                      ? 'bg-ar-primary font-bold text-ar-on-primary'
                      : !allowed
                        ? 'cursor-not-allowed text-ar-faint'
                        : `${mark === 'inside' ? 'text-ar-primary-ink' : 'text-ar-ink'} hover:bg-ar-subtle`
                  } ${key === todayKey && !ends ? 'font-bold ring-1 ring-inset ring-ar-primary' : ''}`}
                >
                  {Number(key.slice(8))}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    );
  };
  const hint = from && !to ? hints?.end ?? t('dateRange.pickEnd') : hints?.start ?? t('dateRange.pickStart');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label={t('dateRange.prev')} className={navBtn}>
          <ShellIcon d={ICONS.chevronLeft} size={18} />
        </button>
        <span className="text-center text-sm text-ar-muted">{hint}</span>
        <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label={t('dateRange.next')} className={navBtn}>
          <ShellIcon d={ICONS.chevronRight} size={18} />
        </button>
      </div>
      <div className="flex gap-6">
        {renderMonth(month, anchorRight ? 'max-sm:hidden' : '')}
        {renderMonth(shiftMonth(month, 1), anchorRight ? '' : 'max-sm:hidden')}
      </div>
    </div>
  );
}

export interface QuickRange {
  key: string;
  label: string;
  from: string;
  to: string;
}

/**
 * Compact trigger showing the chosen range and its length; opens the calendar with quick picks, Huỷ / Áp dụng.
 * `onChange` fires on Áp dụng only. `onClose` fires when it closes without applying.
 */
export function DateRangeField({
  from,
  to,
  todayKey,
  onChange,
  onClose,
  quick,
  maxDays,
  min,
  max,
  align = 'start',
  initialOpen = false,
  className = '',
  ariaLabel,
}: {
  from: string;
  to: string;
  todayKey: string;
  onChange: (from: string, to: string) => void;
  onClose?: () => void;
  quick?: QuickRange[];
  maxDays?: number;
  /** Popover edge on wide screens: under the trigger's left edge, or its right edge */
  align?: 'start' | 'end';
  initialOpen?: boolean;
  /** Trigger size and width; the look (border, surface, icon) is fixed */
  className?: string;
  ariaLabel?: string;
} & DayLimits) {
  const t = useTranslations('common');
  const label = useRangeLabel();
  const [open, setOpen] = useState(initialOpen);
  const [draft, setDraft] = useState<DayRangePick>({ from, to });
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setDraft({ from, to });
    // Reset the draft on open only; props moving while open (another tab, URL) do not wipe the user's pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = (applied: boolean) => {
    setOpen(false);
    if (!applied) onClose?.();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Wide screens: a popover pinned under the trigger. It is `fixed`, so a card with overflow-hidden (Đơn hàng)
  // cannot clip it; it follows the trigger on scroll and resize. Phones get a bottom sheet instead (no style).
  const [pos, setPos] = useState<React.CSSProperties | undefined>(undefined);
  useBrowserLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = triggerRef.current;
      if (!el || !window.matchMedia('(min-width: 640px)').matches) return setPos(undefined);
      const r = el.getBoundingClientRect();
      const top = r.bottom + 8;
      const side = align === 'end' ? { right: Math.max(16, window.innerWidth - r.right) } : { left: Math.max(16, r.left) };
      setPos({ top, ...side, maxHeight: Math.max(320, window.innerHeight - top - 16) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

  const problem = rangeProblem(draft.from, draft.to, maxDays);
  const text = label(from, to);
  return (
    <div ref={boxRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}: ${text || t('dateRange.placeholder')}` : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        className={`flex h-10 w-full min-w-0 items-center gap-2 rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-left text-[15px] text-ar-ink hover:bg-ar-subtle ${
          open ? 'border-ar-primary' : ''
        } ${className}`}
      >
        <ShellIcon d={CALENDAR_ICON} size={18} className="shrink-0 text-ar-muted" />
        <span className={`min-w-0 flex-1 truncate tabular-nums ${text ? '' : 'text-ar-faint'}`}>{text || t('dateRange.placeholder')}</span>
        <ShellIcon d={ICONS.chevronDown} size={16} className="shrink-0 text-ar-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={() => close(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label={t('dateRange.title')}
            style={pos}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col gap-3 overflow-y-auto rounded-t-2xl bg-ar-surface p-4 text-ar-ink shadow-xl sm:inset-x-auto sm:bottom-auto sm:w-[min(640px,calc(100vw-32px))] sm:rounded-2xl sm:border sm:border-ar-line-soft"
          >
            <div className="flex items-center justify-between sm:hidden">
              <span className="text-lg font-bold">{t('dateRange.title')}</span>
              <button type="button" onClick={() => close(false)} aria-label={t('dateRange.close')} className={navBtn}>
                <ShellIcon d={ICONS.close} size={18} />
              </button>
            </div>
            {quick && quick.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quick.map((q) => {
                  const on = q.from === draft.from && q.to === draft.to;
                  return (
                    <button
                      key={q.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft({ from: q.from, to: q.to })}
                      className={`h-9 rounded-full px-3 text-sm ${on ? 'bg-ar-ink font-semibold text-ar-surface' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'}`}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
            )}
            <RangeCalendar from={draft.from} to={draft.to} todayKey={todayKey} min={min} max={max} onPick={setDraft} />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ar-line-soft pt-3">
              <span className={`text-sm font-semibold tabular-nums ${problem === 'tooLong' ? 'text-ar-danger' : ''}`} role="status">
                {problem === 'tooLong' ? t('dateRange.tooLong', { days: maxDays ?? 0 }) : label(draft.from, draft.to)}
              </span>
              <div className="flex gap-2 max-sm:w-full">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-[10px] border border-ar-line bg-ar-surface px-3.5 text-[15px] font-semibold text-ar-ink hover:bg-ar-subtle"
                >
                  {t('dateRange.cancel')}
                </button>
                <button
                  type="button"
                  disabled={!!problem}
                  onClick={() => {
                    onChange(draft.from, draft.to);
                    close(true);
                  }}
                  className="inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-[10px] bg-ar-primary px-4 text-[15px] font-semibold text-ar-on-primary hover:opacity-95 disabled:opacity-50"
                >
                  {t('dateRange.apply')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
