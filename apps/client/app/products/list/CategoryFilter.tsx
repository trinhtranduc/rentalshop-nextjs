'use client';

/**
 * #1536 "Danh mục" on the product list: one menu where several categories can be ticked (replaces the chip row).
 * Each tick applies at once and the menu stays open; Esc or a click outside closes it. The ticks are kept here until the URL
 * catches up, so two quick ticks both count. A search box shows when the shop
 * has more than 8 categories. Labels and matching live in ./list-model (unit-tested).
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import type { T } from '../../orders/list/parts';
import { categoryButtonLabel, matchCategories, toggleCategory, type CategoryOption } from './list-model';

const SEARCH_FROM = 9;

export function CategoryFilter({
  value,
  options,
  onChange,
  t,
}: {
  value: number[];
  options: CategoryOption[];
  onChange: (ids: number[]) => void;
  t: T;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [picked, setPicked] = useState<number[]>(value);
  const valueKey = value.join(',');
  useEffect(() => {
    setPicked(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value changes only with valueKey
  }, [valueKey]);
  const apply = (next: number[]) => {
    setPicked(next);
    onChange(next);
  };
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) {
      setTerm('');
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = categoryButtonLabel(picked, options);
  const current = label.kind === 'all' ? t('category.all') : label.kind === 'one' ? label.name : t('category.many', { count: label.count });
  const shown = matchCategories(options, term);
  const any = picked.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-category-filter
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 max-w-[260px] items-center gap-1 whitespace-nowrap rounded-[10px] border pl-3 pr-2.5 text-sm ${
          any ? 'border-ar-primary bg-ar-primary-soft text-ar-primary-ink' : 'border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'
        }`}
      >
        <span className="text-ar-muted">{t('category.label')}</span>
        <span className={`min-w-0 truncate ${any ? 'font-semibold' : ''}`}>{current}</span>
        <ShellIcon d={ICONS.chevronDown} size={16} className="flex-none text-ar-muted" />
      </button>
      {open && (
        <div id={id} className="absolute left-0 z-30 mt-1 w-[280px] max-w-[calc(100vw-32px)] rounded-xl border border-ar-line-soft bg-ar-surface p-1 shadow-ar">
          {options.length >= SEARCH_FROM && (
            <label className="m-1 flex h-9 items-center gap-2 rounded-lg border border-ar-line px-2.5 text-ar-muted">
              <ShellIcon d={ICONS.search} size={14} />
              <input
                type="search"
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                aria-label={t('category.search')}
                placeholder={t('category.search')}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ar-ink outline-none placeholder:text-ar-faint"
              />
            </label>
          )}
          <ul role="listbox" aria-multiselectable="true" aria-label={t('category.label')} className="m-0 max-h-[320px] list-none overflow-y-auto p-0">
            <li role="option" aria-selected={!any}>
              <button
                type="button"
                onClick={() => apply([])}
                className={`flex h-9 w-full items-center rounded-lg px-3 text-left text-sm ${
                  any ? 'text-ar-ink hover:bg-ar-subtle' : 'bg-ar-primary-soft font-semibold text-ar-primary-ink'
                }`}
              >
                {t('category.allCategories')}
              </button>
            </li>
            {shown.map((c) => {
              const on = picked.includes(c.id);
              return (
                <li key={c.id} role="option" aria-selected={on}>
                  <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-ar-ink hover:bg-ar-subtle">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => apply(toggleCategory(picked, c.id))}
                      className="h-4 w-4 flex-none cursor-pointer accent-ar-primary"
                    />
                    <span className={`min-w-0 flex-1 break-words ${on ? 'font-semibold' : ''}`}>{c.name}</span>
                    {c.count !== null && <span className="flex-none tabular-nums text-ar-muted">{c.count}</span>}
                  </label>
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-ar-muted">{t('category.none')}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
