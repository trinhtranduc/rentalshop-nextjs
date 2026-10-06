'use client';

/**
 * #541 one customer form for `/customers/add` and `/customers/[id]/edit`. Validation and the
 * payloads live in ../customer-form-model (unit-tested); the page does the API call.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { cardClass, outlineBtn, primaryBtn, type T } from '../../orders/list/parts';
import {
  firstError,
  saveErrorKey,
  validateCustomerForm,
  type CustomerFormValues,
  type FormErrors,
  type FormField,
  type FormMode,
} from '../customer-form-model';

export type SaveResult = { ok: true } | { ok: false; code?: string };

// Same look as `fieldClass` (orders/create/parts) with the border colour chosen here, so an error can win over focus.
const inputBase = 'w-full rounded-xl border bg-ar-surface px-3 text-base font-normal text-ar-ink placeholder:text-ar-faint focus:outline-none';
const okBorder = 'border-ar-line-strong focus:border-ar-primary focus:ring-1 focus:ring-ar-primary';
const badBorder = 'border-ar-danger focus:ring-1 focus:ring-ar-danger';

function Field({
  id,
  label,
  required,
  error,
  hint,
  className = '',
  children,
}: {
  id: string;
  label: string;
  required?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ar-ink-2">
        {label} {required && <span className="font-normal text-ar-danger">({required})</span>}
      </label>
      {children}
      {error ? (
        <span id={`${id}-msg`} className="text-sm text-ar-danger">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-msg`} className="text-xs text-ar-muted">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

function Section({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 px-5 py-[18px] ${first ? '' : 'border-t border-ar-subtle'}`}>
      <h2 className="m-0 text-lg font-bold text-ar-ink">{title}</h2>
      {children}
    </section>
  );
}

export function CustomerForm({
  mode,
  initial,
  hadPhone,
  cancelHref,
  onSave,
  t,
}: {
  mode: FormMode;
  initial: CustomerFormValues;
  /** Edit: the customer already has a phone number, so it cannot be cleared. */
  hadPhone?: boolean;
  cancelHref: string;
  onSave: (values: CustomerFormValues) => Promise<SaveResult>;
  /** `customers.web` messages. */
  t: T;
}) {
  const [values, setValues] = useState<CustomerFormValues>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);
  const initialKey = useMemo(() => JSON.stringify(initial), [initial]);
  const dirty = JSON.stringify(values) !== initialKey;

  const set = (field: FormField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValues((s) => ({ ...s, [field]: v }));
    if (errors[field]) setErrors((s) => ({ ...s, [field]: undefined }));
    if (problem) setProblem('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const found = validateCustomerForm(values, { mode, hadPhone });
    setErrors(found);
    const bad = firstError(found);
    if (bad) {
      document.getElementById(`cf-${bad}`)?.focus();
      return;
    }
    setSaving(true);
    setProblem('');
    let result: SaveResult;
    try {
      result = await onSave(values);
    } catch {
      result = { ok: false };
    }
    if (!result.ok) {
      setProblem(t(`form.${saveErrorKey(result.code)}`));
      setSaving(false);
    }
    // On success the page navigates away; keep the button disabled until it does.
  };

  const input = (field: Exclude<FormField, 'notes'>, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={`cf-${field}`}
      name={field}
      value={values[field]}
      onChange={set(field)}
      aria-invalid={errors[field] ? true : undefined}
      aria-describedby={errors[field] || extra['aria-describedby'] ? `cf-${field}-msg` : undefined}
      className={`${inputBase} h-11 ${errors[field] ? badBorder : okBorder}`}
      {...extra}
    />
  );
  const err = (field: FormField) => (errors[field] ? t(`form.errors.${errors[field]}`) : undefined);
  const grid = 'grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]';

  return (
    <form onSubmit={submit} noValidate className={`${cardClass} overflow-hidden`}>
      <Section title={t('form.contact')} first>
        <Field id="cf-name" label={t('form.name')} required={t('form.required')} error={err('name')}>
          {input('name', { autoComplete: 'off', placeholder: t('form.namePlaceholder'), autoFocus: mode === 'create' })}
        </Field>
        <div className={grid}>
          <Field id="cf-phone" label={t('form.phone')} required={mode === 'edit' && hadPhone ? t('form.required') : undefined} error={err('phone')}>
            {input('phone', { type: 'tel', inputMode: 'tel', autoComplete: 'off', placeholder: t('form.phonePlaceholder') })}
          </Field>
          <Field id="cf-email" label={t('form.email')} error={err('email')}>
            {input('email', { type: 'email', autoComplete: 'off', autoCapitalize: 'none', spellCheck: false, placeholder: t('form.emailPlaceholder') })}
          </Field>
        </div>
      </Section>

      <Section title={t('form.addressTitle')}>
        <Field id="cf-address" label={t('form.address')}>
          {input('address')}
        </Field>
        <div className={grid}>
          <Field id="cf-city" label={t('form.city')}>
            {input('city')}
          </Field>
          <Field id="cf-state" label={t('form.state')}>
            {input('state')}
          </Field>
          <Field id="cf-zipCode" label={t('form.zipCode')}>
            {input('zipCode', { inputMode: 'numeric' })}
          </Field>
        </div>
      </Section>

      <Section title={t('form.moreTitle')}>
        <Field id="cf-idNumber" label={t('form.idNumber')} hint={t('form.idNumberHint')}>
          {input('idNumber', { autoComplete: 'off', 'aria-describedby': 'cf-idNumber-msg' })}
        </Field>
        <Field id="cf-notes" label={t('form.notes')}>
          <textarea
            id="cf-notes"
            name="notes"
            rows={3}
            value={values.notes}
            onChange={set('notes')}
            placeholder={t('form.notesPlaceholder')}
            className={`${inputBase} ${okBorder} resize-y py-2.5`}
          />
        </Field>
      </Section>

      {problem && (
        <p role="alert" className="m-0 border-t border-ar-subtle px-5 py-3 text-[15px] font-semibold text-ar-danger">
          {problem}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5">
        <Link href={cancelHref} className={`${outlineBtn} h-11 rounded-xl px-[18px]`}>
          {t('form.cancel')}
        </Link>
        <button type="submit" disabled={saving || (mode === 'edit' && !dirty)} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
          {saving ? t('form.saving') : mode === 'create' ? t('form.saveCreate') : t('form.saveEdit')}
        </button>
      </div>
    </form>
  );
}
