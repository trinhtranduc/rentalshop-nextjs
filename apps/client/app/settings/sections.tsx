'use client';

/**
 * Cài đặt cửa hàng sections (#528) on the shell tokens. Same API calls as the shared
 * @rentalshop/ui Settings component they replace (settingsApi, authApi, usersApi, outletsApi,
 * merchantsApi); admin keeps the shared component.
 */
import React, { useEffect, useId, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { COUNTRIES } from '@rentalshop/constants';
import { useToast } from '@rentalshop/ui';
import { authApi, bookingRequestsApi, outletsApi, usersApi } from '@rentalshop/utils';
import { cardClass, outlineBtn, primaryBtn, Skeleton, type T } from '../orders/list/parts';
import { Modal, fieldClass } from '../orders/create/parts';
import { addressLine, currencyExample, passwordProblem, publicLinks, tenantKeyValid, type ShopCurrency } from './settings-model';
import { formatShopAmount } from '@rentalshop/utils';
import { outletBookingRows } from '../orders/online/online-model';
import { useTheme, type ThemeChoice } from '../providers/ThemeProvider';
import { usePrintSettings } from '../components/usePrintSettings';
import { BillPreview, BillTestPrint, LabelPreview, useLabelTestPrint } from './PrintPreviews';
import { Switch } from '../users/permissions/parts';
import { useBillBank } from '../orders/receipt/useBillBank';
import { BILL_WIDTHS, LABEL_H, LABEL_PRESETS, LABEL_W, clampMm, labelLayout, labelSizeText, type LabelChoice } from '../../lib/print-settings';

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
  description?: string;
  /** Merchant only (sent back unchanged when not shown) */
  taxId?: string;
  tenantKey?: string;
  businessType?: string;
  pricingType?: string;
  /** #1145 shop currency (owner only; amounts are never converted) */
  currency?: ShopCurrency;
}

export function ShopInfoSection({
  kind,
  initial,
  email,
  canEdit,
  canEditCurrency = false,
  onSave,
  t,
}: {
  kind: 'merchant' | 'outlet';
  initial: ShopForm;
  email?: string;
  canEdit: boolean;
  /** #1145 "Tiền tệ": the owner only */
  canEditCurrency?: boolean;
  onSave: (form: ShopForm) => Promise<unknown>;
  t: T;
}) {
  const [form, setForm] = useState<ShopForm>(initial);
  const [saving, setSaving] = useState(false);
  const [askCurrency, setAskCurrency] = useState(false);
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

  const showCurrency = kind === 'merchant' && canEditCurrency && !!initial.currency;
  const currencyChanged = showCurrency && form.currency !== initial.currency;
  const nextCurrency = form.currency || 'VND';

  const save = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setAskCurrency(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setProblem(t('form.nameRequired'));
    if (kind === 'outlet' && !form.address.trim()) return setProblem(t('form.addressRequired'));
    // #1145 every price changes how it is shown: ask first
    if (currencyChanged) return setAskCurrency(true);
    await save();
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
        {kind === 'merchant' ? (
          <>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
              <Field label={t('form.street')}>
                <input name="address" value={form.address} onChange={set('address')} disabled={!canEdit} className={inputClass} />
              </Field>
              <Field label={t('form.state')}>
                <input name="state" value={form.state} onChange={set('state')} disabled={!canEdit} className={inputClass} />
              </Field>
            </div>
            {showCurrency && (
              <div className="flex flex-col gap-1.5">
                <span id={`${listId}-cur`} className={labelClass}>
                  {t('form.currency')}
                </span>
                <div role="radiogroup" aria-labelledby={`${listId}-cur`} className="inline-flex w-fit rounded-xl border border-ar-line bg-ar-surface-muted p-1">
                  {(['VND', 'USD'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={form.currency === c}
                      data-currency={c}
                      onClick={() => setForm((f) => ({ ...f, currency: c }))}
                      className={`h-10 min-w-[112px] rounded-[10px] px-4 text-[15px] font-semibold ${
                        form.currency === c ? 'bg-ar-surface text-ar-primary-ink shadow-sm ring-1 ring-ar-primary' : 'text-ar-ink-2 hover:bg-ar-subtle'
                      }`}
                    >
                      {c === 'VND' ? 'VND (đ)' : 'USD ($)'}
                    </button>
                  ))}
                </div>
                <p className="m-0 text-sm text-ar-muted">{t('form.currencyHint')}</p>
              </div>
            )}
            {/* #1140: rarely used fields, closed by default. Mã URL moved to Trang shop công khai (still sent unchanged). */}
            <details className="group rounded-xl border border-ar-line px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-ar-ink-2">
                {t('form.more')}: {[t('form.city'), t('form.country'), t('form.zip'), t('form.description')].join(', ')}
              </summary>
              <div className="mt-3.5 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                <Field label={t('form.city')}>
                  <input name="city" value={form.city} onChange={set('city')} disabled={!canEdit} className={inputClass} />
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
                <Field label={t('form.description')} className="col-span-full">
                  <textarea
                    name="description"
                    rows={3}
                    value={form.description || ''}
                    onChange={set('description')}
                    disabled={!canEdit}
                    className={`${inputClass} h-auto resize-y py-2.5`}
                  />
                </Field>
              </div>
            </details>
          </>
        ) : (
          <>
            {/* PUT /api/settings/outlet stores name, address, phone and description only, and needs the address. */}
            <Field label={t('form.address')} required={canEdit ? t('form.required') : undefined}>
              <input name="address" value={form.address} onChange={set('address')} disabled={!canEdit} className={inputClass} />
            </Field>
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
          </>
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
      {showCurrency && (
        <Modal
          open={askCurrency}
          title={t('form.currencyConfirmTitle', { code: nextCurrency })}
          onClose={() => (saving ? undefined : setAskCurrency(false))}
          closeLabel={t('form.cancel')}
          footer={
            <>
              <button type="button" onClick={() => setAskCurrency(false)} disabled={saving} className={outlineBtn}>
                {t('form.cancel')}
              </button>
              <button type="button" data-currency-confirm onClick={() => void save()} disabled={saving} className={primaryBtn}>
                {saving ? t('form.saving') : t('form.currencyConfirmOk', { code: nextCurrency })}
              </button>
            </>
          }
        >
          <p className="m-0 text-[15px] text-ar-ink">
            {t('form.currencyConfirmBody', {
              code: nextCurrency,
              example: currencyExample(initial.currency || 'VND', nextCurrency, formatShopAmount),
            })}
          </p>
        </Modal>
      )}
    </form>
  );
}

// ----------------------------------------------------------------------------
// Chi nhánh (merchant)
// ----------------------------------------------------------------------------

type OutletRow = { id: number; name: string; phone?: string | null; isDefault?: boolean; address?: string | null; city?: string | null; state?: string | null; printNote?: string | null; printBankQr?: boolean; acceptsOnlineBooking?: boolean };

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

/** #1140: one row to the Chi nhánh menu (add / edit / bank accounts live there) instead of the full list. */
export function OutletsLinkRow({ t }: { t: T }) {
  const { rows, loading, failed } = useOutlets();
  return (
    <section id="chi-nhanh" className={`${cardClass} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-semibold">{t('outlets.title')}</span>
        {!loading && !failed && <span className="text-sm text-ar-muted">{t('outlets.count', { count: rows.length })}</span>}
      </span>
      <Link href="/outlets" className={smallBtn}>
        {t('outlets.open')} ›
      </Link>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Đặt online (#1124): the shop takes booking requests from its public page
// ----------------------------------------------------------------------------

export function OnlineBookingSection({
  t,
  enabled,
  canEditShop,
  canEditOutlets,
  onShopChanged,
}: {
  t: T;
  /** Merchant.onlineBookingEnabled (profile) */
  enabled: boolean;
  /** Only the owner turns the shop switch (API: MERCHANT / ADMIN) */
  canEditShop: boolean;
  /** Owner, or the outlet admin for their outlet (API: outlet.manage) */
  canEditOutlets: boolean;
  onShopChanged?: () => void;
}) {
  const ts = useTranslations('settings');
  const { toastSuccess, toastError } = useToast();
  const { rows, loading, failed, retry } = useOutlets();
  const [shopOn, setShopOn] = useState(enabled);
  const [shopSaving, setShopSaving] = useState(false);
  const [outletOn, setOutletOn] = useState<Record<number, boolean>>({});
  const [outletSaving, setOutletSaving] = useState<Record<number, boolean>>({});
  useEffect(() => setShopOn(enabled), [enabled]);
  useEffect(() => {
    setOutletOn(Object.fromEntries(outletBookingRows(rows).map((r) => [r.id, r.on])));
  }, [rows]);
  const titleId = useId();
  const hintId = useId();
  const outletsId = useId();

  const toggleShop = async (next: boolean) => {
    setShopOn(next);
    setShopSaving(true);
    try {
      const res = await bookingRequestsApi.setOnlineBooking(next);
      if (!res.success) throw new Error(res.error || '');
      toastSuccess(ts('messages.successTitle'), t('onlineBooking.title'));
      onShopChanged?.();
    } catch (error) {
      setShopOn(!next);
      toastError(ts('messages.errorTitle'), error instanceof Error && error.message ? error.message : t('onlineBooking.title'));
    } finally {
      setShopSaving(false);
    }
  };
  const toggleOutlet = async (row: OutletRow, next: boolean) => {
    setOutletOn((m) => ({ ...m, [row.id]: next }));
    setOutletSaving((m) => ({ ...m, [row.id]: true }));
    try {
      const res = await outletsApi.updateOutlet(row.id, { acceptsOnlineBooking: next } as unknown as Parameters<typeof outletsApi.updateOutlet>[1]);
      if (!res.success) throw new Error(res.error || '');
      toastSuccess(ts('messages.successTitle'), `${t('onlineBooking.outlets')} — ${row.name}`);
    } catch (error) {
      setOutletOn((m) => ({ ...m, [row.id]: !next }));
      toastError(ts('messages.errorTitle'), error instanceof Error && error.message ? error.message : t('onlineBooking.outlets'));
    } finally {
      setOutletSaving((m) => ({ ...m, [row.id]: false }));
    }
  };

  return (
    <section id="dat-online" className={`${cardClass} flex flex-col gap-4 px-5 py-4`} data-online-booking-setting>
      <div className="flex min-h-[44px] items-start justify-between gap-3">
        <span className="flex flex-col gap-1">
          <h2 id={titleId} className="m-0 text-lg font-bold">
            {t('onlineBooking.title')}
          </h2>
          <span id={hintId} className="text-sm text-ar-muted">
            {t('onlineBooking.hint')}
            {!canEditShop && ` ${t('onlineBooking.ownerOnly')}`}
          </span>
        </span>
        <Switch checked={shopOn} onChange={toggleShop} disabled={!canEditShop || shopSaving} labelledBy={titleId} describedBy={hintId} />
      </div>
      {failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-ar-muted">
          <span>{t('outlets.loadFailed')}</span>
          <button type="button" onClick={retry} className={smallBtn}>
            {t('outlets.retry')}
          </button>
        </div>
      ) : loading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        rows.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-ar-subtle pt-4">
            <span id={outletsId} className="text-[15px] font-semibold text-ar-ink">
              {t('onlineBooking.outlets')}
            </span>
            <p className="-mt-1 mb-0 text-sm text-ar-muted">{t('onlineBooking.outletsHint')}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {rows.map((r) => (
                <li key={r.id} className={`flex min-h-[44px] items-center justify-between gap-3 ${shopOn ? '' : 'opacity-60'}`}>
                  <span id={`${outletsId}-${r.id}`} className="text-[15px] text-ar-ink">
                    {r.name}
                  </span>
                  <Switch
                    checked={outletOn[r.id] !== false}
                    onChange={(next) => toggleOutlet(r, next)}
                    disabled={!canEditOutlets || outletSaving[r.id]}
                    labelledBy={`${outletsId} ${outletsId}-${r.id}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Chia sẻ: public product page + referral link
// ----------------------------------------------------------------------------

function useOrigin() {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

function LinkRow({ which, value, hint, t }: { which: 'product' | 'registration'; value: string | null; hint: string; t: T }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is still selectable in the field.
    }
  };
  return (
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
        <button type="button" onClick={copy} disabled={!value} className={`${outlineBtn} h-11 rounded-xl`}>
          {copied ? t('links.copied') : t('links.copy')}
        </button>
        {which === 'product' && value && (
          <a href={value} target="_blank" rel="noopener noreferrer" className={`${outlineBtn} h-11 rounded-xl`}>
            {t('links.open')}
          </a>
        )}
      </div>
      {hint && <span className="text-xs text-ar-muted">{hint}</span>}
    </div>
  );
}

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
  const origin = useOrigin();
  const { productLink, registrationLink } = publicLinks(origin, { publicProductLink, tenantKey, referralCode });
  return (
    <SectionCard title={t('links.title')}>
      <LinkRow which="product" value={productLink} hint={t('links.productHint')} t={t} />
      <LinkRow which="registration" value={registrationLink} hint={t('links.registrationHint')} t={t} />
    </SectionCard>
  );
}

/**
 * Trang shop công khai (#1140, owner): Mã URL cửa hàng (moved from the shop form, saved through the same
 * merchant update with the other fields unchanged) + public page link, then the referral link.
 */
export function PublicPageSection({
  tenantKey,
  publicProductLink,
  canEdit,
  onSave,
  t,
  showPublicPrice = true,
  canEditPrice = false,
  onPriceChanged,
}: {
  tenantKey: string;
  publicProductLink?: string | null;
  canEdit: boolean;
  onSave: (tenantKey: string) => Promise<unknown>;
  t: T;
  /** #1174 Hiện giá trên trang shop */
  showPublicPrice?: boolean;
  canEditPrice?: boolean;
  onPriceChanged?: () => void;
}) {
  const origin = useOrigin();
  const ts = useTranslations('settings');
  const { toastSuccess, toastError } = useToast();
  const [value, setValue] = useState(tenantKey);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const [priceOn, setPriceOn] = useState(showPublicPrice);
  const [priceSaving, setPriceSaving] = useState(false);
  const priceTitleId = useId();
  const priceHintId = useId();
  useEffect(() => setValue(tenantKey), [tenantKey]);
  useEffect(() => setPriceOn(showPublicPrice), [showPublicPrice]);
  const togglePrice = async (next: boolean) => {
    if (!canEditPrice) return;
    setPriceOn(next);
    setPriceSaving(true);
    try {
      const res = await bookingRequestsApi.setShowPublicPrice(next);
      if (!res.success) throw new Error(res.error || '');
      toastSuccess(ts('messages.successTitle'), t('publicPage.showPrice'));
      onPriceChanged?.();
    } catch (error) {
      setPriceOn(!next);
      toastError(ts('messages.errorTitle'), error instanceof Error && error.message ? error.message : t('publicPage.showPrice'));
    } finally {
      setPriceSaving(false);
    }
  };
  const dirty = value !== tenantKey;
  const { productLink, registrationLink } = publicLinks(origin, { publicProductLink, tenantKey });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantKeyValid(value)) return setProblem(t('form.tenantKeyInvalid'));
    setSaving(true);
    await onSave(value);
    setSaving(false);
  };
  return (
    <>
      <form onSubmit={submit} className={`${cardClass} overflow-hidden`}>
        <div className="flex flex-col gap-4 px-5 py-[18px]">
          <h2 className="m-0 text-lg font-bold">{t('nav.public-page')}</h2>
          <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('links.productHint')}</p>
          <Field label={t('form.tenantKey')} hint={t('form.tenantKeyHint')}>
            <input
              name="tenantKey"
              value={value}
              onChange={(e) => {
                setProblem('');
                setValue(e.target.value.toLowerCase());
              }}
              disabled={!canEdit}
              pattern="[a-z0-9\-]*"
              autoCapitalize="none"
              spellCheck={false}
              className={`${inputClass} lowercase`}
            />
          </Field>
          <LinkRow which="product" value={productLink} hint="" t={t} />
          {problem && (
            <p role="alert" className="m-0 text-sm text-ar-danger">
              {problem}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5">
            <button type="button" onClick={() => setValue(tenantKey)} disabled={!dirty || saving} className={`${outlineBtn} h-11 rounded-xl px-[18px]`}>
              {t('form.cancel')}
            </button>
            <button type="submit" disabled={!dirty || saving} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
              {saving ? t('form.saving') : t('form.save')}
            </button>
          </div>
        )}
      </form>
      <SectionCard title={t('links.registration')}>
        <LinkRow which="registration" value={registrationLink} hint={t('links.registrationHint')} t={t} />
      </SectionCard>
      <section className={`${cardClass} flex flex-col gap-4 px-5 py-4`} data-show-public-price-setting>
        <div className="flex min-h-[44px] items-start justify-between gap-3">
          <span className="flex flex-col gap-1">
            <h2 id={priceTitleId} className="m-0 text-lg font-bold">
              {t('publicPage.showPrice')}
            </h2>
            <span id={priceHintId} className="text-sm text-ar-muted">
              {t('publicPage.showPriceHint')}
              {!canEditPrice && ` ${t('publicPage.ownerOnly')}`}
            </span>
          </span>
          <Switch checked={priceOn} onChange={togglePrice} disabled={!canEditPrice || priceSaving} labelledBy={priceTitleId} describedBy={priceHintId} />
        </div>
      </section>
    </>
  );
}

// ----------------------------------------------------------------------------
// Phiếu in (Outlet.printNote, #347)
// ----------------------------------------------------------------------------

const NOTE_MAX = 500;
type NoteRow = { id: number; name: string; saved: string; draft: string; saving: boolean };

/**
 * Phiếu in (#626, merges Máy in #623): bill paper + printed note with a full bill preview, label size with a
 * real-size label preview, and "In thử" for both. Paper sizes are this computer's; the note is the outlet's
 * (saved through the API, owner / outlet admin only).
 */
/** Where "add a bank account" goes from the Phiếu in hint (#628): Cài đặt tab for an outlet admin, the outlet page for an owner. */
export type BankLink = { kind: 'tab'; open: () => void } | { kind: 'page' } | null;

export function ReceiptSection({
  t,
  canEditNote,
  bankLink = null,
  outletId,
}: {
  t: T;
  canEditNote: boolean;
  bankLink?: BankLink;
  /** #852: the owner's picked branch; only that branch's note, QR and preview */
  outletId?: number | null;
}) {
  const to = useTranslations('outlets');
  const ts = useTranslations('settings');
  const { toastSuccess, toastError } = useToast();
  const all = useOutlets();
  const { loading, failed, retry } = all;
  const rows = useMemo(() => (outletId ? all.rows.filter((o) => o.id === outletId) : all.rows), [all.rows, outletId]);
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

  // QR chuyển khoản trên hoá đơn (#628): per outlet, saved at once, rolled back when the save fails
  const [qrOn, setQrOn] = useState<Record<number, boolean>>({});
  const [qrSaving, setQrSaving] = useState<Record<number, boolean>>({});
  useEffect(() => {
    setQrOn(Object.fromEntries(rows.map((o) => [o.id, o.printBankQr === true])));
  }, [rows]);
  const toggleQr = async (row: OutletRow, next: boolean) => {
    setQrOn((m) => ({ ...m, [row.id]: next }));
    setQrSaving((m) => ({ ...m, [row.id]: true }));
    try {
      const res = await outletsApi.updateOutlet(row.id, { printBankQr: next } as Parameters<typeof outletsApi.updateOutlet>[1]);
      if (!res.success) throw new Error(res.error || '');
      toastSuccess(ts('messages.successTitle'), `${t('printer.bankQr')} — ${row.name}`);
    } catch (error) {
      setQrOn((m) => ({ ...m, [row.id]: !next }));
      toastError(ts('messages.errorTitle'), error instanceof Error && error.message ? error.message : t('printer.bankQr'));
    } finally {
      setQrSaving((m) => ({ ...m, [row.id]: false }));
    }
  };
  const qrTitleId = useId();
  const qrHintId = useId();

  const [settings, saveSettings] = usePrintSettings();
    const layout = labelLayout(settings);
  // W / H are typed freely and saved once they are inside the limits (clamped on blur)
  const [draft, setDraft] = useState({ w: String(settings.custom.w), h: String(settings.custom.h) });
  useEffect(() => setDraft({ w: String(settings.custom.w), h: String(settings.custom.h) }), [settings.custom.w, settings.custom.h]);
  const typeSize = (key: 'w' | 'h', value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    const range = key === 'w' ? LABEL_W : LABEL_H;
    const n = Number(value);
    if (value.trim() !== '' && Number.isInteger(n) && n >= range.min && n <= range.max) saveSettings({ ...settings, custom: { ...settings.custom, [key]: n } });
  };
  const commitSize = (key: 'w' | 'h') => {
    const n = clampMm(draft[key], key === 'w' ? LABEL_W : LABEL_H, settings.custom[key]);
    setDraft((d) => ({ ...d, [key]: String(n) }));
    if (n !== settings.custom[key]) saveSettings({ ...settings, custom: { ...settings.custom, [key]: n } });
  };
  const option = (on: boolean) =>
    `flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-4 text-[15px] ${
      on ? 'border-ar-primary bg-ar-primary-soft font-semibold text-ar-primary-ink' : 'border-ar-line text-ar-ink hover:bg-ar-subtle'
    }`;
  const labels: Array<{ value: LabelChoice; label: string }> = [
    ...LABEL_PRESETS.map((p) => ({ value: p as LabelChoice, label: labelSizeText(labelLayout({ label: p, custom: settings.custom })) })),
    { value: 'custom', label: t('printer.custom') },
  ];

  // The preview shows one outlet's header and its note as it is being typed
  const [previewId, setPreviewId] = useState<number | null>(null);
  const previewRow = rows.find((r) => r.id === previewId) ?? rows.find((r) => r.isDefault) ?? rows[0];
  const previewNote = notes.find((n) => n.id === previewRow?.id);
  const previewOutlet = useMemo(
    () => ({
      name: previewRow?.name || '',
      phone: previewRow?.phone || '',
      address: addressLine(previewRow),
      printNote: previewNote?.draft ?? previewRow?.printNote ?? '',
      id: previewRow?.id,
      printBankQr: previewRow ? qrOn[previewRow.id] === true : false,
    }),
    [previewRow, previewNote?.draft, qrOn],
  );
  const previewBank = useBillBank(previewRow?.id, previewOutlet.printBankQr);
  const [billTest, setBillTest] = useState(false);
  const labelTest = useLabelTestPrint(layout);

  const testBtn = (onClick: () => void, busy = false) => (
    <button type="button" onClick={onClick} disabled={busy} className={smallBtn}>
      <PrinterIcon />
      {t('printer.testPrint')}
    </button>
  );

  return (
    <>
      <SectionCard title={t('printer.billSection')} action={testBtn(() => setBillTest(true))}>
        <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('printer.hint')}</p>
        <div role="radiogroup" aria-label={t('printer.billTitle')} className="grid gap-2 sm:grid-cols-2">
          {BILL_WIDTHS.map((w) => (
            <label key={w} className={option(settings.billWidth === w)}>
              <input
                type="radio"
                name="bill-width"
                checked={settings.billWidth === w}
                onChange={() => saveSettings({ ...settings, billWidth: w })}
                className="h-4 w-4 accent-ar-primary"
              />
              {t(w === 80 ? 'printer.bill80' : 'printer.bill58')}
            </label>
          ))}
        </div>

        {canEditNote && (
          <div className="flex flex-col gap-3 border-t border-ar-subtle pt-4">
            <span className="text-[15px] font-semibold text-ar-ink">{to('fields.printNote')}</span>
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
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-ar-subtle pt-4" data-bank-qr-setting>
            <span id={qrTitleId} className="text-[15px] font-semibold text-ar-ink">
              {t('printer.bankQr')}
            </span>
            <p id={qrHintId} className="-mt-2 mb-0 text-sm text-ar-muted">
              {t('printer.bankQrHint')}
              {!canEditNote && ` ${t('printer.bankQrReadOnly')}`}
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {rows.map((r) => (
                <li key={r.id} className="flex min-h-[44px] items-center justify-between gap-3">
                  <span id={`${qrTitleId}-${r.id}`} className="text-[15px] text-ar-ink">
                    {r.name}
                  </span>
                  <Switch
                    checked={qrOn[r.id] === true}
                    onChange={(next) => toggleQr(r, next)}
                    disabled={!canEditNote || qrSaving[r.id]}
                    labelledBy={`${qrTitleId} ${qrTitleId}-${r.id}`}
                    describedBy={qrHintId}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-ar-subtle pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[15px] font-semibold text-ar-ink">{t('printer.preview')}</span>
            {rows.length > 1 && (
              <select
                aria-label={t('printer.previewOutlet')}
                value={previewRow?.id ?? ''}
                onChange={(e) => setPreviewId(Number(e.target.value))}
                className={`${inputClass} h-9 w-auto py-0 text-sm`}
              >
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {previewBank.kind === 'noAccount' && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ar-line bg-ar-surface-muted px-3.5 py-2.5 text-sm text-ar-ink-2">
              <span>{t('printer.bankQrNoAccount')}</span>
              {bankLink?.kind === 'tab' ? (
                <button type="button" onClick={bankLink.open} className={smallBtn}>
                  {t('printer.bankQrAddAccount')}
                </button>
              ) : bankLink?.kind === 'page' && previewRow ? (
                <Link href={`/outlets/${previewRow.id}/bank-accounts`} className={smallBtn}>
                  {t('printer.bankQrAddAccount')}
                </Link>
              ) : null}
            </div>
          )}
          <BillPreview outlet={previewOutlet} width={settings.billWidth} bank={previewBank.kind === 'show' ? previewBank.block : null} />
          <p className="m-0 text-xs text-ar-muted">{t('printer.sample')}</p>
        </div>
      </SectionCard>

      <SectionCard title={t('printer.labelSection')} action={testBtn(labelTest.start, labelTest.printing)}>
        <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('printer.labelHint')}</p>
        <div role="radiogroup" aria-label={t('printer.labelTitle')} className="grid gap-2 sm:grid-cols-2">
          {labels.map((o) => (
            <label key={o.value} className={option(settings.label === o.value)}>
              <input
                type="radio"
                name="label-size"
                checked={settings.label === o.value}
                onChange={() => saveSettings({ ...settings, label: o.value })}
                className="h-4 w-4 accent-ar-primary"
              />
              <span className="flex-1">{o.label}</span>
              {o.value === '2x35x22' && <span className="text-sm font-normal text-ar-muted">{t('printer.twoUp')}</span>}
            </label>
          ))}
        </div>
        {settings.label === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            {(['w', 'h'] as const).map((key) => (
              <Field key={key} label={t(key === 'w' ? 'printer.width' : 'printer.height')}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={key === 'w' ? LABEL_W.min : LABEL_H.min}
                  max={key === 'w' ? LABEL_W.max : LABEL_H.max}
                  value={draft[key]}
                  onChange={(e) => typeSize(key, e.target.value)}
                  onBlur={() => commitSize(key)}
                  className={inputClass}
                />
              </Field>
            ))}
            <p className="col-span-2 m-0 text-xs text-ar-muted">{t('printer.range')}</p>
          </div>
        )}
        <div className="flex flex-col gap-2 border-t border-ar-subtle pt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-semibold text-ar-ink">{t('printer.preview')}</span>
            <span className="text-sm tabular-nums text-ar-muted">{t('printer.page', { w: layout.pageW, h: layout.pageH })}</span>
          </div>
          <LabelPreview layout={layout} />
          <p className="m-0 text-xs text-ar-muted">{t('printer.labelTip')}</p>
        </div>
      </SectionCard>

      <BillTestPrint outlet={previewOutlet} open={billTest} onClose={() => setBillTest(false)} />
      {labelTest.node}
    </>
  );
}

function PrinterIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
      <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
    </svg>
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
        <h2 className="m-0 text-lg font-bold">{t('nav.profile')}</h2>
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

/** Giao diện (#539): Sáng / Tối / Theo hệ thống, same as the top-bar switch, saved on this device. */
export function AppearanceSection({ t }: { t: T }) {
  const { choice, theme, setChoice } = useTheme();
  const options: Array<{ value: ThemeChoice; label: string }> = [
    { value: 'light', label: t('appearance.light') },
    { value: 'dark', label: t('appearance.dark') },
    { value: 'system', label: t('appearance.system') },
  ];
  return (
    <SectionCard title={t('appearance.title')}>
      <p className="-mt-2 mb-0 text-sm text-ar-muted">{t('appearance.hint')}</p>
      <div role="radiogroup" aria-label={t('appearance.title')} className="flex flex-col gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 text-[15px] ${
              choice === o.value ? 'border-ar-primary bg-ar-primary-soft font-semibold text-ar-primary-ink' : 'border-ar-line text-ar-ink hover:bg-ar-subtle'
            }`}
          >
            <input type="radio" name="appearance" value={o.value} checked={choice === o.value} onChange={() => setChoice(o.value)} className="h-4 w-4 accent-ar-primary" />
            <span className="flex-1">{o.label}</span>
            {o.value === 'system' && choice === 'system' && (
              <span className="text-sm font-normal text-ar-muted">{t('appearance.current', { theme: t(`appearance.${theme}`) })}</span>
            )}
          </label>
        ))}
      </div>
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

/**
 * #1314 "Cho tạo đơn khi trùng lịch" (owner only): one switch, saved on tap, same setting as the phone's.
 * Same card style as "Nhận đặt online".
 */
export function OverlapSection({ t, allowed, onChanged }: { t: T; allowed: boolean; onChanged?: () => void }) {
  const ts = useTranslations('settings');
  const { toastSuccess, toastError } = useToast();
  const [on, setOn] = useState(allowed);
  const [saving, setSaving] = useState(false);
  useEffect(() => setOn(allowed), [allowed]);
  const titleId = useId();
  const hintId = useId();
  const toggle = async (next: boolean) => {
    setOn(next);
    setSaving(true);
    try {
      const res = await bookingRequestsApi.setAllowOverlappingOrders(next);
      if (!res.success) throw new Error(res.error || '');
      toastSuccess(ts('messages.successTitle'), t('overlap.title'));
      onChanged?.();
    } catch (error) {
      setOn(!next);
      toastError(ts('messages.errorTitle'), error instanceof Error && error.message ? error.message : t('overlap.title'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className={`${cardClass} px-5 py-4`} data-overlap-setting>
      <div className="flex min-h-[44px] items-start justify-between gap-3">
        <span className="flex flex-col gap-1">
          <h2 id={titleId} className="m-0 text-lg font-bold">
            {t('overlap.title')}
          </h2>
          <span id={hintId} className="text-sm text-ar-muted">
            {t('overlap.hint')}
          </span>
        </span>
        <Switch checked={on} onChange={toggle} disabled={saving} labelledBy={titleId} describedBy={hintId} />
      </div>
    </section>
  );
}

/**
 * #1189 "Giá theo khối ngày › Với app cũ" (owner only): what the server does with a day-block line sent by an app
 * that does not know it. Two radio rows; the default (recompute) never stops a shop selling.
 */
export function BlockOldAppsSection({
  t,
  value,
  canEdit,
  onChanged,
}: {
  t: T;
  value: 'recompute' | 'block';
  canEdit: boolean;
  onChanged?: () => void;
}) {
  const ts = useTranslations('settings');
  const { toastSuccess, toastError } = useToast();
  const [mode, setMode] = useState(value);
  const [saving, setSaving] = useState(false);
  const name = useId();
  useEffect(() => setMode(value), [value]);
  const choose = async (next: 'recompute' | 'block') => {
    if (!canEdit || saving || next === mode) return;
    const before = mode;
    setMode(next);
    setSaving(true);
    try {
      const res = await bookingRequestsApi.setBlockPricingOldApps(next);
      if (!res.success) throw new Error(res.error || '');
      toastSuccess(ts('messages.successTitle'), t('blockPricing.title'));
      onChanged?.();
    } catch (error) {
      setMode(before);
      toastError(ts('messages.errorTitle'), error instanceof Error && error.message ? error.message : t('blockPricing.title'));
    } finally {
      setSaving(false);
    }
  };
  const rows: Array<{ key: 'recompute' | 'block'; title: string; hint: string }> = [
    { key: 'recompute', title: t('blockPricing.recompute'), hint: t('blockPricing.recomputeHint') },
    { key: 'block', title: t('blockPricing.block'), hint: t('blockPricing.blockHint') },
  ];
  return (
    <section className={`${cardClass} flex flex-col gap-3 px-5 py-4`} data-block-old-apps-setting>
      <h2 className="m-0 text-lg font-bold">{t('blockPricing.title')}</h2>
      <p className="m-0 text-sm text-ar-muted">{t('blockPricing.hint')}</p>
      <div role="radiogroup" aria-label={t('blockPricing.title')} className="overflow-hidden rounded-xl border border-ar-line">
        {rows.map((r) => (
          <label key={r.key} className="flex min-h-[56px] cursor-pointer items-center gap-3 border-t border-ar-subtle px-4 py-2 first:border-t-0">
            <input type="radio" name={name} checked={mode === r.key} disabled={!canEdit || saving} onChange={() => void choose(r.key)} className="h-5 w-5 flex-none" />
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold text-ar-ink">{r.title}</span>
              <span className="text-xs text-ar-muted">{r.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
