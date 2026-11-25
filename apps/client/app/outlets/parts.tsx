'use client';

/**
 * Pieces of the Chi nhánh pages (#545) on the shell tokens: the row menu and the add / edit form.
 */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { outlineBtn, primaryBtn, type T } from '../orders/list/parts';
import { Modal, fieldClass } from '../orders/create/parts';
import { OUTLET_LINK_BRAND_NAMES, OUTLET_LINK_LABEL_MAX, type OutletLinkError, type OutletLinkType } from '@rentalshop/utils';
import {
  MAX_OUTLET_LINKS,
  OUTLET_LINK_EXAMPLES,
  OUTLET_LINK_TYPE_ORDER,
  PRINT_NOTE_MAX,
  emptyLinkRow,
  validateLinkRows,
  validateOutlet,
  type OutletFieldError,
  type OutletForm,
  type OutletLinkRow,
} from './outlets-model';

export const smallBtn =
  'inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-sm font-semibold text-ar-ink no-underline hover:bg-ar-subtle disabled:opacity-50';
const labelClass = 'flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-ar-ink-2';
const inputClass = `${fieldClass} font-normal`;
const errorField = 'border-ar-danger focus:border-ar-danger';

/** Brand names are the same in every language; website / other come from the locale */
export const linkTypeText = (t: T, type: OutletLinkType): string => OUTLET_LINK_BRAND_NAMES[type] ?? t(`form.links.type.${type}`);

export type MenuItem = { key: string; text: string; danger?: boolean; onPick?: () => void; href?: string };

export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
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
  const item = 'flex h-9 w-full items-center whitespace-nowrap rounded-lg px-3 text-left text-sm no-underline hover:bg-ar-subtle';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ar-ink hover:bg-ar-subtle"
      >
        <ShellIcon d={ICONS.more} size={18} />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 z-30 m-0 mt-1 min-w-[200px] list-none rounded-xl border border-ar-line-soft bg-ar-surface p-1 text-left shadow-ar">
          {items.map((it) => (
            <li role="none" key={it.key}>
              {it.href ? (
                <Link role="menuitem" href={it.href} className={`${item} text-ar-ink`} onClick={() => setOpen(false)}>
                  {it.text}
                </Link>
              ) : (
                <button
                  role="menuitem"
                  type="button"
                  className={`${item} ${it.danger ? 'text-ar-danger' : 'text-ar-ink'}`}
                  onClick={() => {
                    setOpen(false);
                    it.onPick?.();
                  }}
                >
                  {it.text}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Add / edit a branch. Add sends the old add fields; edit also has the receipt note (500 characters). */
export function OutletFormDialog({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  t,
}: {
  open: boolean;
  mode: 'add' | 'edit';
  initial: OutletForm;
  onClose: () => void;
  onSubmit: (form: OutletForm) => Promise<boolean>;
  t: T;
}) {
  const [form, setForm] = useState<OutletForm>(initial);
  const [errors, setErrors] = useState<{ name?: OutletFieldError; printNote?: OutletFieldError }>({});
  const [linkErrors, setLinkErrors] = useState<Record<number, OutletLinkError>>({});
  const [saving, setSaving] = useState(false);
  const formId = `outlet-form-${mode}`;

  useEffect(() => {
    if (open) {
      setForm(initial);
      setErrors({});
      setLinkErrors({});
      setSaving(false);
    }
    // `initial` is rebuilt on every parent render; reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key: Exclude<keyof OutletForm, 'links'>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'name' || key === 'printNote') setErrors((er) => ({ ...er, [key]: undefined }));
  };

  // #1643 "Liên kết": a row is a type + address (+ a name for the `other` type)
  const setRow = (index: number, patch: Partial<OutletLinkRow>) => {
    setForm((f) => ({ ...f, links: f.links.map((row, i) => (i === index ? { ...row, ...patch } : row)) }));
    setLinkErrors((er) => Object.fromEntries(Object.entries(er).filter(([key]) => Number(key) !== index)) as Record<number, OutletLinkError>);
  };
  const addRow = () => setForm((f) => (f.links.length >= MAX_OUTLET_LINKS ? f : { ...f, links: [...f.links, emptyLinkRow()] }));
  const removeRow = (index: number) => {
    setForm((f) => ({ ...f, links: f.links.filter((_, i) => i !== index) }));
    setLinkErrors({});
  };
  const checkRow = (index: number) => {
    const found = validateLinkRows([form.links[index]])[0];
    setLinkErrors((er) => (found ? { ...er, [index]: found } : er));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateOutlet(form);
    const badLinks = validateLinkRows(form.links);
    setErrors(found);
    setLinkErrors(badLinks);
    if (found.name || found.printNote || Object.keys(badLinks).length > 0) return;
    setSaving(true);
    const ok = await onSubmit(form);
    if (!ok) setSaving(false);
  };

  const field = (key: Exclude<keyof OutletForm, 'links'>, label: string, extra: { placeholder?: string; type?: string; className?: string } = {}) => (
    <label className={`${labelClass} ${extra.className || ''}`}>
      {label}
      <input type={extra.type || 'text'} value={form[key]} onChange={set(key)} placeholder={extra.placeholder} className={inputClass} />
    </label>
  );

  return (
    <Modal
      open={open}
      title={mode === 'add' ? t('form.addTitle') : t('form.editTitle')}
      onClose={() => (saving ? undefined : onClose())}
      closeLabel={t('form.close')}
      roomy
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={outlineBtn}>
            {t('form.cancel')}
          </button>
          <button type="submit" form={formId} disabled={saving} className={primaryBtn}>
            {saving ? t('form.saving') : mode === 'add' ? t('form.create') : t('form.save')}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <label className={labelClass}>
          <span>
            {t('form.name')} <span className="font-normal text-ar-danger">{t('form.required')}</span>
          </span>
          <input
            value={form.name}
            onChange={set('name')}
            placeholder={t('form.namePlaceholder')}
            aria-invalid={!!errors.name || undefined}
            className={`${inputClass} ${errors.name ? errorField : ''}`}
          />
          {errors.name && <span className="text-sm font-normal text-ar-danger">{t(`form.${errors.name}`)}</span>}
        </label>
        {field('phone', t('form.phone'), { type: 'tel' })}

        <fieldset className="m-0 flex min-w-0 flex-col gap-3 rounded-xl border border-ar-line p-3">
          <legend className="px-1 text-sm font-semibold text-ar-ink-2">{t('form.addressGroup')}</legend>
          {field('address', t('form.address'))}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field('city', t('form.city'))}
            {field('state', t('form.state'))}
            {field('zipCode', t('form.zipCode'), { placeholder: t('form.optional') })}
            {field('country', t('form.country'))}
          </div>
        </fieldset>

        <fieldset className="m-0 flex min-w-0 flex-col gap-2 rounded-xl border border-ar-line p-3" data-outlet-links>
          <legend className="px-1 text-sm font-semibold text-ar-ink-2">{t('form.links.title')}</legend>
          {form.links.map((row, index) => {
            const error = linkErrors[index];
            const typeText = linkTypeText(t, row.type);
            return (
              <div key={index} className="flex flex-col gap-1" data-outlet-link-row>
                <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 sm:grid-cols-[150px_minmax(0,1fr)_40px]">
                  <select
                    aria-label={t('form.links.typeLabel')}
                    value={row.type}
                    onChange={(e) => setRow(index, { type: e.target.value as OutletLinkRow['type'] })}
                    className={`${inputClass} col-span-2 sm:col-span-1`}
                  >
                    {OUTLET_LINK_TYPE_ORDER.map((type) => (
                      <option key={type} value={type}>
                        {linkTypeText(t, type)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    aria-label={`${typeText}: ${t('form.links.urlLabel')}`}
                    value={row.url}
                    onChange={(e) => setRow(index, { url: e.target.value })}
                    onBlur={() => checkRow(index)}
                    placeholder={OUTLET_LINK_EXAMPLES[row.type]}
                    aria-invalid={!!error || undefined}
                    className={`${inputClass} ${error ? errorField : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label={`${t('form.links.remove')}: ${typeText}`}
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-ar-line-strong bg-ar-surface text-lg leading-none text-ar-muted hover:bg-ar-subtle"
                  >
                    ×
                  </button>
                </div>
                {row.type === 'other' && (
                  <input
                    value={row.label}
                    maxLength={OUTLET_LINK_LABEL_MAX + 10}
                    onChange={(e) => setRow(index, { label: e.target.value })}
                    placeholder={t('form.links.labelPlaceholder')}
                    aria-label={t('form.links.labelPlaceholder')}
                    className={inputClass}
                  />
                )}
                {error && (
                  <span role="alert" className="text-sm font-normal text-ar-danger">
                    {error === 'platform'
                      ? t('form.links.err.platform', { type: typeText, example: OUTLET_LINK_EXAMPLES[row.type] })
                      : error === 'labelRequired' || error === 'labelTooLong'
                        ? t(`form.links.err.${error}`, { max: OUTLET_LINK_LABEL_MAX })
                        : t('form.links.err.invalid', { example: OUTLET_LINK_EXAMPLES[row.type] })}
                  </span>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {form.links.length < MAX_OUTLET_LINKS && (
              <button type="button" onClick={addRow} className={`${smallBtn} border-dashed text-ar-primary-ink`}>
                + {t('form.links.add')}
              </button>
            )}
            <span className="text-xs font-normal text-ar-muted">
              {t('form.links.used', { count: form.links.length, max: MAX_OUTLET_LINKS })} · {t('form.links.hint')}
            </span>
          </div>
        </fieldset>

        <label className={labelClass}>
          {t('form.description')}
          <textarea rows={3} value={form.description} onChange={set('description')} className={`${inputClass} h-auto resize-y py-2.5`} />
        </label>

        {mode === 'edit' && (
          <label className={labelClass}>
            {t('form.printNote')}
            <textarea
              rows={3}
              value={form.printNote}
              onChange={set('printNote')}
              placeholder={t('form.printNotePlaceholder')}
              aria-invalid={!!errors.printNote || undefined}
              className={`${inputClass} h-auto resize-y py-2.5 ${errors.printNote ? errorField : ''}`}
            />
            <span className="flex justify-between gap-3 text-xs font-normal">
              <span className={errors.printNote ? 'text-ar-danger' : 'text-ar-muted'}>
                {errors.printNote ? t('form.printNoteTooLong', { max: PRINT_NOTE_MAX }) : t('form.printNoteHint')}
              </span>
              <span className={`flex-none tabular-nums ${form.printNote.length > PRINT_NOTE_MAX ? 'text-ar-danger' : 'text-ar-muted'}`}>
                {t('form.count', { count: form.printNote.length, max: PRINT_NOTE_MAX })}
              </span>
            </span>
          </label>
        )}
      </form>
    </Modal>
  );
}
