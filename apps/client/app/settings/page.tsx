'use client';

/**
 * Cài đặt cửa hàng (#528, board Cai-dat). Left: the tabs the role may open (settings-model, same
 * rules as the old Settings menu), right: one card per tab. `?tab=` keeps the old ids so links
 * from elsewhere still land. Calls are the old ones: PUT /api/settings/merchant | outlet | user,
 * POST /api/auth/change-password, GET /api/outlets, PUT /api/outlets/{id} (receipt note),
 * GET subscription status. Bank accounts and the billing panel reuse the shared sections inside
 * `.ar-legacy`, which gives them the dark tokens.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@rentalshop/hooks';
import { BankAccountSection, useCurrency, useToast } from '@rentalshop/ui';
import { authApi, outletsApi, settingsApi, subscriptionsApi, usersApi } from '@rentalshop/utils';
import { SettingsSubscriptionMerchantActions } from '../components/SettingsSubscriptionMerchantActions';
import { Skeleton, cardClass, outlineBtn, primaryBtn, type T } from '../orders/list/parts';
import { Modal, fieldClass } from '../orders/create/parts';
import {
  addressLine,
  currencyForLocale,
  mapSubscriptionStatus,
  passwordProblem,
  publicLinks,
  resolveTab,
  tabsForRole,
  tenantKeyValid,
  type SettingsTab,
} from './settings-model';

const dangerBtn =
  'inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-ar-danger px-3.5 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50';
const smallOutline =
  'inline-flex h-9 items-center rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-sm font-semibold text-ar-ink no-underline hover:bg-ar-subtle';
const labelClass = 'flex flex-col gap-1.5 text-sm font-semibold text-ar-ink-2';
const textareaClass =
  'w-full resize-y rounded-xl border border-ar-line-strong bg-ar-surface px-3 py-2.5 text-base font-normal text-ar-ink placeholder:text-ar-faint focus:border-ar-primary focus:outline-none disabled:bg-ar-subtle disabled:text-ar-muted';
const twoCols = 'grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]';
const RECEIPT_MAX = 500;

// The auth user is loosely typed across the shared hooks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = any;

function Card({ title, action, children, footer, id }: { title: string; action?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={`${cardClass} overflow-hidden`} aria-label={title}>
      <div className="flex flex-col gap-4 px-5 py-[18px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-bold">{title}</h2>
          {action}
        </div>
        {children}
      </div>
      {footer && <div className="flex justify-end gap-2 border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5">{footer}</div>}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  requiredLabel,
  disabled,
  placeholder,
  hint,
  error,
  type = 'text',
  className = '',
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  /** Shown after the label when the field is required. */
  requiredLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`${labelClass} ${className}`}>
      <span>
        {label}
        {requiredLabel && <span className="font-normal text-ar-danger"> {requiredLabel}</span>}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${fieldClass} font-normal disabled:bg-ar-subtle disabled:text-ar-muted ${error ? 'border-ar-danger' : ''}`}
      />
      {error ? <span className="text-sm font-normal text-ar-danger">{error}</span> : hint ? <span className="text-sm font-normal text-ar-muted">{hint}</span> : null}
    </label>
  );
}

function SaveFooter({ t, dirty, saving, onReset, label }: { t: T; dirty: boolean; saving: boolean; onReset: () => void; label?: string }) {
  return (
    <>
      <button type="button" className={outlineBtn} disabled={!dirty || saving} onClick={onReset}>
        {t('cancel')}
      </button>
      <button type="submit" className={primaryBtn} disabled={saving || !dirty}>
        {saving ? t('saving') : label || t('save')}
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Outlets of the caller (the API scopes the list)
// ---------------------------------------------------------------------------

type OutletRow = {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  printNote?: string | null;
};

function useOutlets() {
  const [state, setState] = useState<{ rows: OutletRow[]; loading: boolean; failed: boolean }>({ rows: [], loading: true, failed: false });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: false }));
    outletsApi
      .getOutlets()
      .then((res) => {
        const data = res?.data as { outlets?: OutletRow[] } | OutletRow[] | undefined;
        const rows = Array.isArray(data) ? data : data?.outlets || [];
        if (!cancelled) setState({ rows, loading: false, failed: !res?.success });
      })
      .catch(() => {
        if (!cancelled) setState({ rows: [], loading: false, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

// ---------------------------------------------------------------------------
// Thông tin cửa hàng (merchant) + Chi nhánh
// ---------------------------------------------------------------------------

type MerchantForm = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  description: string;
  taxId: string;
  tenantKey: string;
};

function merchantForm(m: AnyUser): MerchantForm {
  return {
    name: m?.name || '',
    phone: m?.phone || '',
    address: m?.address || '',
    city: m?.city || '',
    state: m?.state || '',
    zipCode: m?.zipCode || '',
    country: m?.country || '',
    description: m?.description || '',
    taxId: m?.taxId || '',
    tenantKey: m?.tenantKey || '',
  };
}

function MerchantTab({ t, user, refreshUser }: { t: T; user: AnyUser; refreshUser: () => Promise<void> }) {
  const { toastSuccess, toastError } = useToast();
  const locale = useLocale();
  const { currency, setCurrency } = useCurrency();
  const initial = useMemo(() => merchantForm(user?.merchant), [user?.merchant]);
  const [form, setForm] = useState<MerchantForm>(initial);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const outlets = useOutlets();

  useEffect(() => setForm(initial), [initial]);

  // The old merchant tab kept the shop currency in step with the UI language (vi → VND, else USD).
  useEffect(() => {
    const target = currencyForLocale(locale);
    if (!currency || currency === target) return;
    settingsApi
      .updateMerchantCurrency({ currency: target })
      .then((res) => {
        if (res.success) setCurrency(target);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const set = (key: keyof MerchantForm) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const nameError = touched && !form.name.trim() ? t('errors.nameRequired') : null;
  const keyError = tenantKeyValid(form.tenantKey) ? null : t('errors.tenantKey');
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const links = publicLinks(origin, {
    publicProductLink: user?.merchant?.publicProductLink,
    tenantKey: user?.merchant?.tenantKey,
    referralCode: user?.merchant?.referralCode,
  });

  const save = async () => {
    setTouched(true);
    if (!form.name.trim() || keyError) return;
    setSaving(true);
    try {
      const res = await settingsApi.updateMerchantInfo({ ...form, name: form.name.trim() } as Parameters<typeof settingsApi.updateMerchantInfo>[0]);
      if (res.success) {
        await refreshUser();
        toastSuccess(t('saved'), t('merchantSaved'));
      } else {
        toastError(t('saveFailed'), res.error || t('merchantSaveFailed'));
      }
    } catch {
      toastError(t('saveFailed'), t('merchantSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Card title={t('tabs.merchant')} footer={<SaveFooter t={t} dirty={dirty} saving={saving} onReset={() => setForm(initial)} />}>
          <div className={twoCols}>
            <Field label={t('fields.shopName')} value={form.name} onChange={set('name')} requiredLabel={t('required')} error={nameError} />
            <Field label={t('fields.phone')} value={form.phone} onChange={set('phone')} type="tel" />
          </div>
          <fieldset className="m-0 grid gap-3.5 rounded-xl border border-ar-line px-4 pb-4 pt-3.5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            <legend className="px-1.5 text-sm font-bold text-ar-ink-2">{t('fields.address')}</legend>
            <Field className="col-span-full" label={t('fields.street')} value={form.address} onChange={set('address')} />
            <Field label={t('fields.city')} value={form.city} onChange={set('city')} />
            <Field label={t('fields.district')} value={form.state} onChange={set('state')} />
            <Field label={t('fields.country')} value={form.country} onChange={set('country')} />
            <Field label={t('fields.zipCode')} value={form.zipCode} onChange={set('zipCode')} placeholder={t('optional')} />
          </fieldset>
          <label className={labelClass}>
            {t('fields.description')}
            <textarea rows={3} value={form.description} onChange={(e) => set('description')(e.target.value)} className={textareaClass} />
          </label>
          <div className={twoCols}>
            <Field label={t('fields.tenantKey')} value={form.tenantKey} onChange={(v) => set('tenantKey')(v.toLowerCase())} hint={t('fields.tenantKeyHint')} error={keyError} />
            <Field label={t('fields.taxId')} value={form.taxId} onChange={set('taxId')} placeholder={t('optional')} />
          </div>
          {(links.productLink || links.registrationLink) && (
            <div className="flex flex-col gap-1 text-sm text-ar-muted">
              {links.productLink && (
                <span className="break-all">
                  {t('publicPage')}:{' '}
                  <a href={links.productLink} target="_blank" rel="noreferrer" className="font-semibold text-ar-primary-ink">
                    {links.productLink}
                  </a>
                </span>
              )}
              {links.registrationLink && (
                <span className="break-all">
                  {t('referralLink')}: <span className="text-ar-ink-2">{links.registrationLink}</span>
                </span>
              )}
            </div>
          )}
        </Card>
      </form>

      <Card
        id="chi-nhanh"
        title={t('outlets')}
        action={
          <Link href="/outlets" className={smallOutline}>
            {t('manageOutlets')}
          </Link>
        }
      >
        {outlets.loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : outlets.failed ? (
          <p className="m-0 text-[15px] text-ar-muted">
            {t('loadFailed')}{' '}
            <button type="button" onClick={outlets.reload} className="border-0 bg-transparent p-0 font-semibold text-ar-primary-ink underline">
              {t('retry')}
            </button>
          </p>
        ) : (
          <ul className="-mx-5 -mb-[18px] list-none p-0">
            {outlets.rows.map((o) => (
              <li key={o.id} className="flex items-center gap-3 border-t border-ar-subtle px-5 py-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`text-[15px] font-semibold ${o.isActive === false ? 'text-ar-muted' : ''}`}>
                    {o.name}
                    {o.isDefault && <span className="ml-1.5 rounded-md bg-ar-reserved-bg px-1.5 py-0.5 text-xs font-semibold text-ar-reserved">{t('mainOutlet')}</span>}
                    {o.isActive === false && <span className="ml-1.5 rounded-md bg-ar-subtle px-1.5 py-0.5 text-xs font-semibold text-ar-muted">{t('outletOff')}</span>}
                  </span>
                  <span className="text-sm text-ar-muted">{addressLine(o) || t('noAddress')}</span>
                </span>
                <Link href={`/outlets/${o.id}/bank-accounts`} className={smallOutline}>
                  {t('tabs.bank-accounts')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Chi nhánh của tôi (outlet roles)
// ---------------------------------------------------------------------------

type OutletForm = { name: string; phone: string; address: string; description: string };
const outletForm = (o: AnyUser): OutletForm => ({ name: o?.name || '', phone: o?.phone || '', address: o?.address || '', description: o?.description || '' });

function OutletTab({ t, user, refreshUser }: { t: T; user: AnyUser; refreshUser: () => Promise<void> }) {
  const { toastSuccess, toastError } = useToast();
  // Saving needs outlet.manage; staff only view, as the old section hid "Sửa" for them.
  const canEdit = String(user?.role || '').toUpperCase() === 'OUTLET_ADMIN';
  const initial = useMemo(() => outletForm(user?.outlet), [user?.outlet]);
  const [form, setForm] = useState<OutletForm>(initial);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => setForm(initial), [initial]);
  const set = (key: keyof OutletForm) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const nameError = touched && !form.name.trim() ? t('errors.nameRequired') : null;
  const addressError = touched && !form.address.trim() ? t('errors.addressRequired') : null;

  const save = async () => {
    setTouched(true);
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);
    try {
      const res = await settingsApi.updateOutletInfo({ ...form, name: form.name.trim(), address: form.address.trim() });
      if (res.success) {
        await refreshUser();
        toastSuccess(t('saved'), t('outletSaved'));
      } else {
        toastError(t('saveFailed'), res.error || t('outletSaveFailed'));
      }
    } catch {
      toastError(t('saveFailed'), t('outletSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!user?.outlet) {
    return (
      <Card title={t('tabs.outlet')}>
        <p className="m-0 text-[15px] text-ar-muted">{t('noOutlet')}</p>
      </Card>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (canEdit) void save();
      }}
    >
      <Card title={t('tabs.outlet')} footer={canEdit ? <SaveFooter t={t} dirty={dirty} saving={saving} onReset={() => setForm(initial)} /> : undefined}>
        {!canEdit && <p className="m-0 text-sm text-ar-muted">{t('outletReadOnly')}</p>}
        <div className={twoCols}>
          <Field label={t('fields.outletName')} value={form.name} onChange={set('name')} disabled={!canEdit} requiredLabel={canEdit ? t('required') : undefined} error={nameError} />
          <Field label={t('fields.phone')} value={form.phone} onChange={set('phone')} disabled={!canEdit} type="tel" />
        </div>
        <Field label={t('fields.address')} value={form.address} onChange={set('address')} disabled={!canEdit} requiredLabel={canEdit ? t('required') : undefined} error={addressError} />
        <label className={labelClass}>
          {t('fields.description')}
          <textarea rows={3} value={form.description} disabled={!canEdit} onChange={(e) => set('description')(e.target.value)} className={textareaClass} />
        </label>
      </Card>
    </form>
  );
}

// ---------------------------------------------------------------------------
// In hoá đơn: note printed at the bottom of rent receipts, per outlet (#347)
// ---------------------------------------------------------------------------

function ReceiptTab({ t }: { t: T }) {
  const { toastSuccess, toastError } = useToast();
  const outlets = useOutlets();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  useEffect(() => {
    const next = Object.fromEntries(outlets.rows.map((o) => [o.id, o.printNote || '']));
    setDrafts(next);
    setSaved(next);
  }, [outlets.rows]);

  const save = async (o: OutletRow) => {
    const note = drafts[o.id] ?? '';
    setSaving(o.id);
    try {
      const res = await outletsApi.updateOutlet(o.id, { printNote: note } as Parameters<typeof outletsApi.updateOutlet>[1]);
      if (!res.success) throw new Error(res.error || '');
      setSaved((s) => ({ ...s, [o.id]: note }));
      toastSuccess(t('saved'), outlets.rows.length > 1 ? `${t('receiptNote')} — ${o.name}` : t('receiptNote'));
    } catch (error) {
      toastError(t('saveFailed'), error instanceof Error && error.message ? error.message : t('receiptNote'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card title={t('tabs.receipt')}>
      <p className="m-0 text-sm text-ar-muted">{t('receiptHint')}</p>
      {outlets.loading ? (
        <Skeleton className="h-24" />
      ) : outlets.failed ? (
        <p className="m-0 text-[15px] text-ar-muted">
          {t('loadFailed')}{' '}
          <button type="button" onClick={outlets.reload} className="border-0 bg-transparent p-0 font-semibold text-ar-primary-ink underline">
            {t('retry')}
          </button>
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {outlets.rows.map((o) => {
            const value = drafts[o.id] ?? '';
            const dirty = value !== (saved[o.id] ?? '');
            return (
              <li key={o.id} className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  {outlets.rows.length > 1 ? o.name : t('receiptNote')}
                  <textarea rows={3} maxLength={RECEIPT_MAX} value={value} onChange={(e) => setDrafts((d) => ({ ...d, [o.id]: e.target.value }))} className={textareaClass} />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs tabular-nums text-ar-muted">
                    {value.length}/{RECEIPT_MAX}
                  </span>
                  <button type="button" className={primaryBtn} disabled={!dirty || saving === o.id} onClick={() => void save(o)}>
                    {saving === o.id ? t('saving') : t('save')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Gói dịch vụ (merchant): the client billing panel, unchanged
// ---------------------------------------------------------------------------

function SubscriptionTab({ role }: { role: string }) {
  const [data, setData] = useState<ReturnType<typeof mapSubscriptionStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subscriptionsApi.getCurrentUserSubscriptionStatus();
      setData(res.success && res.data ? mapSubscriptionStatus(res.data) : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <div className="ar-legacy">
      <SettingsSubscriptionMerchantActions subscriptionData={data} subscriptionLoading={loading} onSubscriptionRefresh={refresh} currentUserRole={role} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tài khoản của tôi
// ---------------------------------------------------------------------------

function ProfileTab({ t, user, refreshUser }: { t: T; user: AnyUser; refreshUser: () => Promise<void> }) {
  const { toastSuccess, toastError } = useToast();
  const initial = useMemo(
    () => ({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' }),
    [user?.firstName, user?.lastName, user?.phone],
  );
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    try {
      const res = await settingsApi.updateUserProfile(form);
      if (res.success) {
        await refreshUser();
        toastSuccess(t('saved'), t('profileSaved'));
      } else {
        toastError(t('saveFailed'), res.error || t('profileSaveFailed'));
      }
    } catch {
      toastError(t('saveFailed'), t('profileSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Card title={t('tabs.profile')} footer={<SaveFooter t={t} dirty={dirty} saving={saving} onReset={() => setForm(initial)} />}>
        <div className={twoCols}>
          <Field label={t('fields.lastName')} value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
          <Field label={t('fields.firstName')} value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
          <Field label={t('fields.phone')} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} type="tel" />
          <Field label={t('fields.email')} value={user?.email || ''} disabled hint={t('emailLocked')} />
        </div>
      </Card>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Đổi mật khẩu, đăng xuất, xoá tài khoản
// ---------------------------------------------------------------------------

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

function AccountTab({ t, user, logout }: { t: T; user: AnyUser; logout: () => Promise<void> | void }) {
  const { toastSuccess, toastError } = useToast();
  const [pw, setPw] = useState(EMPTY_PASSWORDS);
  const [problem, setProblem] = useState<ReturnType<typeof passwordProblem>>(null);
  const [changing, setChanging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const change = async () => {
    const p = passwordProblem(pw);
    setProblem(p);
    if (p) return;
    setChanging(true);
    try {
      // A wrong current password and other API errors are shown by the global API error handler.
      const res = await authApi.changePassword(pw.currentPassword, pw.newPassword);
      if (res.success) {
        setPw(EMPTY_PASSWORDS);
        toastSuccess(t('saved'), t('passwordChanged'));
      }
    } catch {
      // network failure: the global handler reports it
    } finally {
      setChanging(false);
    }
  };

  const remove = async () => {
    if (!user?.id) return;
    setDeleting(true);
    try {
      const res = await usersApi.deleteUser(user.id);
      if (res.success) {
        toastSuccess(t('saved'), t('accountDeleted'));
        await logout();
      } else {
        toastError(t('saveFailed'), res.message || t('accountDeleteFailed'));
      }
    } catch {
      toastError(t('saveFailed'), t('accountDeleteFailed'));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const setField = (key: keyof typeof EMPTY_PASSWORDS) => (v: string) => setPw((p) => ({ ...p, [key]: v }));

  return (
    <>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void change();
        }}
      >
        <Card
          title={t('tabs.account')}
          footer={
            <button type="submit" className={primaryBtn} disabled={changing || !pw.currentPassword || !pw.newPassword}>
              {changing ? t('saving') : t('changePassword')}
            </button>
          }
        >
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <Field
              type="password"
              label={t('fields.currentPassword')}
              value={pw.currentPassword}
              onChange={setField('currentPassword')}
              error={problem === 'currentRequired' ? t('errors.currentRequired') : null}
            />
            <Field
              type="password"
              label={t('fields.newPassword')}
              value={pw.newPassword}
              onChange={setField('newPassword')}
              hint={t('passwordHint')}
              error={problem === 'tooShort' ? t('errors.tooShort') : null}
            />
            <Field
              type="password"
              label={t('fields.confirmPassword')}
              value={pw.confirmPassword}
              onChange={setField('confirmPassword')}
              error={problem === 'mismatch' ? t('errors.mismatch') : null}
            />
          </div>
        </Card>
      </form>

      <Card title={t('session')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[15px] text-ar-ink-2">{t('signOutHint')}</span>
          <button type="button" className={outlineBtn} onClick={() => void logout()}>
            {t('signOut')}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ar-subtle pt-4">
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold text-ar-danger">{t('deleteAccount')}</span>
            <span className="text-sm text-ar-muted">{t('deleteAccountHint')}</span>
          </span>
          <button type="button" className={dangerBtn} onClick={() => setConfirmDelete(true)}>
            {t('deleteAccount')}
          </button>
        </div>
      </Card>

      <Modal
        open={confirmDelete}
        title={t('deleteAccountTitle')}
        onClose={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        closeLabel={t('close')}
        footer={
          <>
            <button type="button" data-close className={outlineBtn} disabled={deleting} onClick={() => setConfirmDelete(false)}>
              {t('cancel')}
            </button>
            <button type="button" className={dangerBtn} disabled={deleting} onClick={() => void remove()}>
              {deleting ? t('deleting') : t('deleteAccount')}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink-2">{t('deleteAccountBody')}</p>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Ngôn ngữ (the old section offered these two)
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
] as const;

function LanguageTab({ t }: { t: T }) {
  const router = useRouter();
  const locale = useLocale();
  const pick = (value: string) => {
    if (value === locale) return;
    try {
      localStorage.setItem('user_language_preference', value);
    } catch {
      // storage blocked: the cookie still carries the choice
    }
    document.cookie = `NEXT_LOCALE=${value};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  };
  return (
    <Card title={t('tabs.language')}>
      <div role="radiogroup" aria-label={t('tabs.language')} className="flex flex-col gap-2">
        {LANGUAGES.map((l) => {
          const on = l.value === locale;
          return (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(l.value)}
              className={`flex min-h-11 items-center justify-between rounded-xl border px-4 text-left text-[15px] ${
                on ? 'border-ar-primary bg-ar-primary-soft font-semibold text-ar-primary-ink' : 'border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'
              }`}
            >
              {l.label}
              {on && (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-10" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <p className="m-0 text-sm text-ar-muted">{t('languageHint')}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('settings.web') as unknown as T;
  const locale = useLocale();
  const { user, loading, logout, refreshUser } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const requested = searchParams.get('tab');
  const { tab, redirect } = resolveTab(requested, role);
  const tabs = tabsForRole(role);

  // Only once the role is known: before that every guarded tab resolves to the default.
  useEffect(() => {
    if (!user?.role) return;
    if (redirect) router.replace(redirect);
    else if (requested && requested !== tab) router.replace(`/settings?tab=${tab}`);
  }, [user?.role, redirect, requested, tab, router]);

  const refresh = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);
  const languageName = LANGUAGES.find((l) => l.value === locale)?.label || locale;

  const navItem = (id: SettingsTab) => {
    const on = id === tab;
    return (
      <button
        key={id}
        type="button"
        aria-current={on ? 'page' : undefined}
        onClick={() => router.push(`/settings?tab=${id}`, { scroll: false })}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-[10px] border-0 px-3 text-left text-[15px] ${
          on ? 'bg-ar-surface font-semibold text-ar-ink shadow-ar' : 'bg-transparent text-ar-ink-2 hover:bg-ar-surface'
        }`}
      >
        {t(`tabs.${id}`)}
        {id === 'language' && <span className="font-normal text-ar-muted">{languageName}</span>}
      </button>
    );
  };

  const shop = tabs.filter((x) => x.group === 'shop');
  const me = tabs.filter((x) => x.group === 'me');

  let body: React.ReactNode;
  if (loading && !user) body = <Skeleton className="h-72" />;
  else if (tab === 'merchant') body = <MerchantTab t={t} user={user} refreshUser={refresh} />;
  else if (tab === 'outlet') body = <OutletTab t={t} user={user} refreshUser={refresh} />;
  else if (tab === 'bank-accounts')
    body = (
      <div className="ar-legacy">
        <BankAccountSection user={user} />
      </div>
    );
  else if (tab === 'receipt') body = <ReceiptTab t={t} />;
  else if (tab === 'subscription') body = <SubscriptionTab role={role} />;
  else if (tab === 'account') body = <AccountTab t={t} user={user} logout={logout} />;
  else if (tab === 'language') body = <LanguageTab t={t} />;
  else body = <ProfileTab t={t} user={user} refreshUser={refresh} />;

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <h1 className="m-0 text-2xl font-bold">{t('title')}</h1>
      <div className="flex flex-wrap items-start gap-6">
        <nav aria-label={t('navLabel')} className="flex w-full flex-col gap-0.5 md:w-auto md:max-w-[260px] md:flex-[1_1_220px]">
          {shop.map((x) => navItem(x.id))}
          {shop.length > 0 && <span className="mx-3 my-2 h-px bg-ar-line" />}
          {me.map((x) => navItem(x.id))}
        </nav>
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">{body}</div>
      </div>
    </div>
  );
}
