'use client';

/**
 * Shared pieces of the Nhân viên screens (#528 list, #544 add / detail) on the shell tokens.
 */
import React, { useId, useState } from 'react';
import Link from 'next/link';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { fieldClass } from '../orders/create/parts';
import { cardClass, type T } from '../orders/list/parts';
import { roleTone, staffInitials, type StaffLike, type StaffRoleTone } from './users-model';
import type { OutletOption, StaffRole } from './staff-form-model';

export const ROLE_CLASS: Record<StaffRoleTone, string> = {
  owner: 'bg-ar-line text-ar-ink',
  admin: 'bg-ar-reserved-bg text-ar-reserved',
  staff: 'bg-ar-subtle text-ar-ink-2',
  other: 'bg-ar-subtle text-ar-muted',
};

export const pageClass = 'mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8';
export const dangerBtn =
  'inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-ar-danger px-3.5 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50';
export const inputClass = `${fieldClass} disabled:cursor-not-allowed disabled:bg-ar-surface-muted disabled:text-ar-muted`;

export function RoleTag({ role, t }: { role?: string | null; t: T }) {
  const tone = roleTone(role);
  return <span className={`inline-block whitespace-nowrap rounded-[7px] px-2 py-[3px] text-sm font-bold ${ROLE_CLASS[tone]}`}>{t(`roles.${tone}`)}</span>;
}

export function StatusPill({ active, t }: { active: boolean; t: T }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-sm font-semibold ${active ? 'bg-ar-done-bg text-ar-done' : 'bg-ar-subtle text-ar-muted'}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-ar-done' : 'bg-ar-muted'}`} />
      {active ? t('detail.statusActive') : t('detail.statusLocked')}
    </span>
  );
}

export function Avatar({ user, size = 36, className = 'bg-ar-subtle' }: { user: StaffLike; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`flex flex-none items-center justify-center rounded-full font-bold text-ar-ink-2 ${size > 40 ? 'text-lg' : 'text-sm'} ${className}`}
    >
      {staffInitials(user)}
    </span>
  );
}

export function BackLink({ label }: { label: string }) {
  return (
    <Link href="/users" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-ar-muted no-underline hover:text-ar-ink">
      <ShellIcon d={ICONS.chevronLeft} size={16} />
      {label}
    </Link>
  );
}

export function NoAccess({ title, text }: { title: string; text: string }) {
  return (
    <div className={pageClass}>
      <h1 className="m-0 text-2xl font-bold">{title}</h1>
      <p className={`${cardClass} m-0 px-5 py-6 text-[15px] text-ar-muted`}>{text}</p>
    </div>
  );
}

/** Label above, error (or hint) below; the control gets `id` and the error id for aria. */
export function Field({
  label,
  required,
  error,
  hint,
  className = '',
  children,
}: {
  label: string;
  required?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ar-ink-2">
        {label} {required && <span className="font-normal text-ar-danger">{required}</span>}
      </label>
      {children({ id, describedBy: error || hint ? msgId : undefined, invalid: !!error })}
      {error ? (
        <span id={msgId} className="text-sm text-ar-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={msgId} className="text-xs text-ar-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  describedBy,
  invalid,
  disabled,
  t,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  t: T;
}) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative flex">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={`${inputClass} pr-16 ${invalid ? 'border-ar-danger' : ''}`}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? t('form.hidePassword') : t('form.showPassword')}
        aria-pressed={shown}
        className="absolute inset-y-1 right-1 rounded-lg px-3 text-sm font-semibold text-ar-muted hover:bg-ar-subtle hover:text-ar-ink"
      >
        {shown ? t('form.hide') : t('form.show')}
      </button>
    </span>
  );
}

/** Two radio cards: Quản lý chi nhánh / Nhân viên with what each role can do. */
export function RoleCards({
  choices,
  value,
  onChange,
  disabled,
  labelledBy,
  t,
}: {
  choices: StaffRole[];
  value: string;
  onChange: (role: StaffRole) => void;
  disabled?: boolean;
  labelledBy: string;
  t: T;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
      {choices.map((role) => {
        const tone = roleTone(role);
        const on = value === role;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(role)}
            className={`flex flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
              on ? 'border-ar-primary bg-ar-primary-soft ring-1 ring-ar-primary' : 'border-ar-line bg-ar-surface hover:bg-ar-subtle'
            }`}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${on ? 'border-ar-primary' : 'border-ar-line-strong'}`}>
                {on && <span className="h-2 w-2 rounded-full bg-ar-primary" />}
              </span>
              <span className={`rounded-[7px] px-2 py-[2px] text-sm font-bold ${ROLE_CLASS[tone]}`}>{t(`roles.${tone}`)}</span>
            </span>
            <span className="text-sm leading-5 text-ar-ink-2">{t(`rolesCard.${tone}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Outlet chips (radio). Read-only text when the caller cannot pick. */
export function OutletChips({
  outlets,
  value,
  onChange,
  loading,
  labelledBy,
  describedBy,
  t,
}: {
  outlets: OutletOption[];
  value: number | null;
  onChange: (id: number) => void;
  loading?: boolean;
  labelledBy: string;
  describedBy?: string;
  t: T;
}) {
  if (loading) return <span className="text-sm text-ar-muted">{t('form.outletsLoading')}</span>;
  if (outlets.length === 0) return <span className="text-sm text-ar-muted">{t('form.noOutlets')}</span>;
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy} className="flex flex-wrap gap-2">
      {outlets.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`min-h-9 max-w-full truncate rounded-full px-3.5 py-1.5 text-sm ${on ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'}`}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
