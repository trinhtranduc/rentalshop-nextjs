'use client';

/**
 * Thêm nhân viên (#544) on the shell. Same call as before (`usersApi.createUser`) and the same rules
 * as the old shared UserForm (see staff-form-model). Merchants pick the outlet; an outlet admin's new
 * staff go to their own outlet. On success the new staff page opens.
 */
import React, { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
import { outletsApi, usersApi } from '@rentalshop/utils';
import type { UserCreateInput } from '@rentalshop/types';
import { cardClass, outlineBtn, primaryBtn, type T } from '../../orders/list/parts';
import {
  EMPTY_STAFF_FORM,
  canCreateStaff,
  canPickOutlet,
  createPayload,
  readOutlets,
  roleChoices,
  validateStaffForm,
  type OutletOption,
  type StaffFormErrors,
  type StaffFormValues,
} from '../staff-form-model';
import { BackLink, Field, NoAccess, OutletChips, PasswordInput, RoleCards, inputClass, pageClass } from '../staff-parts';

type Viewer = {
  id?: number | string;
  role?: string;
  merchantId?: number | null;
  outletId?: number | null;
  merchant?: { id?: number; tenantKey?: string | null } | null;
  outlet?: { id?: number; name?: string | null } | null;
};

function Section({ title, titleId, children }: { title: string; titleId?: string; children: React.ReactNode }) {
  return (
    <section className={`${cardClass} flex flex-col gap-4 px-5 py-[18px]`} aria-labelledby={titleId}>
      <h2 id={titleId} className="m-0 text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function AddUserPage() {
  const router = useRouter();
  const t = useTranslations('users.web') as unknown as T;
  const tm = useTranslations('users.messages');
  const { user } = useAuth();
  const { toastSuccess } = useToast();
  const viewer = (user || null) as Viewer | null;
  const allowed = canCreateStaff(viewer?.role);
  const pickOutlet = canPickOutlet(viewer?.role);
  const merchantId = viewer?.merchantId || viewer?.merchant?.id || null;
  const ownOutletId = viewer?.outletId || viewer?.outlet?.id || null;
  const tenantKey = viewer?.merchant?.tenantKey || '';

  const [form, setForm] = useState<StaffFormValues>(EMPTY_STAFF_FORM);
  const [errors, setErrors] = useState<StaffFormErrors>({});
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [saving, setSaving] = useState(false);
  // #682: the Nhân viên kho card shows once the API allows the role
  const [inventoryRole, setInventoryRole] = useState(false);
  const roleTitleId = useId();

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    usersApi.inventoryRoleEnabled().then((on) => {
      if (!cancelled) setInventoryRole(on);
    });
    return () => {
      cancelled = true;
    };
  }, [allowed]);
  const outletTitleId = useId();

  // Outlet admin: their outlet, fixed. Merchant: pick from GET /api/outlets (only one → preselected).
  useEffect(() => {
    if (!allowed) return;
    if (!pickOutlet) {
      if (ownOutletId) setForm((f) => ({ ...f, outletId: ownOutletId }));
      return;
    }
    let cancelled = false;
    setLoadingOutlets(true);
    outletsApi
      .getOutlets()
      .then((res) => {
        if (cancelled) return;
        const list = readOutlets(res?.data);
        setOutlets(list);
        if (list.length === 1) setForm((f) => (f.outletId ? f : { ...f, outletId: list[0].id }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingOutlets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, pickOutlet, ownOutletId]);

  const set = <K extends keyof StaffFormValues>(key: K, value: StaffFormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const err = (key: keyof StaffFormValues) => (errors[key] ? t(`form.errors.${errors[key]}`) : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problems = validateStaffForm(form, 'create');
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"] [role="radio"]');
      first?.focus();
      return;
    }
    setSaving(true);
    try {
      const res = await usersApi.createUser(createPayload(form, merchantId) as UserCreateInput);
      if (res.success) {
        toastSuccess(tm('createSuccess'), tm('createSuccess'));
        const newId = (res.data as { id?: number } | undefined)?.id;
        router.push(newId ? `/users/${newId}` : '/users');
        return;
      }
      // Errors: the global API error handler shows the toast.
    } catch {
      // Same.
    }
    setSaving(false);
  };

  if (user && !allowed) return <NoAccess title={t('form.addTitle')} text={t('noAccess')} />;

  const outletName = viewer?.outlet?.name || (ownOutletId ? `#${ownOutletId}` : '—');
  const required = t('form.required');

  return (
    <form onSubmit={submit} noValidate className={pageClass}>
      <div className="flex flex-col gap-2">
        <BackLink label={t('title')} />
        <h1 className="m-0 text-2xl font-bold">{t('form.addTitle')}</h1>
      </div>

      <div className="flex w-full max-w-[880px] flex-col gap-4">
        <Section title={t('form.infoTitle')}>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
            <Field label={t('form.name')} error={err('name')}>
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  autoComplete="off"
                  placeholder={t('form.namePlaceholder')}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  className={`${inputClass} ${invalid ? 'border-ar-danger' : ''}`}
                />
              )}
            </Field>
            <Field label={t('form.phone')} error={err('phone')}>
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  autoComplete="off"
                  placeholder={t('form.optional')}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  className={`${inputClass} ${invalid ? 'border-ar-danger' : ''}`}
                />
              )}
            </Field>
            <Field label={t('form.email')} required={required} error={err('email')} hint={t('form.emailHint')} className="[grid-column:1/-1]">
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  autoComplete="off"
                  placeholder={tenantKey ? `${tenantKey}_` : t('form.emailPlaceholder')}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  className={`${inputClass} ${invalid ? 'border-ar-danger' : ''}`}
                />
              )}
            </Field>
          </div>
        </Section>

        <Section title={t('form.roleTitle')}>
          <div className="flex flex-col gap-1.5" data-invalid={errors.role ? 'true' : undefined}>
            <span id={roleTitleId} className="text-sm font-semibold text-ar-ink-2">
              {t('form.role')} <span className="font-normal text-ar-danger">{required}</span>
            </span>
            <RoleCards choices={roleChoices(viewer?.role, { inventoryRole })} value={form.role} onChange={(r) => set('role', r)} labelledBy={roleTitleId} t={t} />
            {errors.role && <span className="text-sm text-ar-danger">{err('role')}</span>}
          </div>
          <div className="flex flex-col gap-1.5" data-invalid={errors.outletId ? 'true' : undefined}>
            <span id={outletTitleId} className="text-sm font-semibold text-ar-ink-2">
              {t('form.outlet')} <span className="font-normal text-ar-danger">{required}</span>
            </span>
            {pickOutlet ? (
              <OutletChips
                outlets={outlets}
                value={form.outletId}
                onChange={(id) => set('outletId', id)}
                loading={loadingOutlets}
                labelledBy={outletTitleId}
                t={t}
              />
            ) : (
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-ar-ink">{outletName}</span>
                <span className="text-sm text-ar-muted">{t('form.outletFixed')}</span>
              </span>
            )}
            {errors.outletId && <span className="text-sm text-ar-danger">{err('outletId')}</span>}
          </div>
        </Section>

        <Section title={t('form.passwordTitle')}>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
            <Field label={t('form.password')} required={required} error={err('password')} hint={t('form.passwordHint')}>
              {({ id, describedBy, invalid }) => (
                <PasswordInput id={id} value={form.password} onChange={(v) => set('password', v)} autoComplete="new-password" describedBy={describedBy} invalid={invalid} t={t} />
              )}
            </Field>
            <Field label={t('form.confirmPassword')} required={required} error={err('confirmPassword')}>
              {({ id, describedBy, invalid }) => (
                <PasswordInput
                  id={id}
                  value={form.confirmPassword}
                  onChange={(v) => set('confirmPassword', v)}
                  autoComplete="new-password"
                  describedBy={describedBy}
                  invalid={invalid}
                  t={t}
                />
              )}
            </Field>
          </div>
          <p className="m-0 text-sm text-ar-muted">{t('form.loginNote')}</p>
        </Section>

        <div className={`${cardClass} sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 px-4 py-3`}>
          <button type="button" onClick={() => router.push('/users')} disabled={saving} className={`${outlineBtn} h-11 rounded-xl px-[18px]`}>
            {t('form.cancel')}
          </button>
          <button type="submit" disabled={saving} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
            {saving ? t('form.creating') : t('form.create')}
          </button>
        </div>
      </div>
    </form>
  );
}
