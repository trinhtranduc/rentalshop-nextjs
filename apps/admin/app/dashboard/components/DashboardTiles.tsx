'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

/** Segmented period control (portal "Tổng quan" style). One component, phone and web. */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="ar-dash-seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className="ar-dash-seg-btn"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type PillTone = 'neutral' | 'info' | 'good' | 'warn' | 'bad';

const PILL: Record<PillTone, string> = {
  neutral: 'bg-ar-subtle text-ar-muted',
  info: 'bg-ar-renting-bg text-ar-renting',
  good: 'bg-ar-done-bg text-ar-done',
  warn: 'bg-ar-late-bg text-ar-late',
  bad: 'bg-ar-danger-soft text-ar-danger',
};

/** Metric card: title, big number, small pill, chevron when it links. */
export function MetricTile({
  title,
  value,
  pill,
  tone = 'neutral',
  onClick,
}: {
  title: string;
  value: React.ReactNode;
  pill: string;
  tone?: PillTone;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ar-muted">{title}</span>
        {onClick && <ChevronRight className="h-4 w-4 text-ar-faint" aria-hidden />}
      </div>
      <div className="mt-2 text-2xl font-bold leading-none text-ar-ink tabular-nums">{value}</div>
      <span className={`mt-3 inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-medium ${PILL[tone]}`}>
        {pill}
      </span>
    </>
  );
  const cls =
    'block w-full min-w-0 rounded-xl border border-ar-line bg-ar-surface shadow-ar p-3 text-left sm:p-4';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} min-h-[44px] transition-colors hover:border-ar-line-strong`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Chart card: title, optional legend, and a body that scrolls sideways inside itself on a phone. */
export function ChartCard({
  title,
  legend,
  children,
}: {
  title: string;
  legend: { label: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-ar-line bg-ar-surface shadow-ar p-4">
      <h2 className="text-sm font-semibold text-ar-ink sm:text-base">{title}</h2>
      <ul className="mb-3 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ar-muted">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} aria-hidden />
            {l.label}
          </li>
        ))}
      </ul>
      <div className="ar-dash-chart-scroll">
        <div className="ar-dash-chart-inner">{children}</div>
      </div>
    </section>
  );
}
