'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MAX_PAGE_SIZE, PAGE_SIZE_PRESETS, commitPageSize, isPresetPageSize } from '../page-size';

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * #1362 rows per page: quick sizes (10 / 20 / 50 / 100) and a box to type any number from 1 to 3000.
 * Enter or leaving the box applies it; a number past the edges is cut and the hint says why.
 * Text keys are the list's own `footer.*` (`show`, `perPage`, `perPageLabel`); the hint is `common.pagination.pageSizeMax`.
 */
export function PageSizeControl({ limit, onLimit, t }: { limit: number; onLimit: (limit: number) => void; t: T }) {
  const tc = useTranslations('common');
  const hint = tc('pagination.pageSizeMax', { max: MAX_PAGE_SIZE });
  const [draft, setDraft] = useState(String(limit));
  const [clamped, setClamped] = useState(false);

  // The URL is the source of truth: a preset click or Back/Forward replaces what was typed
  useEffect(() => setDraft(String(limit)), [limit]);

  const apply = (value: number) => {
    if (value !== limit) onLimit(value);
  };
  const commit = () => {
    const result = commitPageSize(draft, limit);
    setClamped(result.clamped);
    setDraft(String(result.value));
    apply(result.value);
  };
  const custom = !isPresetPageSize(limit);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-ar-muted">
      <span>{t('footer.show')}</span>
      <span className="inline-flex gap-1">
        {PAGE_SIZE_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={n === limit}
            onClick={() => {
              setClamped(false);
              apply(n);
            }}
            className={`h-9 min-w-[40px] rounded-[10px] px-2 text-sm font-semibold tabular-nums ${
              n === limit ? 'bg-ar-ink text-ar-page' : 'border border-ar-line-soft bg-ar-surface text-ar-ink hover:bg-ar-subtle'
            }`}
          >
            {n}
          </button>
        ))}
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={draft}
        aria-label={t('footer.perPageLabel')}
        aria-invalid={clamped || undefined}
        title={hint}
        onChange={(e) => {
          setDraft(e.target.value);
          setClamped(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            setDraft(String(limit));
            setClamped(false);
          }
        }}
        className={`h-9 w-[72px] rounded-[10px] border bg-ar-surface px-2 text-center text-sm font-semibold tabular-nums text-ar-ink ${
          custom ? 'border-ar-primary ring-1 ring-ar-primary' : 'border-ar-line'
        }`}
      />
      <span>{t('footer.perPage')}</span>
      {clamped && (
        <span role="status" className="text-sm font-medium text-ar-danger">
          {hint}
        </span>
      )}
    </div>
  );
}
