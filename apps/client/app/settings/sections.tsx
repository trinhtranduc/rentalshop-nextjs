'use client';

/**
 * Cài đặt cửa hàng sections (#528) on the shell tokens. Same API calls as the shared
 * @rentalshop/ui Settings component they replace (settingsApi, authApi, usersApi, outletsApi,
 * merchantsApi); admin keeps the shared component.
 */
import React, { useEffect, useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { COUNTRIES } from '@rentalshop/constants';
import { useToast } from '@rentalshop/ui';
import { authApi, outletsApi, usersApi } from '@rentalshop/utils';
import { cardClass, outlineBtn, primaryBtn, Skeleton, type T } from '../orders/list/parts';
import { Modal, fieldClass } from '../orders/create/parts';
import { addressLine, passwordProblem, publicLinks, tenantKeyValid } from './settings-model';

const labelClass = 'flex flex-col gap-1.5 text-sm font-semibold text-ar-ink-2';
const inputClass = `${fieldClass} font-normal disabled:cursor-not-allowed disabled:bg-ar-surface-muted disabled:text-ar-muted`;
const smallBtn = 'inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-sm font-semibold text-ar-ink no-underline hover:bg-ar-subtle disabled:opacity-50';
const dangerBtn =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[10px] bg-ar-danger px-3.5 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50';

export function SectionCard({ title, action, children, footer, id }: { title: string; action?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-col gap-4 px-5 py-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-lg font-bold">{title}</h2>
          {action}
        </div>
        {children}
      </div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5">{footer}</div>}
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  className = '',
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`${labelClass} ${className}`}>
      <span>
        {label} {required && <span className="font-normal text-ar-danger">{required}</span>}
      </span>
      {children}
      {hint && <span className="text-xs font-normal text-ar-muted">{hint}</span>}
    </label>
  );
}

// ----------------------------------------------------------------------------
// Thông tin cửa hàng / chi nhánh
// ----------------------------------------------------------------------------

export interface ShopForm {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  /** Outlet only */
  description?: string;
  /** Merchant only (sent back unchanged when not shown) */
  taxId?: string;
  tenantKey?: string;
  businessType?: string;
  pricingType?: string;
}

export function ShopInfoSection({
  kind,
  initial,
  email,
  canEdit,
  onSave,
  t,
}: {
  kind: 'merchant' | 'outlet';
  initial: ShopForm;
  email?: string;
  canEdit: boolean;
  onSave: (form: ShopForm) => Promise<unknown>;
  t: T;
}) {
  const [form, setForm] = useState<ShopForm>(initial);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const listId = useId();
  const key = JSON.stringify(initial);
  useEffect(() => {
    setForm(JSON.parse(key) as ShopForm);
  }, [key]);
  const dirty = JSON.stringify(form) !== key;
  const set = (name: keyof ShopForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProblem('');
    setForm((f) => ({ ...f, [name]: name === 'tenantKey' ? e.target.value.toLowerCase() : e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setProblem(t('form.nameRequired'));
    if (kind === 'merchant' && !tenantKeyValid(form.tenantKey || '')) return setProblem(t('form.tenantKeyInvalid'));
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-col gap-4 px-5 py-[18px]">
        <h2 className="m-0 text-lg font-bold">{kind === 'merchant' ? t('nav.merchant') : t('nav.outlet')}</h2>
        {!canEdit && <p className="m-0 text-sm text-ar-muted">{t('form.readOnly')}</p>}
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <Field label={kind === 'merchant' ? t('form.shopName') : t('form.outletName')} required={canEdit ? t('form.required') : undefined}>
            <input name="name" value={form.name} onChange={set('name')} disabled={!canEdit} className={inputClass} />
          </Field>
          <Field label={t('form.phone')}>
            <input name="phone" type="tel" value={form.phone} onChange={set('phone')} disabled={!canEdit} className={inputClass} />
          </Field>
          {kind === 'merchant' && (
            <>
              <Field label={t('form.email')}>
                <input type="email" value={email || ''} disabled className={inputClass} />
              </Field>
              <Field label={t('form.taxId')}>
                <input name="taxId" value={form.taxId || ''} onChange={set('taxId')} disabled={!canEdit} className={inputClass} />
              </Field>
            </>
          )}
        </div>
        <fieldset className="m-0 grid gap-3.5 rounded-xl border border-ar-line px-4 pb-4 pt-3.5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <legend className="px-1.5 text-sm font-bold text-ar-ink-2">{t('form.address')}</legend>
          <Field label={t('form.street')} className="col-span-full">
            <input name="address" value={form.address} onChange={set('address')} disabled={!canEdit} className={inputClass} />
          </Field>
          <Field label={t('form.city')}>
            <input name="city" value={form.city} onChange={set('city')} disabled={!canEdit} className={inputClass} />
          </Field>
          <Field label={t('form.state')}>
            <input name="state" value={form.state} onChange={set('state')} disabled={!canEdit} className={inputClass} />
          </Field>
          <Field label={t('form.country')}>
            <input name="country" list={listId} value={form.country} onChange={set('country')} disabled={!canEdit} className={inputClass} />
            <datalist id={listId}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name} />
              ))}
            </datalist>
          </Field>
          <Field label={t('form.zip')}>
            <input name="zipCode" value={form.zipCode} onChange={set('zipCode')} disabled={!canEdit} placeholder={t('form.optional')} className={inputClass} />
          </Field>
        </fieldset>
        {kind === 'merchant' ? (
          <Field label={t('form.tenantKey')} hint={t('form.tenantKeyHint')}>
            <input
              name="tenantKey"
              value={form.tenantKey || ''}
              onChange={set('tenantKey')}
              disabled={!canEdit}
              pattern="[a-z0-9\-]*"
              autoCapitalize="none"
              spellCheck={false}
              className={`${inputClass} lowercase`}
            />
          </Field>
        ) : (
          <Field label={t('form.description')}>
            <textarea
              name="description"
              rows={3}
              value={form.description || ''}
              onChange={set('description')}
              disabled={!canEdit}
              className={`${inputClass} h-auto resize-y py-2.5`}
            />
          </Field>
        )}
        {problem && (
          <p role="alert" className="m-0 text-sm text-ar-danger">
            {problem}
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5">
          <button type="button" onClick={() => setForm(JSON.parse(key) as ShopForm)} disabled={!dirty || saving} className={`${outlineBtn} h-11 rounded-xl px-[18px]`}>
            {t('form.cancel')}
          </button>
          <button type="submit" disabled={!dirty || saving} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
            {saving ? t('form.saving') : t('form.save')}
          </button>
        </div>
      )}
    </form>
  );
}

// ----------------------------------------------------------------------------
// Chi nhánh (merchant)
// ----------------------------------------------------------------------------

type OutletRow = { id: number; name: string; phone?: string | null; isDefault?: boolean; address?: string | null; city?: string | null; state?: string | null; printNote?: string | null };

function useOutlets() {
  const [state, setState] = useState<{ rows: OutletRow[]; loading: boolean; failed: boolean }>({ rows: [], loading: true, failed: false });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, failed: false }));
    outletsApi
      .getOutlets()
      .then((res) => {
        const data = res?.data as { outlets?: OutletRow[] } | OutletRow[] | undefined;
        const rows = Array.isArray(data) ? data : data?.outlets || [];
        if (alive) setState({ rows, loading: false, failed: !res?.success });
      })
      .catch(() => alive && setState({ rows: [], loading: false, failed: true }));
    return () => {
      alive = false;
    };
  }, [nonce]);
  return { ...state, retry: () => setNonce((n) => n + 1) };
}

export function OutletsSection({ t }: { t: T }) {
  const { rows, loading, failed, retry } = useOutlets();
  return (
    <section id="chi-nhanh" className={`${cardClass} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 px-5 pb-2.5 pt-4">
        <h2 className="m-0 text-lg font-bold">{t('outlets.title')}</h2>
        <Link href="/outlets" className={smallBtn}>
          {t('outlets.add')}
        </Link>
      </div>
      {failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-t border-ar-subtle px-5 py-4 text-sm text-ar-muted">
          <span>{t('outlets.loadFailed')}</span>
          <button type="button" onClick={retry} className={smallBtn}>
            {t('outlets.retry')}
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-2 border-t border-ar-subtle px-5 py-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="m-0 border-t border-ar-subtle px-5 py-4 text-sm text-ar-muted">{t('outlets.empty')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map((o) => {
            const line = [addressLine(o), o.phone].filter(Boolean).join(' · ');
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-3 border-t border-ar-subtle px-5 py-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-semibold">
                    {o.name}{' '}
                    {o.isDefault && <span className="rounded-md bg-ar-reserved-bg px-1.5 py-0.5 text-xs font-semibold text-ar-reserved">{t('outlets.main')}</span>}
                  </span>
                  {line && <span className="text-sm text-ar-muted [overflow-wrap:anywhere]">{line}</span>}
                </span>
                <span className="flex gap-2">
                  <Link href={`/outlets/${o.id}/bank-accounts`} className={smallBtn}>
                    {t('outlets.bank')}
                  </Link>
                  <Link href="/outlets" className={smallBtn}>
                    {t('outlets.edit')}
                  </Link>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Chia sẻ: public product page + referral link
// ----------------------------------------------------------------------------

export function ShareLinksSection({
  publicProductLink,
  tenantKey,
  referralCode,
  t,
}: {
  publicProductLink?: string | null;
  tenantKey?: string | null;
  referralCode?: string | null;
  t: T;
}) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const { productLink, registrationLink } = publicLinks(origin, { publicProductLink, tenantKey, referralCode });
  const copy = async (which: string, value: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied((c) => (c === which ? null : c)), 2000);
    } catch {
      // Clipboard blocked: the link is still selectable in the field.
    }
  };
  const row = (which: 'product' | 'registration', value: string | null, hint: string) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ar-ink-2">{t(`links.${which}`)}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={value || ''}
          placeholder={t('links.none')}
          aria-label={t(`links.${which}`)}
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClass} min-w-0 flex-[1_1_240px] font-mono text-sm`}
        />
        <button type="button" onClick={() => copy(which, value)} disabled={!value} className={`${outlineBtn} h-11 rounded-xl`}>
          {copied === which ? t('links.copied') : t('links.copy')}
        </button>
        {which === 'product' && value && (
          <a href={value} target="_blank" rel="noopener noreferrer" className={`${outlineBtn} h-11 rounded-xl`}>
            {t('links.open')}
          </a>
        )}
      </div>
      <span className="text-xs text-ar-muted">{hint}</span>
    </div>
  );
  return (
    <SectionCard title={t('links.title')}>
      {row('product', productLink, t('links.productHint'))}
      {row('registration', registrationLink, t('links.registrationHint'))}
    </SectionCard>
  );
}

// ----------------------------------------------------------------------------
// Phiếu in (Outlet.printNote, #347)
// ----------------------------------------------------------------------------

const NOTE_MAX = 500;
type NoteRow = { id: number; name: string; saved: string; draft: string; saving: boolean };

export function ReceiptSection({ t }: { t: T }) {
  const to = useTranslations('outlets');
  const ts = useTranslations('settings');
  const { toastSuccess, toastError } = useToast();
  const { rows, loading, failed, retry } = useOutlets();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  useEffect(() => {
    setNotes(rows.map((o) => ({ id: o.id, name: o.name, saved: o.printNote || '', draft: o.printNote || '', saving: false })));
  }, [rows]);
  const patch = (id: number, next: Partial<NoteRow>) => setNotes((list) => list.map((n) => (n.id === id ? { ...n, ...next } : n)));

  const save = async (n: NoteRow) => {
    patch(n.id, { saving: true });
    try {
      const res = await outletsApi.updateOutlet(n.id, { printNote: n.draft } as Parameters<typeof outletsApi.updateOutlet>[1]);
      if (!res.success) throw new Error(res.error || '');
      patch(n.id, { saved: n.draft, saving: false });
      toastSuccess(ts('messages.successTitle'), `${to('fields.printNote')} — ${n.name}`);
    } catch (error) {
      patch(n.id, { saving: false });
      toastError(ts('messages.errorTitle'), error instanceof Error && error.message ? error.message : to('fields.printNote'));
    }
  };

  return (
    <SectionCard title={t('receipt.title')}>
      <p className="-mt-2 mb-0 text-sm text-ar-muted">{to('fields.printNoteHint')}</p>
      {failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-ar-muted">
          <span>{t('receipt.loadFailed')}</span>
          <button type="button" onClick={retry} className={smallBtn}>
            {t('receipt.retry')}
          </button>
        </div>
      ) : loading ? (
        <Skeleton className="h-24 w-full" />
      ) : notes.length === 0 ? (
        <p className="m-0 text-sm text-ar-muted">{t('receipt.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {notes.map((n) => {
            const dirty = n.draft !== n.saved;
            return (
              <li key={n.id} className="flex flex-col gap-1.5 border-t border-ar-subtle pt-4 first:border-t-0 first:pt-0">
                <label className={labelClass}>
                  {notes.length > 1 ? n.name : to('fields.printNote')}
                  <textarea
                    rows={3}
                    maxLength={NOTE_MAX}
                    value={n.draft}
                    onChange={(e) => patch(n.id, { draft: e.target.value })}
                    className={`${inputClass} h-auto resize-y py-2.5`}
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs tabular-nums text-ar-muted">
                    {n.draft.length}/{NOTE_MAX}
                  </span>
                  <span className="flex gap-2">
                    {dirty && (
                      <button type="button" onClick={() => patch(n.id, { draft: n.saved })} disabled={n.saving} className={smallBtn}>
                        {t('form.cancel')}
                      </button>
                    )}
                    <button type="button" onClick={() => save(n)} disabled={!dirty || n.saving} className={`${primaryBtn} h-9 text-sm`}>
                      {n.saving ? t('form.saving') : t('form.save')}
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

// ----------------------------------------------------------------------------
// Tài khoản của tôi
// ----------------------------------------------------------------------------

export interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
}

export function ProfileSection({
  initial,
  email,
  roleLabel,
  onSave,
  t,
}: {
  initial: ProfileForm;
  email: string;
  roleLabel: string;
  onSave: (form: ProfileForm) => Promise<unknown>;
  t: T;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const key = JSON.stringify(initial);
  useEffect(() => setForm(JSON.parse(key) as ProfileForm), [key]);
  const dirty = JSON.stringify(form) !== key;
  const set = (name: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [name]: e.target.value }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(form);
        setSaving(false);
      }}
      className={`${cardClass} overflow-hidden`}
    >
      <div className="flex flex-col gap-4 px-5 py-[18px]">
        <h2 className="m-0 text-lg font-bold">{t('profile.title')}</h2>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <Field label={t('profile.lastName')}>
            <input name="lastName" value={form.lastName} onChange={set('lastName')} autoComplete="family-name" className={inputClass} />
          </Field>
          <Field label={t('profile.firstName')}>
            <input name="firstName" value={form.firstName} onChange={set('firstName')} autoComplete="given-name" className={inputClass} />
          </Field>
          <Field label={t('form.phone')}>
            <input name="phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" className={inputClass} />
          </Field>
          <Field label={t('form.email')}>
            <input type="email" value={email} disabled className={inputClass} />
          </Field>
          <Field label={t('profile.role')}>
            <input value={roleLabel} disabled className={inputClass} />
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5">
        <button type="button" onClick={() => setForm(JSON.parse(key) as ProfileForm)} disabled={!dirty || saving} className={`${outlineBtn} h-11 rounded-xl px-[18px]`}>
          {t('form.cancel')}
        </button>
        <button type="submit" disabled={!dirty || saving} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
          {saving ? t('form.saving') : t('form.save')}
        </button>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------------
// Đổi mật khẩu, đăng xuất, xoá tài khoản
// ----------------------------------------------------------------------------

export function AccountSection({ userId, onSignOut, t }: { userId?: number | null; onSignOut: () => void; t: T }) {
  const ts = useTranslations('settings');
  const { toastSuccess, toastError } = useToast();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changing, setChanging] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const set = (name: keyof typeof pw) => (e: React.ChangeEvent<HTMLInputElement>) => setPw((p) => ({ ...p, [name]: e.target.value }));

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(pw);
    if (problem) {
      const key = problem === 'currentRequired' ? 'currentPasswordRequired' : problem === 'mismatch' ? 'passwordMismatch' : 'passwordTooShort';
      toastError(ts('messages.errorTitle'), ts(`messages.${key}`));
      return;
    }
    setChanging(true);
    try {
      const res = await authApi.changePassword(pw.currentPassword, pw.newPassword);
      if (res.success) {
        setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toastSuccess(ts('messages.successTitle'), ts('messages.passwordChanged'));
      }
      // Errors: shown by the global API error handler.
    } catch {
      // Network errors: same.
    } finally {
      setChanging(false);
    }
  };

  const remove = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      const res = await usersApi.deleteUser(userId);
      if (res.success) {
        toastSuccess(ts('messages.successTitle'), ts('messages.accountDeleted'));
        onSignOut();
      } else {
        toastError(ts('messages.errorTitle'), res.message || ts('messages.accountDeleteFailed'));
      }
    } catch {
      toastError(ts('messages.errorTitle'), ts('messages.accountDeleteFailed'));
    } finally {
      setDeleting(false);
      setAskDelete(false);
    }
  };

  return (
    <>
      <form onSubmit={change} className={`${cardClass} overflow-hidden`}>
        <div className="flex flex-col gap-4 px-5 py-[18px]">
          <h2 className="m-0 text-lg font-bold">{t('password.title')}</h2>
          <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('password.hint')}</p>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <Field label={t('password.current')}>
              <input type="password" name="currentPassword" value={pw.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" className={inputClass} />
            </Field>
            <Field label={t('password.new')}>
              <input type="password" name="newPassword" value={pw.newPassword} onChange={set('newPassword')} autoComplete="new-password" className={inputClass} />
            </Field>
            <Field label={t('password.confirm')}>
              <input type="password" name="confirmPassword" value={pw.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" className={inputClass} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5">
          <button type="submit" disabled={changing} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
            {changing ? t('password.changing') : t('password.submit')}
          </button>
        </div>
      </form>

      <section className={`${cardClass} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold">{t('session.title')}</span>
          <span className="text-sm text-ar-muted">{t('session.desc')}</span>
        </span>
        <button type="button" onClick={onSignOut} className={outlineBtn}>
          {t('session.button')}
        </button>
      </section>

      <section className={`${cardClass} flex flex-wrap items-center justify-between gap-3 border-ar-danger/40 px-5 py-4`}>
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold text-ar-danger">{t('delete.title')}</span>
          <span className="text-sm text-ar-muted">{t('delete.desc')}</span>
        </span>
        <button type="button" onClick={() => setAskDelete(true)} disabled={!userId} className={dangerBtn}>
          {t('delete.button')}
        </button>
      </section>

      <Modal
        open={askDelete}
        title={t('delete.confirmTitle')}
        onClose={() => (deleting ? undefined : setAskDelete(false))}
        closeLabel={t('delete.close')}
        footer={
          <>
            <button type="button" onClick={() => setAskDelete(false)} disabled={deleting} className={outlineBtn}>
              {t('form.cancel')}
            </button>
            <button type="button" onClick={remove} disabled={deleting} className={dangerBtn}>
              {deleting ? t('delete.deleting') : t('delete.button')}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink-2">{t('delete.confirmBody')}</p>
      </Modal>
    </>
  );
}

// ----------------------------------------------------------------------------
// Ngôn ngữ
// ----------------------------------------------------------------------------

export const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
] as const;

export function LanguageSection({ t }: { t: T }) {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(current);
  const pick = (value: string) => {
    setSelected(value);
    startTransition(() => {
      try {
        window.localStorage.setItem('user_language_preference', value);
      } catch {
        // Private mode: the cookie below is enough.
      }
      document.cookie = `NEXT_LOCALE=${value};path=/;max-age=31536000;SameSite=Lax`;
      router.refresh();
    });
  };
  return (
    <SectionCard title={t('language.title')}>
      <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('language.hint')}</p>
      <div role="radiogroup" aria-label={t('language.title')} className="flex flex-col gap-2">
        {LANGUAGES.map((l) => (
          <label
            key={l.value}
            className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 text-[15px] ${
              selected === l.value ? 'border-ar-primary bg-ar-primary-soft font-semibold text-ar-primary-ink' : 'border-ar-line text-ar-ink hover:bg-ar-subtle'
            }`}
          >
            <input type="radio" name="language" value={l.value} checked={selected === l.value} onChange={() => pick(l.value)} className="h-4 w-4 accent-ar-primary" />
            {l.label}
          </label>
        ))}
      </div>
      {pending && <p className="m-0 text-sm text-ar-muted">{t('language.applying')}</p>}
    </SectionCard>
  );
}

/** Shared panels not redrawn yet (bank accounts, subscription): dark overrides via `.ar-legacy`. */
export function LegacyPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${cardClass} ar-legacy overflow-hidden`}>
      <h2 className="m-0 px-5 pb-1 pt-[18px] text-lg font-bold">{title}</h2>
      <div className="px-2 pb-3 sm:px-3">{children}</div>
    </section>
  );
}

